import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createGame, advance, openStore, placeOrder, setInstallation, setStaff, queueEveningOrder } from '../dist/engine.js';
import { createOnlineOrder } from '../dist/online-orders.js';
import { makeSave, readSave, validateSave } from '../dist/save-format.js';
import { createSaveManager } from '../dist/save-manager.js';
import { sqliteBinding } from '../scripts/local-save-db.mjs';
import worker, { saveApi } from '../worker/index.js';
function backend() {
  const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_loud_thunderbolt_ross.sql',import.meta.url),'utf8'));
  return {DB:sqliteBinding(sqlite)};
}
function req(method='GET',body,user='alice',path='/api/save',extra={}) {
  return new Request(`https://market-front.example${path}`,{method,headers:{...(user?{'oai-authenticated-user-id':user}:{}),Origin:'https://market-front.example','Content-Type':'application/json','X-Market-Front-Save':'1',...extra},...(body?{body:JSON.stringify(body)}:{})});
}
function storage() {const data=new Map();return {getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};}
function gameClient(env,{owner='alice',store=storage(),notify=()=>{},fetcher}={}) {
  let state=createGame(),applied=0;
  const manager=createSaveManager({snapshot:()=>makeSave(state),apply:r=>{state=r.state;applied++;},storage:store,notify,fetcher:fetcher||((path,options)=>saveApi(req(options.method,options.body?JSON.parse(options.body):null,owner,path),env))});
  return {manager,get state(){return state;},get applied(){return applied;}};
}

test('the entire busy simulation survives serialization and continues identically, always paused',()=>{
 const s=createGame(897);s.money=90000;setInstallation(s,'drive',1);setInstallation(s,'web',1);setStaff(s,'online',2);
 placeOrder(s,'grocery',240,'express');queueEveningOrder(s,'home',48);openStore(s);advance(s,50);
 createOnlineOrder(s,'drive',[{productId:'produce',quantity:3}]);createOnlineOrder(s,'web',[{productId:'grocery',quantity:4}]);advance(s,7);
 const snapshot=makeSave(s,{checkoutSound:false}),restored=readSave(JSON.stringify(snapshot));
 assert.equal(restored.state.speed,0);assert.equal(restored.preferences.checkoutSound,false);
 const original=structuredClone(s);original.speed=0;assert.deepEqual(restored.state,original);
 advance(original,100);advance(restored.state,100);assert.deepEqual(restored.state,original);
 assert.ok(s.customers.some(c=>c.motion));assert.ok(s.shipments.length);assert.ok(s.online.orders.length);
});
test('incomplete, nonfinite, dangling and incompatible saves are rejected',()=>{
 const base=makeSave(createGame());
 for(const alter of [s=>s.schemaVersion=99,s=>delete s.state.customers,s=>s.state.money=Infinity,s=>s.state.staff.shelves++,s=>s.state.products[0].reserve=-1,s=>s.state.shipments.push({pallets:[{orderId:9,palletIndex:0}]}),s=>s.state.customers.push({id:1,stage:'checkout',basket:[],items:[],value:0})]) {
  const s=structuredClone(base);alter(s);assert.throws(()=>validateSave(s));
 }
});
test('API requires identity and rejects untrusted writes, incompatible data and oversized requests',async()=>{
 const env=backend(),snapshot=makeSave(createGame());
 assert.equal((await saveApi(req('GET',null,null),env)).status,401);
 assert.equal((await saveApi(req(),{})).status,503);
 for(const headers of [{Origin:'https://elsewhere.example'},{'X-Market-Front-Save':'0'},{'Content-Type':'text/plain'}])assert.equal((await saveApi(req('PUT',{revision:0,snapshot},'alice','/api/save',headers),env)).status,403);
 assert.equal((await saveApi(req('PUT',{revision:-1,snapshot}),env)).status,422);
 assert.equal((await saveApi(req('PUT',{revision:0,snapshot:{} }),env)).status,422);
 assert.equal((await saveApi(req('PUT',{revision:0,snapshot},'alice','/api/save',{'Content-Length':'1000001'}),env)).status,413);
 const raw=new Request('https://market-front.example/api/save',{method:'PUT',headers:req('PUT').headers,body:' '.repeat(1000001)});assert.equal((await saveApi(raw,env)).status,413);
});
test('real SQL separates users, retains previous state and atomically rejects stale revisions',async()=>{
 const env=backend(),first=makeSave(createGame());
 let response=await saveApi(req('PUT',{revision:0,snapshot:first}),env);assert.equal(response.status,200);assert.equal((await response.json()).revision,1);
 const second=structuredClone(first);second.state.money=12345;
 response=await saveApi(req('PUT',{revision:1,snapshot:second}),env);assert.equal(response.status,200);
 assert.equal((await saveApi(req('PUT',{revision:1,snapshot:first}),env)).status,409);
 assert.equal((await saveApi(req('PUT',{revision:0,snapshot:first}),env)).status,409);
 const own=await(await saveApi(req(),env)).json();assert.equal(own.snapshot.state.money,12345);assert.equal(own.revision,2);assert.equal(own.hasPrevious,true);
 const previous=await(await saveApi(req('GET',null,'alice','/api/save?previous=1'),env)).json();assert.deepEqual(previous.snapshot,first);
 const other=await(await saveApi(req('GET',null,'bob'),env)).json();assert.equal(other.snapshot,null);assert.equal(other.revision,0);
});
test('storage failures produce recoverable responses without replacing the stored game',async()=>{
 const result=await worker.fetch(req(),{DB:{prepare(){throw Error('offline');}}});assert.equal(result.status,503);
});
test('autosave restores the last game in pause and does not rewrite unchanged snapshots',async()=>{
 const env=backend(),a=gameClient(env);assert.equal(await a.manager.load(),true);assert.equal(a.manager.revision,1);
 a.state.money=6000;a.manager.changed();assert.equal(await a.manager.flush(),true);assert.equal(a.manager.revision,2);
 await a.manager.flush();assert.equal(a.manager.revision,2);
 const b=gameClient(env);await b.manager.load();assert.equal(b.state.money,6000);assert.equal(b.state.speed,0);assert.equal(b.manager.revision,2);
});
test('previous-version restore and confirmed new game both preserve a recovery version',async()=>{
 const env=backend(),a=gameClient(env);await a.manager.load();a.state.money=6000;await a.manager.flush();
 await a.manager.newGame(makeSave(createGame(123)));assert.equal(a.state.money,8500);assert.equal(a.manager.hasPrevious,true);
 await a.manager.load(true);assert.equal(a.state.money,6000);assert.equal(a.manager.revision,4);
});
test('two windows cannot silently overwrite each other and reload clears a conflict',async()=>{
 const env=backend(),a=gameClient(env),b=gameClient(env);await a.manager.load();await b.manager.load();
 a.state.money=7000;await a.manager.flush();b.state.money=9000;assert.equal(await b.manager.flush(),false);assert.equal(b.manager.ready,false);
 assert.equal(await b.manager.newGame(makeSave(createGame())),false);await b.manager.load();assert.equal(b.manager.ready,true);assert.equal(b.state.money,7000);
});
test('network failure keeps the open game and pending draft, then retry saves it',async()=>{
 const env=backend(),store=storage();let offline=false;
 const a=gameClient(env,{store,fetcher:(path,options)=>{if(offline)throw Error('offline');return saveApi(req(options.method,options.body?JSON.parse(options.body):null,'alice',path),env);}});
 await a.manager.load();a.state.money=4321;a.manager.changed();offline=true;assert.equal(await a.manager.flush(),false);assert.equal(a.manager.ready,true);assert.equal(a.state.money,4321);
 const b=gameClient(env,{store});await b.manager.load();assert.equal(b.state.money,4321);
});
test('a draft belonging to another user never loads into this account',async()=>{
 const env=backend(),store=storage();const a=gameClient(env,{store});await a.manager.load();a.state.money=123;a.manager.changed();
 const b=gameClient(env,{owner:'bob',store});await b.manager.load();assert.equal(b.state.money,8500);
});
test('changes during an in-flight save are retained for the following save',async()=>{
 const env=backend();let release=null,wait=false;
 const a=gameClient(env,{fetcher:async(path,options)=>{if(wait&&options.method==='PUT')await new Promise(r=>{release=r;});return saveApi(req(options.method,options.body?JSON.parse(options.body):null,'alice',path),env);}});
 await a.manager.load();wait=true;a.state.money=7000;const saving=a.manager.flush();await Promise.resolve();a.state.money=6000;a.manager.changed();release();await saving;assert.equal(a.manager.dirty,true);
 wait=false;await a.manager.flush();const saved=await(await saveApi(req(),env)).json();assert.equal(saved.snapshot.state.money,6000);
});
test('loading errors do not start a new game or overwrite server state',async()=>{
 let puts=0;const a=gameClient(backend(),{fetcher:async(path,options)=>{if(options.method==='PUT')puts++;return Response.json({error:'offline'},{status:503});}});
 assert.equal(await a.manager.load(),false);assert.equal(a.manager.ready,false);assert.equal(await a.manager.flush(),false);assert.equal(puts,0);
});
