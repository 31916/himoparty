import test from 'node:test';
import assert from 'node:assert/strict';
import {levels} from '../src/levels.js';
import {clone,intersects,crossings,settle,move,solved,solve,neighbors,validBoard,stateKey} from '../src/engine.js';
import {restore,readStorage,writeStorage} from '../src/storage.js';

test('all 20 published puzzles start tangled and their solution paths legally clear every rope',()=>{
  assert.equal(levels.length,20);
  for(const level of levels){
    assert.ok(validBoard(level.ropes,level.cols,level.rows),`level ${level.id} valid`);
    assert.deepEqual(settle(level.ropes,level.cols),level.ropes,`level ${level.id} no free ropes`);
    let state=clone(level.ropes);
    for(const action of level.solution){state=move(state,action,level.cols,level.rows);assert.ok(state,`level ${level.id} legal move`);assert.ok(validBoard(state,level.cols,level.rows));}
    assert.ok(solved(state),`level ${level.id} cleared`);
  }
});
test('intersection counts proper crossings, overlaps and a touching interior; separated ropes are free',()=>{
  assert.ok(intersects([0,8],[2,6],3));
  assert.ok(intersects([0,2],[1,4],3));
  assert.ok(intersects([0,3],[1,2],4));
  assert.equal(intersects([0,2],[6,8],3),false);
  assert.equal(crossings([[0,8],[2,6]],3),1);
  assert.deepEqual(settle([[0,2],[6,8]],3),[null,null]);
});
test('illegal moves do not change the board, and left/right never wrap across a row',()=>{
  const ropes=[[0,8],[2,6]],snapshot=clone(ropes);
  for(const action of [{rope:0,end:0,to:2},{rope:0,end:0,to:8},{rope:0,end:0,to:-1},{rope:99,end:0,to:1},{rope:0,end:2,to:1}])assert.equal(move(ropes,action,3,3),null);
  assert.deepEqual(ropes,snapshot);assert.ok(!neighbors(2,3,3).includes(3));
  const next=move(ropes,{rope:0,end:0,to:1},3,3);assert.ok(next);assert.deepEqual(ropes,snapshot);
});
test('solver works from legal off-route states without mutating them',()=>{
  for(const level of levels.filter(l=>[1,5,10,15,20].includes(l.id))){
    let state=clone(level.ropes),checked=false;
    outer:for(let rope=0;rope<state.length;rope++)for(let end=0;end<2;end++)for(const to of neighbors(state[rope][end],level.cols,level.rows)){
      const next=move(state,{rope,end,to},level.cols,level.rows);if(!next||solved(next))continue;
      const before=stateKey(next),path=solve(next,level.cols,level.rows);assert.equal(stateKey(next),before);
      assert.ok(path,`off-route hint for ${level.id}`);let current=next;
      for(const action of path){current=move(current,action,level.cols,level.rows);assert.ok(current);}
      assert.ok(solved(current));checked=true;break outer;
    }
    assert.ok(checked);
  }
});
test('bounded search reports no answer without claiming unsolvability',()=>{assert.equal(solve(levels[19].ropes,5,4,0),null);});
test('save and resume preserve moves and undo states; malformed saves recover',()=>{
  const level=levels[19],actions=level.solution.slice(0,3);
  const resumed=restore({version:1,levelId:20,actions,completed:[1,1,2,99],largeText:true},levels);
  assert.equal(resumed.actions.length,3);assert.equal(resumed.history.length,3);assert.deepEqual(resumed.completed,[1,2]);assert.equal(resumed.largeText,true);
  let check=clone(level.ropes);for(const action of actions)check=move(check,action,5,4);assert.deepEqual(resumed.ropes,check);
  const bad=restore({version:1,levelId:20,actions:[...actions,{rope:100,end:0,to:5}]},levels);
  assert.deepEqual(bad.ropes,level.ropes);assert.deepEqual(bad.actions,[]);
  assert.equal(restore(null,levels).level.id,1);
  assert.equal(readStorage({getItem:()=>'{bad'}),null);
  assert.equal(writeStorage({setItem:()=>{throw Error('quota');}},resumed),false);
});
