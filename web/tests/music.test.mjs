import test from 'node:test';
import assert from 'node:assert/strict';
import {Music,normalizeSound,bindMusicActivity} from '../src/music.js';
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
test('one master volume applies to either scene and old individual volumes are discarded',async()=>{
  const audio=new AudioStub();audio.blocked=false;
  const music=new Music(audio,{sound:{master:40,home:50,stage:75}});
  assert.equal(audio.volume,0.4);
  assert.deepEqual(music.sound,{master:40});
  const source=audio.src;
  music.setVolume(25);assert.equal(audio.volume,0.25);assert.equal(audio.src,source);
  music.setScene('stage');assert.equal(audio.volume,0.25);
  music.setVolume(20);assert.equal(audio.volume,0.2);
  music.setScene('home');assert.equal(audio.volume,0.2);
  music.setVolume(0);await music.play();assert.equal(audio.volume,0);assert.equal(music.playing,false);
  music.setVolume(20);await music.play();assert.equal(music.playing,true);
});
test('scene changes and volume adjustments respect mute and visibility',async()=>{
  const audio=new AudioStub();audio.blocked=false;
  const music=new Music(audio,{sound:{master:20,home:40,stage:80}});
  music.setScene('stage');await music.play();
  assert.equal(music.track,'stage');assert.equal(audio.volume,0.2);
  music.setScene('home');assert.equal(music.track,'home');assert.equal(audio.volume,0.2);
  music.setEnabled(false);music.setScene('stage');music.setVolume(50);
  await music.play();assert.equal(audio.paused,true);assert.equal(music.enabled,false);
  music.setScene('home');assert.equal(audio.volume,0.5);assert.equal(audio.paused,true);
  music.setEnabled(true);music.setScene('stage');music.suspend(true);
  music.setVolume(30);await music.play();assert.equal(audio.paused,true);
  music.suspend(false);await music.play();assert.equal(music.playing,true);
  assert.equal(audio.volume,0.3);
  music.setScene('invalid');assert.equal(music.track,'stage');
});
test('saved sound settings migrate older saves, persist with mute and recover malformed values',()=>{
  let raw;const storage={getItem:()=>raw,setItem:(_,value)=>raw=value};
  const state=restore({version:1,musicEnabled:false},levels);
  assert.deepEqual(state.sound,{master:20});
  state.sound={master:35,home:60,stage:85};
  assert.equal(writeStorage(storage,state),true);
  const saved=restore(readStorage(storage),levels);
  assert.deepEqual(saved.sound,{master:35});assert.equal(saved.musicEnabled,false);
  assert.deepEqual(JSON.parse(raw).sound,{master:35});
  assert.deepEqual(normalizeSound({master:-5,home:150,stage:'loud'}),{master:0});
  assert.deepEqual(normalizeSound({master:NaN,home:null,stage:Infinity}),{master:20});
  const audio=new AudioStub(),music=new Music(audio);
  music.setVolume(Infinity);music.setVolume('loud');
  assert.deepEqual(music.sound,{master:20});
});
test('background launches stay silent and switching windows leaves only the focused game playing',async()=>{
  const createWindow=()=>{
    const page=new EventTarget(),view=new EventTarget(),audio=new AudioStub();
    audio.blocked=false;page.hidden=false;page.focused=false;page.hasFocus=()=>page.focused;
    const music=new Music(audio,{suspended:true});
    bindMusicActivity(music,page,view);
    return {page,view,audio,music};
  };
  const a=createWindow(),b=createWindow();
  await Promise.resolve();assert.equal(a.audio.paused,true);assert.equal(b.audio.paused,true);
  a.page.focused=true;a.view.dispatchEvent(new Event('focus'));await Promise.resolve();
  assert.equal(a.music.playing,true);assert.equal(b.music.playing,false);
  a.page.focused=false;a.view.dispatchEvent(new Event('blur'));
  b.page.focused=true;b.view.dispatchEvent(new Event('focus'));
  a.music.setScene('stage');a.music.setVolume(30);b.music.setScene('stage');await Promise.resolve();
  assert.equal(a.music.playing,false);assert.equal(b.music.playing,true);
  b.page.hidden=true;b.page.dispatchEvent(new Event('visibilitychange'));await Promise.resolve();
  assert.equal(b.audio.paused,true);
  b.page.focused=false;b.page.hidden=false;b.page.dispatchEvent(new Event('visibilitychange'));
  await Promise.resolve();assert.equal(b.audio.paused,true);
  a.page.focused=true;a.view.dispatchEvent(new Event('focus'));await Promise.resolve();
  assert.equal(a.music.playing,true);assert.equal(b.music.playing,false);
  a.view.dispatchEvent(new Event('pagehide'));assert.equal(a.audio.paused,true);
  a.view.dispatchEvent(new Event('pageshow'));await Promise.resolve();assert.equal(a.music.playing,true);
});
test('a delayed playback start cannot resume sound after muting or leaving the screen',async()=>{
  for(const stop of [music=>music.setEnabled(false),music=>music.suspend(true)]){
    let start;
    const audio=new AudioStub();
    audio.play=()=>new Promise(resolve=>{start=()=>{audio.paused=false;resolve();};});
    const music=new Music(audio,{suspended:true});
    music.suspended=false;const pending=music.play();stop(music);start();await pending;
    assert.equal(audio.paused,true);
  }
});
