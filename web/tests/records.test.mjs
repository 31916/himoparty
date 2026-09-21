import test from 'node:test';
import assert from 'node:assert/strict';
import {starsFor,newRun,elapsed,finishRun,restoreRun,recordClear} from '../src/records.js';
import {restore,writeStorage,readStorage} from '../src/storage.js';
import {levels} from '../src/levels.js';

test('original time thresholds include exactly 15 and 30 seconds',()=>{
  for(const [ms,stars] of [[0,3],[15000,3],[15001,2],[30000,2],[30001,1],[null,1],[undefined,1]])assert.equal(starsFor(ms),stars);
});
test('reload keeps start time, clear freezes time, undo keeps elapsed time, retry starts fresh',()=>{
  const start=100000,run=newRun(start);
  const restored=restoreRun(run,{hasMoves:true,now:start+12000});
  assert.equal(elapsed(restored,start+15001),15001);
  assert.equal(finishRun(restored,start+20000),20000);
  assert.equal(elapsed(restored,start+90000),20000);
  assert.equal(finishRun(restored,start+90000),20000);
  restored.finished=false;restored.clearMs=null;
  assert.equal(finishRun(restored,start+35000),35000);
  assert.equal(elapsed(newRun(start+40000),start+40000),0);
});
test('best record only improves and survives a full storage round trip',()=>{
  const state=restore(null,levels);state.completed=[1];state.actions=levels[0].solution;
  state.run=newRun(Date.now()-20000);finishRun(state.run);state.musicEnabled=false;
  recordClear(state.records,1,20000,4);recordClear(state.records,1,25000,1);
  assert.deepEqual(state.records[1],{ms:20000,moves:4});
  recordClear(state.records,1,12000,3);recordClear(state.records,1,null,1);
  let saved;const storage={setItem:(_,value)=>saved=value,getItem:()=>saved};
  assert.ok(writeStorage(storage,state));
  const result=restore(readStorage(storage),levels);
  assert.deepEqual(result.records[1],{ms:12000,moves:3});assert.equal(result.musicEnabled,false);assert.equal(result.run.finished,true);
  assert.equal(result.run.clearMs,state.run.clearMs);
  state.completed=[];state.records={};state.actions=[];state.run=newRun();writeStorage(storage,state);
  const reset=restore(readStorage(storage),levels);assert.deepEqual(reset.records,{});assert.deepEqual(reset.completed,[]);assert.equal(reset.musicEnabled,false);
});
test('old saves and invalid records keep progress without fabricating a timed score',()=>{
  const old=restore({version:1,levelId:1,completed:[1],actions:levels[0].solution},levels);
  assert.deepEqual(old.completed,[1]);assert.deepEqual(old.records,{});assert.equal(old.run.clearMs,null);assert.equal(starsFor(old.run.clearMs),1);
  const corrupt=restore({version:1,levelId:20,completed:[1,2],actions:levels[19].solution.slice(0,1),records:{1:{ms:-1,moves:1},2:{ms:0,moves:'bad'},99:{ms:1,moves:1}},run:{startedAt:Date.now()+100000}},levels);
  assert.deepEqual(corrupt.records,{});assert.equal(corrupt.run.startedAt,null);
});
