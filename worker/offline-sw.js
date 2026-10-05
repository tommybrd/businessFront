/* Generated with the exact game build; API responses are never cached. */
const VERSION='__MARKET_FRONT_VERSION__';
const ASSETS=__MARKET_FRONT_OFFLINE_ASSETS__;
const CACHE=`market-front-assets-${VERSION}`;
const origin=self.location.origin;
const paths=new Set(ASSETS);
const valid=(response)=>response.ok&&!response.redirected&&response.headers.get('X-Market-Front-Asset')==='1'&&response.headers.get('X-Market-Front-Version')===VERSION;
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const resources=await Promise.all(ASSETS.map(async path=>{
    const response=await fetch(new Request(new URL(path,origin),{credentials:'same-origin',cache:'reload'}));
    if(!valid(response))throw Error('Téléchargement incomplet ou connexion requise.');
    return [path,response];
  }));
  const cache=await caches.open(CACHE);
  try{await Promise.all(resources.map(([path,response])=>cache.put(new URL(path,origin),response)));}catch(error){await caches.delete(CACHE);throw error;}
  // Updates wait for the previous game windows to close, avoiding mixed builds.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const name of await caches.keys())if(name.startsWith('market-front-assets-')&&name!==CACHE)await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const complete=(await cache.keys()).length===ASSETS.length;event.ports[0]?.postMessage({ready:complete,version:VERSION});})());
});
async function requireAuth(){
  await caches.delete(CACHE);
  for(const client of await self.clients.matchAll())client.postMessage({type:'AUTH_REQUIRED'});
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==origin||url.pathname.startsWith('/api/'))return;
  const navigation=request.mode==='navigate'&&(url.pathname==='/'||url.pathname==='/index.html');
  if(!navigation&&!paths.has(url.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    if(navigation){
      try{
        const response=await fetch(request);
        if(response.status===401||response.status===403||response.redirected){await requireAuth();return response;}
        if(response.ok){
          // Keep the active shell paired with its precached modules until the new worker activates.
          if(response.headers.get('X-Market-Front-Asset')==='1')return await cache.match(new URL('/index.html',origin))||response;
          return response;
        }
        if(response.status<500)return response;
      }catch{}
      return await cache.match(new URL('/index.html',origin))||new Response('Ouvrez le jeu avec Internet une première fois.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
    const stored=await cache.match(new URL(url.pathname,origin));
    if(stored)return stored;
    const response=await fetch(request);if(valid(response))await cache.put(new URL(url.pathname,origin),response.clone());return response;
  })());
});
