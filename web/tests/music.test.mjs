import test from 'node:test';
import assert from 'node:assert/strict';
import {Music} from '../src/music.js';
class AudioStub {
  paused=true;blocked=true;events={};src='';
  addEventListener(name,fn){this.events[name]=fn;}
  pause(){this.paused=true;this.events.pause?.();}
  async play(){if(this.blocked)throw Error('NotAllowedError');this.paused=false;this.events.playing?.();}
}
test('blocked autoplay is recoverable and mute survives scene changes and hidden tabs',async()=>{
  const audio=new AudioStub(),music=new Music(audio);await music.play();
  assert.equal(music.playing,false);assert.equal(music.blocked,true);assert.equal(audio.loop,true);
  audio.blocked=false;music.toggle();await Promise.resolve();assert.equal(music.playing,true);
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
