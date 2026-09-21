import {clone,move,solved} from './engine.js';
import {restoreRun} from './records.js';
export const STORAGE_KEY='himohodoki-v1';
export function restore(data, levels) {
  const safe=data && data.version===1 ? data : {};
  const level=levels.find(l=>l.id===safe.levelId)||levels[0];
  const completed=Array.isArray(safe.completed)?[...new Set(safe.completed.filter(id=>levels.some(l=>l.id===id)))]:[];
  let ropes=clone(level.ropes), actions=[], history=[];
  if(Array.isArray(safe.actions)&&safe.actions.length<=1000){
    for(const action of safe.actions){
      if(!action||solved(ropes)){actions=[];history=[];ropes=clone(level.ropes);break;}
      const next=move(ropes,action,level.cols,level.rows);
      if(!next){actions=[];history=[];ropes=clone(level.ropes);break;}
      history.push(clone(ropes));actions.push({...action});ropes=next;
    }
  }
  const records={};
  for(const id of completed){
    const record=safe.records?.[id];
    if(record&&Number.isFinite(record.ms)&&record.ms>=0&&Number.isInteger(record.moves)&&record.moves>0&&record.moves<=1000)records[id]={ms:record.ms,moves:record.moves};
  }
  const validActions=Array.isArray(safe.actions)&&actions.length===safe.actions.length;
  const run=restoreRun(validActions?safe.run:null,{hasMoves:actions.length>0,isClear:solved(ropes)});
  return {level,completed,ropes,actions,history,records,run,musicEnabled:safe.musicEnabled!==false,largeText:safe.largeText===true};
}
export function readStorage(storage) {
  try{return JSON.parse(storage.getItem(STORAGE_KEY));}catch{return null;}
}
export function writeStorage(storage,state) {
  try{storage.setItem(STORAGE_KEY,JSON.stringify({version:1,levelId:state.level.id,completed:[...state.completed],actions:state.actions,largeText:state.largeText,records:state.records,run:state.run,musicEnabled:state.musicEnabled}));return true;}catch{return false;}
}
