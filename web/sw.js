// Bump the version whenever a shipped asset changes. Cache is scoped to this app.
const PREFIX=`himohodoki:${self.registration.scope}:`;
const CACHE=`${PREFIX}v1`;
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./src/app.js','./src/engine.js','./src/levels.js','./src/storage.js','./src/hint-worker.js'];
const local=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(local))));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(PREFIX)&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    // All app files belong to the same precached version, including navigation.
    const match=await cache.match(event.request,{ignoreSearch:true});
    if(match)return match;
    if(event.request.mode==='navigate')return (await cache.match(local('./index.html'))) || fetch(event.request);
    return fetch(event.request);
  }));
});
