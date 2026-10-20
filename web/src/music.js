export const MUSIC_TRACKS=Object.freeze({
  home:{label:'ホーム',title:'はてなパズル',author:'MATSU',source:'https://dova-s.jp/bgm/play15429.html'},
  stage:{label:'ゲーム',title:'近未来アセスメント',author:'稿屋 隆',source:'https://opentracks.com/bgm/detail/13134'}
});
export function normalizeSound(value){
  return {master:Number.isFinite(value?.master)?Math.max(0,Math.min(100,Math.round(value.master))):20};
}
export function bindMusicActivity(music,page,view){
  const sync=()=>music.suspend(page.hidden||!page.hasFocus());
  page.addEventListener('visibilitychange',sync);
  view.addEventListener('focus',sync);
  view.addEventListener('blur',()=>music.suspend(true));
  view.addEventListener('pagehide',()=>music.suspend(true));
  view.addEventListener('pageshow',sync);
  sync();
}
export class Music {
  constructor(audio,{enabled=true,sound,suspended=false,onChange=()=>{}}={}){
    this.audio=audio;this.enabled=enabled;this.sound=normalizeSound(sound);this.onChange=onChange;this.scene=null;this.loadedTrack=null;this.suspended=suspended;this.blocked=false;this.generation=0;
    audio.loop=true;
    for(const event of ['playing','pause','error'])audio.addEventListener(event,()=>this.onChange(this));
    this.setScene('home');this.onChange(this);
  }
  get track(){return this.scene;}
  get volume(){return this.sound.master/100;}
  get playing(){return this.enabled&&!this.suspended&&!this.audio.paused&&this.volume>0;}
  setScene(scene){
    if(!Object.hasOwn(MUSIC_TRACKS,scene))return;
    this.scene=scene;this.updateTrack();
  }
  updateTrack(){
    this.audio.volume=this.volume;
    if(this.loadedTrack!==this.track){
      this.generation++;this.audio.pause();this.loadedTrack=this.track;
      this.audio.src=new URL(`../audio/bgm_${this.track}.mp3`,import.meta.url).href;
    }
    this.play();
  }
  setVolume(value){
    if(!Number.isFinite(value))return;
    this.sound.master=Math.max(0,Math.min(100,Math.round(value)));
    this.audio.volume=this.volume;
    if(this.audio.paused)this.play();
    this.onChange(this);
  }
  setEnabled(value){
    this.enabled=!!value;this.generation++;
    if(this.enabled)this.play();else this.audio.pause();
    this.onChange(this);
  }
  async play(){
    if(!this.enabled||this.suspended)return;
    const generation=this.generation;
    try{
      await this.audio.play();
      if(!this.enabled||this.suspended)this.audio.pause();
      if(generation===this.generation)this.blocked=false;
    }
    catch{if(generation===this.generation)this.blocked=true;}
    this.onChange(this);
  }
  toggle(){
    // A blocked autoplay attempt must turn the button into a usable play button.
    this.setEnabled(!(this.enabled&&!this.audio.paused));
  }
  suspend(value){this.suspended=value;this.generation++;if(value)this.audio.pause();else this.play();this.onChange(this);}
}
