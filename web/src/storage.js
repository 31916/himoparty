import {clone,move,solved} from './engine.js';
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
  return {level,completed,ropes,actions,history,largeText:safe.largeText===true};
}
export function readStorage(storage) {
  try{return JSON.parse(storage.getItem(STORAGE_KEY));}catch{return null;}
}
export function writeStorage(storage,state) {
  try{storage.setItem(STORAGE_KEY,JSON.stringify({version:1,levelId:state.level.id,completed:[...state.completed],actions:state.actions,largeText:state.largeText}));return true;}catch{return false;}
}
