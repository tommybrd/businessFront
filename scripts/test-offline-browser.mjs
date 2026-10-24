import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqliteBinding} from './local-save-db.mjs';
import worker from '../dist/server/index.js';
import {createStarterGame} from '../dist/engine.js';
import {makeSave} from '../dist/save-format.js';
const {chromium,webkit}=await import(process.argv[2]);
const db=new DatabaseSync(':memory:');db.exec(await readFile('drizzle/0000_loud_thunderbolt_ross.sql','utf8'));let disconnected=false,user='warehouse-preview';
const server=createServer(async(req,res)=>{try{if(req.url.startsWith('/__qa_offline')){disconnected=new URL(req.url,'http://qa.test').searchParams.get('enabled')==='1';res.end('OK');return;}if(disconnected){req.socket.destroy();return;}const chunks=[];for await(const chunk of req)chunks.push(chunk);const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);headers.set('oai-authenticated-user-id',user);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,{DB:sqliteBinding(db)});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(error){console.error(error.message);res.writeHead(500).end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}/`;
try{
 assert.equal((await fetch(url)).status,200);
 for(const [name,engine,options]of [['Chromium',chromium,{channel:'chrome'}],['WebKit',webkit,{}]]){
  user='warehouse-'+name.toLowerCase();const old=makeSave(createStarterGame());
  const seed=await worker.fetch(new Request(new URL('/api/save',url),{method:'PUT',headers:{'oai-authenticated-user-id':user,Origin:new URL(url).origin,'Content-Type':'application/json','X-Market-Front-Save':'1'},body:JSON.stringify({revision:0,ownerId:user,snapshot:old})}),{DB:sqliteBinding(db)});assert.equal(seed.status,200);
  const profile=await mkdtemp(join(tmpdir(),'flux-offline-')),launch=()=>engine.launchPersistentContext(profile,{headless:true,...options,viewport:{width:1280,height:850},hasTouch:true,isMobile:true});let context=await launch();const errors=[];
  const setOffline=async value=>{if(name==='WebKit')await fetch(new URL('/__qa_offline?enabled='+(value?'1':'0'),url));else await context.setOffline(value);};
  try{
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);try{await page.locator('#save-dialog').waitFor({state:'hidden'});}catch(error){console.error(name,await page.locator('#save-status').textContent(),errors);throw error;}
   await page.locator('[data-speed="0"]').click();await page.waitForFunction(()=>document.querySelector('#offline-status').textContent==='Jeu disponible hors ligne');
   assert.equal(await page.locator('h1').textContent(),'FLUX0.14');await page.locator('.world-tools [data-open="stock"]').click();
   const product=page.locator('[data-product-id="tech"]');await product.locator('[data-quantity="24"]').click();const before=await page.locator('#money').textContent();await product.locator('[data-buy="express"]').click();await page.waitForFunction(value=>document.querySelector('#money').textContent!==value,before);
   await page.locator('.world-tools [data-open="robots"]').click();await page.locator('[data-robots="1"]').click();await page.locator('#panel-close').click();
   await page.locator('[data-speed="6"]').click();await page.waitForFunction(()=>Number(document.querySelector('#delivered-count').textContent)>0,{timeout:45000});await page.locator('[data-speed="0"]').click();
   await page.locator('.world-tools [data-open="orders"]').click();await page.locator('[data-filter="all"]').click();await page.locator('[data-order-id]').first().waitFor();assert.ok(await page.locator('[data-order-id]').count()>0);await page.locator('#panel-close').click();
   await page.locator('.world-tools [data-open="finance"]').click();assert.equal(await page.locator('#management-panel').evaluate(e=>e.classList.contains('wide')),true);await page.locator('#panel-close').click();
   await page.locator('#save-toggle').click();await page.locator('#save-now').click();await page.waitForFunction(()=>document.querySelector('#save-toggle').title==='Sauvegardé');
   const cloud=await page.evaluate(async()=>await(await fetch('/api/save')).json());assert.equal(cloud.snapshot.schemaVersion,2);assert.equal(cloud.snapshot.state.kind,'fulfillment');assert.equal(cloud.snapshot.state.legacyArchive.schemaVersion,1);assert.equal(cloud.snapshot.state.robotTarget,1);
   await page.locator('#save-flight').click();await page.waitForFunction(()=>document.querySelector('#save-flight').textContent==='Revenir en ligne');assert.match(await page.locator('#offline-status').textContent(),/Prêt pour l’avion/);await page.locator('#save-return').click();
   const balance=await page.locator('#money').textContent(),delivered=await page.locator('#delivered-count').textContent();
   if(name==='Chromium'&&process.argv[3]){await mkdir(process.argv[3],{recursive:true});await page.screenshot({path:join(process.argv[3],'flux-centre-logistique.png')});}
   await setOffline(true);await context.close();context=await launch();if(name==='Chromium')await context.setOffline(true);
   const reopened=await context.newPage();reopened.on('pageerror',e=>errors.push(e.message));await reopened.goto(url);await reopened.locator('#save-dialog').waitFor({state:'hidden'});await reopened.locator('[data-speed="0"]').click();assert.equal(await reopened.locator('#money').textContent(),balance);assert.equal(await reopened.locator('#delivered-count').textContent(),delivered);
   await reopened.locator('#save-toggle').click();assert.equal(await reopened.locator('#save-flight').textContent(),'Revenir en ligne');await reopened.locator('#save-return').click();
   await reopened.locator('.world-tools [data-open="team"]').click();await reopened.locator('[data-staff="picking"][data-count="3"]').click();await reopened.locator('#panel-close').click();
   await reopened.locator('#save-toggle').click();await setOffline(false);await reopened.locator('#save-flight').click();await reopened.waitForFunction(()=>document.querySelector('#save-toggle').title==='Sauvegardé');
   const synced=await reopened.evaluate(async()=>await(await fetch('/api/save')).json());assert.equal(synced.snapshot.state.staff.picking,3);assert.equal(synced.snapshot.state.robotTarget,1);assert.deepEqual(synced.snapshot.state.legacyArchive,old);
   const cached=await reopened.evaluate(async()=>{const keys=await caches.keys();const cache=await caches.open(keys.find(k=>k.startsWith('market-front-assets-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});assert.equal(cached.includes('/api/save'),false);assert.ok(cached.includes('/warehouse-engine.js'));assert.ok(cached.includes('/warehouse-scene.js'));
   await reopened.locator('#save-return').click();await reopened.setViewportSize({width:390,height:844});for(const selector of ['.brand','.clock','.speeds','#dispatch-now']){const bounds=await reopened.locator(selector).boundingBox();if(bounds)assert.ok(bounds.x>=0&&bounds.x+bounds.width<=390,selector+' dépasse du téléphone');}await reopened.locator('.world-tools [data-open="stock"]').scrollIntoViewIfNeeded();await reopened.locator('.world-tools [data-open="stock"]').click();assert.ok(await reopened.locator('[data-product-id="books"]').count());assert.ok(await reopened.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(name==='Chromium'&&process.argv[3])await reopened.screenshot({path:join(process.argv[3],'flux-mobile.png')});
   assert.deepEqual(errors,[]);console.log(`${name}: conversion v1→v2, achats, robots, livraisons, finances, mode avion après fermeture complète, synchronisation et vue mobile vérifiés.`);
  }finally{await setOffline(false);await context.close();await rm(profile,{recursive:true,force:true});}
 }
}finally{await new Promise(resolve=>server.close(resolve));db.close();}
