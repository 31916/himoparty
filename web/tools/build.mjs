import {mkdir,rm,cp,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'dist');
if(dirname(output)!==resolve(root)||!output.endsWith('dist'))throw new Error('Unsafe build output path');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
const assets=['index.html','styles.css','manifest.webmanifest','src/app.js','src/engine.js','src/levels.js','src/storage.js','src/records.js','src/music.js','src/hint-worker.js','src/controller-input.js','src/serial-controller.js','src/controller-ui.js','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','controller-firmware/boot.py','controller-firmware/code.py','controller-firmware/README.txt','audio/bgm_home.mp3','audio/bgm_stage.mp3'];
const hash=createHash('sha256');
for(const asset of assets){
  const input=resolve(root,asset.startsWith('controller-firmware/')?asset.replace('controller-firmware/','../raspberry_pi/usb/'):asset.startsWith('audio/')?asset.replace('audio/','../game/data/'):asset);
  hash.update(asset);hash.update(await readFile(input));await mkdir(dirname(resolve(output,asset)),{recursive:true});await cp(input,resolve(output,asset));
}
const source=await readFile(resolve(root,'sw.js'),'utf8');hash.update(source);
const version=hash.digest('hex').slice(0,12);
await writeFile(resolve(output,'sw.js'),source.replace('${PREFIX}v1', '${PREFIX}'+version));
console.log(`Built ${assets.length+1} files in ${output} (cache ${version})`);
