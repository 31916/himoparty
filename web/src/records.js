// The original Processing game awards stars at 15 and 30 seconds.
export function starsFor(ms){return Number.isFinite(ms)&&ms>=0?(ms<=15000?3:ms<=30000?2:1):1;}
export function formatTime(ms){return Number.isFinite(ms)?`${(Math.ceil(ms/100)/10).toFixed(1)}秒`:'計測なし';}
export function newRun(now=Date.now()){return {startedAt:now,finished:false,clearMs:null};}
export function elapsed(run,now=Date.now()){return run.finished?run.clearMs:run.startedAt===null?null:Math.max(0,now-run.startedAt);}
export function finishRun(run,now=Date.now()){if(!run.finished){run.clearMs=elapsed(run,now);run.finished=true;}return run.clearMs;}
export function restoreRun(value,{hasMoves=false,isClear=false,now=Date.now()}={}){
  if(value&&Number.isFinite(value.startedAt)&&value.startedAt>0&&value.startedAt<=now&&(!isClear||Number.isFinite(value.clearMs)&&value.clearMs>=0)){
    return {startedAt:value.startedAt,finished:isClear,clearMs:isClear?value.clearMs:null};
  }
  // Old saves have no measured time: keep their progress without inventing a record.
  return hasMoves?{startedAt:null,finished:isClear,clearMs:null}:newRun(now);
}
export function recordClear(records,id,ms,moves){
  if(!Number.isFinite(ms)||ms<0)return;
  if(!records[id]||ms<records[id].ms||(ms===records[id].ms&&moves<records[id].moves))records[id]={ms,moves};
}
