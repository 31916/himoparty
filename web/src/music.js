export const MUSIC_TRACKS=Object.freeze({
  home:{label:'ホーム',title:'はてなパズル',author:'MATSU',source:'https://dova-s.jp/bgm/play15429.html'},
  stage:{label:'ゲーム',title:'近未来アセスメント',author:'稿屋 隆',source:'https://opentracks.com/bgm/detail/13134'}
});
export function normalizeSound(value){
  const defaults={master:20,home:100,stage:100};
  return Object.fromEntries(Object.entries(defaults).map(([key,fallback])=>[key,Number.isFinite(value?.[key])?Math.max(0,Math.min(100,Math.round(value[key]))):fallback]));
}
export class Music {
  constructor(audio,{enabled=true,sound,onChange=()=>{}}={}){
    this.audio=audio;this.enabled=enabled;this.sound=normalizeSound(sound);this.onChange=onChange;this.scene=null;this.preview=null;this.loadedTrack=null;this.suspended=false;this.blocked=false;this.generation=0;
    audio.loop=true;
    for(const event of ['playing','pause','error'])audio.addEventListener(event,()=>this.onChange(this));
    this.setScene('home');this.onChange(this);
  }
  get track(){return this.preview??this.scene;}
  get volume(){return this.sound.master*(this.sound[this.track]??100)/10000;}
  get playing(){return this.enabled&&!this.suspended&&!this.audio.paused&&this.volume>0;}
  setScene(scene){
    if(!Object.hasOwn(MUSIC_TRACKS,scene))return;
    this.scene=scene;this.preview=null;this.updateTrack();
  }
  updateTrack(){
    this.audio.volume=this.volume;
    if(this.loadedTrack!==this.track){
      this.generation++;this.audio.pause();this.loadedTrack=this.track;
      this.audio.src=new URL(`../audio/bgm_${this.track}.mp3`,import.meta.url).href;
    }
    this.play();
  }
  previewTrack(scene){if(!Object.hasOwn(MUSIC_TRACKS,scene))return;this.preview=scene;this.updateTrack();}
  stopPreview(){if(this.preview===null)return;this.preview=null;this.updateTrack();}
  setVolume(channel,value){
    if(!Object.hasOwn(this.sound,channel)||!Number.isFinite(value))return;
    this.sound[channel]=Math.max(0,Math.min(100,Math.round(value)));
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
    try{await this.audio.play();if(generation===this.generation)this.blocked=false;}
    catch{if(generation===this.generation)this.blocked=true;}
    this.onChange(this);
  }
  toggle(){
    // A blocked autoplay attempt must turn the button into a usable play button.
    this.setEnabled(!(this.enabled&&!this.audio.paused));
  }
  suspend(value){this.suspended=value;this.generation++;if(value)this.audio.pause();else this.play();this.onChange(this);}
}
