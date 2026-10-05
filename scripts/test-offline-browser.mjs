import assert from 'node:assert/strict';
const {chromium,webkit}=await import(process.argv[2]);
const {createServer}=await import('node:http');
const {DatabaseSync}=await import('node:sqlite');
const {readFile}=await import('node:fs/promises');
const {sqliteBinding}=await import('./local-save-db.mjs');
const {default:worker}=await import('../dist/server/index.js');
const db=new DatabaseSync(':memory:');db.exec(await readFile('drizzle/0000_loud_thunderbolt_ross.sql','utf8'));
let disconnected=false;
const server=createServer(async(req,res)=>{
 try{
  if(req.url.startsWith('/__qa_offline')){disconnected=new URL(req.url,'http://qa.test').searchParams.get('enabled')==='1';res.end('OK');return;}
  if(disconnected){req.socket.destroy();return;}
  const chunks=[];for await(const chunk of req)chunks.push(chunk);
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(typeof value==='string')headers.set(key,value);headers.set('oai-authenticated-user-id','offline-browser-only');
  const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});
  const response=await worker.fetch(request,{DB:sqliteBinding(db)});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}/`;
try{
const response=await fetch(url);assert.equal(response.status,200);
for(const [name,engine,options]of [['Chromium',chromium,{channel:'chrome'}],['WebKit',webkit,{}]]){
 const browser=await engine.launch({headless:true,...options});
 const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,isMobile:true});
 const errors=[];
 const setOffline=async value=>{// WebKit offline emulation has an upstream navigation bug (#42775). Disconnect the real test server instead.
 if(name==='WebKit'){await fetch(new URL('/__qa_offline?enabled='+(value?'1':'0'),url));}else await context.setOffline(value);};
 try{
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('#save-dialog').waitFor({state:'hidden'});
  await page.locator('[data-speed="0"]').click();
  await page.waitForFunction(()=>document.querySelector('#offline-status').textContent==='Jeu disponible hors ligne');
  assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller));
  await page.locator('.world-tools [data-open="rayons"]').first().click();
  const add=page.locator('[data-install-kind="shelves"][data-install-product="produce"][data-install-count="2"]');
  await add.waitFor();const before=await page.locator('#money').textContent();
  await setOffline(true);await add.click();
  const after=await page.locator('#money').textContent();assert.notEqual(before,after);
  await page.locator('#save-toggle').click();await page.waitForFunction(()=>/locale effectuée|cet appareil/.test(document.querySelector('#save-status').textContent));assert.match(await page.locator('#save-status').textContent(),/locale effectuée|cet appareil/);
  await page.close();
  const reopened=await context.newPage();reopened.on('pageerror',e=>errors.push(e.message));
  await reopened.goto(url);await reopened.locator('#save-dialog').waitFor({state:'hidden'});await reopened.locator('[data-speed="0"]').click();
  assert.equal(await reopened.locator('#money').textContent(),after);
  await reopened.locator('.world-tools [data-open="rayons"]').first().click();
  assert.match(await reopened.locator('[data-shelf-product="produce"] .stock-level').textContent(),/400/);
  await reopened.locator('#save-toggle').click();assert.match(await reopened.locator('#save-status').textContent(),/locale effectuée|cet appareil/);
  await setOffline(false);
  await reopened.waitForFunction(()=>document.querySelector('#save-toggle').title==='Sauvegardé');
  const cloud=await reopened.evaluate(async()=>await(await fetch('/api/save')).json());assert.equal(cloud.snapshot.state.products[0].capacity,400);
  const cached=await reopened.evaluate(async()=>{const names=await caches.keys();const cache=await caches.open(names.find(n=>n.startsWith('market-front-assets-')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
  assert.equal(cached.includes('/api/save'),false);assert.ok(cached.includes('/vendor/three.core.js'));assert.ok(cached.includes('/icon-180.png'));
  await setOffline(true);
  await reopened.reload();await reopened.locator('#save-dialog').waitFor({state:'hidden'});await reopened.locator('[data-speed="0"]').click();assert.equal(await reopened.locator('#money').textContent(),after);
  await setOffline(false);
  await reopened.waitForFunction(()=>document.querySelector('#save-toggle').title==='Sauvegardé');
  await reopened.locator('#save-toggle').click();await reopened.locator('#save-new').click();await reopened.locator('#save-confirm-new').click();await reopened.locator('#save-dialog').waitFor({state:'hidden'});
  await reopened.locator('[data-speed="0"]').click();
  assert.deepEqual(errors,[]);
  console.log(`${name}: téléchargement, fermeture et reprise hors ligne, changement de rayon, synchronisation et rechargement vérifiés.`);
 }finally{await setOffline(false);await context.close();await browser.close();}
}

}finally{await new Promise(resolve=>server.close(resolve));db.close();}
