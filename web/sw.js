// Bump the version whenever a shipped asset changes. Cache is scoped to this app.
const PREFIX=`himohodoki:${self.registration.scope}:`;
const CACHE=`${PREFIX}v1`;
const ASSETS=['./','./index.html','./styles.css','./manifest.webmanifest','./icons/icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./src/app.js','./src/engine.js','./src/levels.js','./src/storage.js','./src/records.js','./src/music.js','./src/hint-worker.js','./src/controller-input.js','./src/serial-controller.js','./src/controller-ui.js','./controller-firmware/boot.py','./controller-firmware/code.py','./controller-firmware/README.txt','./audio/bgm_home.mp3','./audio/bgm_stage.mp3'];
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
    if(match)return event.request.headers?.has('Range')?audioRange(match,event.request.headers.get('Range')):match;
    if(event.request.mode==='navigate')return (await cache.match(local('./index.html'))) || fetch(event.request);
    return fetch(event.request);
  }));
});
// Media elements request byte ranges even when the whole MP3 is cached offline.
async function audioRange(response,range){
  const parts=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!parts||(!parts[1]&&!parts[2]))return response;
  const bytes=await response.arrayBuffer(),size=bytes.byteLength;
  const start=parts[1]?Number(parts[1]):Math.max(0,size-Number(parts[2]));
  const end=parts[1]&&parts[2]?Math.min(Number(parts[2]),size-1):size-1;
  if(start>=size||start>end)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  const headers=new Headers(response.headers);
  headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
