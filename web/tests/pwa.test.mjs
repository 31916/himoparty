import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('sw.js',root),'utf8');
function environment(){
  const handlers={},items=new Map(),deleted=[];
  const scope='https://example.test/puzzles/himo/';
  const cache={addAll:async urls=>{for(const url of urls)items.set(url,{url});},match:async request=>{const url=new URL(typeof request==='string'?request:request.url);url.search='';return items.get(url.href);}};
  const caches={open:async()=>cache,keys:async()=>[`himohodoki:${scope}:old`,'other-app-v1'],delete:async key=>deleted.push(key)};
  const self={registration:{scope},location:{origin:'https://example.test'},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(name,fn)=>handlers[name]=fn};
  vm.runInNewContext(source,{self,caches,URL,Response,Headers,fetch:async()=>{throw Error('offline');}});
  return {handlers,items,deleted,scope};
}
test('manifest is installable at a subdirectory and includes real PNGs',()=>{
  const m=JSON.parse(readFileSync(new URL('manifest.webmanifest',root)));
  assert.equal(m.start_url,'./');assert.equal(m.scope,'./');assert.equal(m.display,'standalone');
  for(const size of [192,512]){
    const icon=m.icons.find(i=>i.sizes===`${size}x${size}`&&i.purpose==='any');assert.ok(icon);
    const png=readFileSync(new URL(icon.src,root));assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);
  }
});
test('every precached file exists, offline navigation and worker modules work under subpaths',async()=>{
  const env=environment();let pending;
  env.handlers.install({waitUntil:p=>pending=p});await pending;
  for(const url of env.items.keys()){
    const path=url.slice(env.scope.length)||'index.html';
    const input=path.startsWith('controller-firmware/')?path.replace('controller-firmware/','../raspberry_pi/usb/'):path.startsWith('audio/')?path.replace('audio/','../game/data/'):path;
    assert.ok(existsSync(fileURLToPath(new URL(input,root))),path);
  }
  for(const path of ['?from=install','src/hint-worker.js','src/engine.js','icons/icon-512.png','src/controller-ui.js','src/serial-controller.js','src/controller-input.js','controller-firmware/boot.py','controller-firmware/code.py','controller-firmware/README.txt','some-navigation']){
    let response;env.handlers.fetch({request:{url:env.scope+path,method:'GET',mode:path.includes('.')?'cors':'navigate'},respondWith:p=>response=p});
    assert.ok(await response,path);
  }
  env.handlers.activate({waitUntil:p=>pending=p});await pending;
  assert.deepEqual(env.deleted,[`himohodoki:${env.scope}:old`]);
});
test('both original music files are cached and serve byte ranges without network',async()=>{
  const env=environment();let pending;
  env.handlers.install({waitUntil:p=>pending=p});await pending;
  for(const name of ['home','stage']){
    const url=env.scope+`audio/bgm_${name}.mp3`;
    assert.ok(env.items.has(url));
    const bytes=readFileSync(new URL(`../game/data/bgm_${name}.mp3`,root));
    for(const [range,start,end,status] of [['bytes=0-31',0,31,206],['bytes=30-',30,bytes.length-1,206],['bytes=-10',bytes.length-10,bytes.length-1,206],[`bytes=${bytes.length}-`,0,0,416]]){
      env.items.set(url,new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}}));
      let pendingResponse;env.handlers.fetch({request:{url,method:'GET',headers:new Headers({Range:range})},respondWith:p=>pendingResponse=p});
      const response=await pendingResponse;assert.equal(response.status,status);
      if(status===206){assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes.subarray(start,end+1));}
    }
  }
});
test('service worker ignores other apps and non-GET traffic',()=>{
  const env=environment();const respondWith=()=>assert.fail('intercepted unrelated traffic');
  env.handlers.fetch({request:{url:'https://example.test/other/',method:'GET'},respondWith});
  env.handlers.fetch({request:{url:env.scope,method:'POST'},respondWith});
});
