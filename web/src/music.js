export class Music {
  constructor(audio,{enabled=true,onChange=()=>{}}={}){
    this.audio=audio;this.enabled=enabled;this.onChange=onChange;this.scene=null;this.suspended=false;this.blocked=false;this.generation=0;
    audio.loop=true;audio.volume=0.35;
    for(const event of ['playing','pause','error'])audio.addEventListener(event,()=>this.onChange(this));
    this.setScene('stage');this.onChange(this);
  }
  get playing(){return this.enabled&&!this.suspended&&!this.audio.paused;}
  setScene(scene){
    if(this.scene===scene)return;
    this.scene=scene;this.generation++;this.audio.pause();
    this.audio.src=new URL(`../audio/bgm_${scene}.mp3`,import.meta.url).href;
    this.play();
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
    this.enabled=!(this.enabled&&!this.audio.paused);
    this.generation++;
    if(this.enabled)this.play();else this.audio.pause();
    this.onChange(this);
  }
  suspend(value){this.suspended=value;this.generation++;if(value)this.audio.pause();else this.play();this.onChange(this);}
}
