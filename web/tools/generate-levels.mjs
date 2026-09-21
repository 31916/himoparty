import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {solve,settle,validBoard,stateKey} from '../src/engine.js';

let seed=0x3191626;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const titles=['はじめの一歩','ひとつずつ','ちょっと寄り道','くるりと回って','ひらめきの芽','三色の出会い','ほどける予感','向こう側へ','小さな工夫','ひとやすみの前に','重なる色','空きをさがして','ゆっくり考えて','道をゆずって','ひらける景色','じっくり挑戦','結び目のむこう','あと一歩ずつ','ひらめきをつないで','おおきな達成'];
const levels=[], seen=new Set();
for(let id=1;id<=20;id++){
  if(id===1){
    const ropes=[[0,5],[1,8]];
    levels.push({id,title:titles[0],group:'はじめて',cols:3,rows:3,ropes,solution:solve(ropes,3,3)});
    seen.add(stateKey(ropes));continue;
  }
  const cols=id<=4?3:id<=10?4:5, rows=id<=10?3:4;
  const count=id<=4?2:id<=8?3:id<=12?4:id<=16?5:6;
  for(let attempt=0;attempt<10000;attempt++){
    const cells=Array.from({length:cols*rows},(_,i)=>i);
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    const ropes=Array.from({length:count},(_,i)=>[cells[2*i],cells[2*i+1]]);
    if(!validBoard(ropes,cols,rows)||settle(ropes,cols).some(r=>!r))continue;
    const key=stateKey(ropes);if(seen.has(key))continue;
    const solution=solve(ropes,cols,rows,5000);
    const min=id<=2?1:id<=4?2:id<=8?3:id<=12?4:id<=16?6:8;
    if(!solution||solution.length<min||solution.length>min+5)continue;
    levels.push({id,title:titles[id-1],group:id<=5?'はじめて':id<=10?'なれてきた':id<=15?'ひと工夫':'じっくり',cols,rows,ropes,solution});seen.add(key);break;
  }
  if(levels.length!==id)throw new Error(`Could not generate level ${id}`);
}
writeFileSync(fileURLToPath(new URL('../src/levels.js',import.meta.url)),`// Deterministic boards with replay-verified solution paths.\nexport const levels = ${JSON.stringify(levels,null,2)};\n`);
console.log(levels.map(l=>`${l.id}: ${l.ropes.length} ropes, ${l.solution.length} solution moves`).join('\n'));
