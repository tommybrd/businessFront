import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const origin='https://market.test',assetPaths=['/index.html','/game.js'];
function fixture(fetcher){
 const buckets=new Map(),handlers=new Map(),messages=[];
 const key=r=>new URL(r instanceof URL?r.href:typeof r==='string'?r:r.url,origin).href;
 const caches={async open(name){if(!buckets.has(name))buckets.set(name,new Map());const bucket=buckets.get(name);return {async put(r,response){bucket.set(key(r),response.clone());},async match(r){return bucket.get(key(r))?.clone();},async delete(r){return bucket.delete(key(r));},async keys(){return [...bucket.keys()].map(url=>new Request(url));}};},async keys(){return [...buckets.keys()];},async delete(name){return buckets.delete(name);}};
 const self={location:{origin},addEventListener:(name,handler)=>handlers.set(name,handler),clients:{claim:async()=>{},matchAll:async()=>[{postMessage:x=>messages.push(x)}]}};
 const source=readFileSync('worker/offline-sw.js','utf8').replace('__MARKET_FRONT_VERSION__','test-build').replace('__MARKET_FRONT_OFFLINE_ASSETS__',JSON.stringify(assetPaths));
 vm.runInNewContext(source,{self,caches,fetch:fetcher,Request,Response,URL,Set,Promise,Error});
 return {buckets,messages,async message(data){let wait,result;handlers.get('message')({data,ports:[{postMessage:r=>{result=r;}}],waitUntil:p=>{wait=p;}});await wait;return result;},async lifecycle(name){let wait;handlers.get(name)({waitUntil:p=>{wait=p;}});return wait;},fetch(path,options={}){let result;handlers.get('fetch')({request:{method:options.method||'GET',mode:options.mode||'navigate',url:origin+path},respondWith:p=>{result=p;}});return result;}};
}
const asset=path=>new Response('original '+path,{headers:{'X-Market-Front-Asset':'1','X-Market-Front-Version':'test-build'}});
test('offline cache only installs a complete authenticated build, never a login page or mismatched version',async()=>{
 for(const bad of [()=>new Response('Login',{headers:{'Content-Type':'text/html'}}),()=>new Response('wrong build',{headers:{'X-Market-Front-Asset':'1','X-Market-Front-Version':'different'}}),()=>new Response('failed',{status:503})]){
  const f=fixture(r=>new URL(r.url).pathname==='/game.js'?bad():asset('/index.html'));await assert.rejects(f.lifecycle('install'));assert.equal(f.buckets.size,0);
 }
});
test('network loss serves the installed shell and modules but leaves APIs and writes on the network',async()=>{
 let offline=false;const f=fixture(r=>{if(offline)throw new TypeError('network');return asset(new URL(r.url).pathname);});await f.lifecycle('install');offline=true;
 assert.equal(await(await f.fetch('/')).text(),'original /index.html');assert.equal(await(await f.fetch('/game.js',{mode:'cors'})).text(),'original /game.js');
 assert.equal(f.fetch('/api/save'),undefined);assert.equal(f.fetch('/game.js',{method:'PUT'}),undefined);assert.equal(f.fetch('/unrelated'),undefined);
});
test('new deployment keeps the active shell paired with its own cached modules',async()=>{
 let upgrade=false;const f=fixture(r=>upgrade?new Response('new version',{headers:{'X-Market-Front-Asset':'1','X-Market-Front-Version':'new'}}):asset(new URL(r.url).pathname));await f.lifecycle('install');upgrade=true;
 assert.equal(await(await f.fetch('/')).text(),'original /index.html');assert.equal(await(await f.fetch('/game.js',{mode:'cors'})).text(),'original /game.js');
});
test('authentication refusal is returned as-is and clears the offline shell instead of replaying it',async()=>{
 let refused=false;const f=fixture(r=>refused?new Response('Login',{status:401}):asset(new URL(r.url).pathname));await f.lifecycle('install');refused=true;
 assert.equal((await f.fetch('/')).status,401);assert.equal(f.buckets.has('market-front-assets-test-build'),false);assert.equal(f.messages[0].type,'AUTH_REQUIRED');
});

test('flight preparation checks every required asset and stays local despite a captive Wi-Fi login page',async()=>{
 let requests=0,login=false;const f=fixture(r=>{requests++;return login?new Response('Wi-Fi login',{status:401}):asset(new URL(r.url).pathname);});await f.lifecycle('install');
 assert.equal((await f.message({type:'SET_FLIGHT_MODE',enabled:true})).flightMode,true);login=true;
 const before=requests;assert.equal(await(await f.fetch('/')).text(),'original /index.html');assert.equal(requests,before);assert.equal(f.messages.length,0);
 assert.equal((await f.message({type:'OFFLINE_STATUS'})).flightMode,true);
 assert.equal((await f.message({type:'SET_FLIGHT_MODE',enabled:false})).flightMode,false);assert.equal((await f.fetch('/')).status,401);
});
test('missing or mismatched cached assets prevent a successful flight preparation',async()=>{
 const f=fixture(r=>asset(new URL(r.url).pathname));await f.lifecycle('install');
 const bucket=f.buckets.get('market-front-assets-test-build');bucket.delete(origin+'/game.js');
 const result=await f.message({type:'SET_FLIGHT_MODE',enabled:true});assert.equal(result.ready,false);assert.match(result.error,/incomplet/);
 assert.equal((await f.message({type:'OFFLINE_STATUS'})).flightMode,false);
 // A wrong resource count can no longer masquerade as a complete downloaded game.
 bucket.set(origin+'/unrelated',asset('/unrelated'));assert.equal((await f.message({type:'OFFLINE_STATUS'})).ready,false);
});
