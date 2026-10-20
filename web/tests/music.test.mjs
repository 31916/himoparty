import test from 'node:test';
import assert from 'node:assert/strict';
import {Music,normalizeSound} from '../src/music.js';
import {restore,readStorage,writeStorage} from '../src/storage.js';
import {levels} from '../src/levels.js';
class AudioStub {
  paused=true;blocked=true;events={};src='';
  addEventListener(name,fn){this.events[name]=fn;}
  pause(){this.paused=true;this.events.pause?.();}
  async play(){if(this.blocked)throw Error('NotAllowedError');this.paused=false;this.events.playing?.();}
}
test('blocked autoplay is recoverable and mute survives scene changes and hidden tabs',async()=>{
  const audio=new AudioStub(),music=new Music(audio);await music.play();
  assert.equal(music.playing,false);assert.equal(music.blocked,true);assert.equal(audio.loop,true);
  assert.equal(audio.volume,0.20);assert.match(audio.src,/audio\/bgm_home.mp3$/);
  audio.blocked=false;music.toggle();await Promise.resolve();assert.equal(music.playing,true);
  music.setScene('stage');await Promise.resolve();assert.match(audio.src,/audio\/bgm_stage.mp3$/);
  music.setScene('home');await Promise.resolve();assert.match(audio.src,/audio\/bgm_home.mp3$/);assert.equal(music.playing,true);
  music.toggle();assert.equal(music.enabled,false);
  music.setScene('stage');music.suspend(true);music.suspend(false);await music.play();assert.equal(music.playing,false);
  music.toggle();await Promise.resolve();assert.equal(music.playing,true);
  music.suspend(true);assert.equal(music.playing,false);music.suspend(false);await Promise.resolve();assert.equal(music.playing,true);
});
test('saved music-off never plays on initialization',async()=>{
  let enabled;const audio=new AudioStub();audio.blocked=false;const music=new Music(audio,{enabled:false,onChange:state=>enabled=state.enabled});
  await music.play();assert.equal(audio.paused,true);assert.equal(enabled,false);
});
test('master volume scales both tracks while individual changes keep the other track intact',async()=>{
  const audio=new AudioStub();audio.blocked=false;
  const music=new Music(audio,{sound:{master:40,home:50,stage:75}});
  assert.equal(audio.volume,0.2);
  const source=audio.src;
  music.setVolume('home',25);assert.equal(audio.volume,0.1);assert.equal(audio.src,source);
  music.setScene('stage');assert.equal(audio.volume,0.3);
  music.setVolume('master',20);assert.equal(audio.volume,0.15);
  music.setVolume('home',80);assert.equal(audio.volume,0.15);
  music.setScene('home');assert.equal(audio.volume,0.16);
  music.setVolume('master',0);await music.play();assert.equal(audio.volume,0);assert.equal(music.playing,false);
  music.setVolume('master',20);await music.play();assert.equal(music.playing,true);
});
test('scene changes and volume adjustments respect mute and visibility',async()=>{
  const audio=new AudioStub();audio.blocked=false;
  const music=new Music(audio,{sound:{master:20,home:40,stage:80}});
  music.setScene('stage');await music.play();
  assert.equal(music.track,'stage');assert.equal(audio.volume,0.16);
  music.setScene('home');assert.equal(music.track,'home');assert.equal(audio.volume,0.08);
  music.setEnabled(false);music.setScene('stage');music.setVolume('stage',50);
  await music.play();assert.equal(audio.paused,true);assert.equal(music.enabled,false);
  music.setScene('home');assert.equal(audio.volume,0.08);assert.equal(audio.paused,true);
  music.setEnabled(true);music.setScene('stage');music.suspend(true);
  music.setVolume('master',30);await music.play();assert.equal(audio.paused,true);
  music.suspend(false);await music.play();assert.equal(music.playing,true);
  assert.equal(audio.volume,0.15);
  music.setScene('invalid');assert.equal(music.track,'stage');
});
test('saved sound settings migrate older saves, persist with mute and recover malformed values',()=>{
  let raw;const storage={getItem:()=>raw,setItem:(_,value)=>raw=value};
  const state=restore({version:1,musicEnabled:false},levels);
  assert.deepEqual(state.sound,{master:20,home:100,stage:100});
  state.sound={master:35,home:60,stage:85};
  assert.equal(writeStorage(storage,state),true);
  const saved=restore(readStorage(storage),levels);
  assert.deepEqual(saved.sound,state.sound);assert.equal(saved.musicEnabled,false);
  assert.deepEqual(normalizeSound({master:-5,home:150,stage:'loud'}),{master:0,home:100,stage:100});
  assert.deepEqual(normalizeSound({master:NaN,home:null,stage:Infinity}),{master:20,home:100,stage:100});
  const audio=new AudioStub(),music=new Music(audio);
  music.setVolume('master',Infinity);music.setVolume('other',25);
  assert.deepEqual(music.sound,{master:20,home:100,stage:100});
});
