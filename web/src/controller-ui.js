import {NEUTRAL,InputEdges,adjustFrame,gamepadFrame} from './controller-input.js';
import {SerialController} from './serial-controller.js';

const names={up:'上',down:'下',left:'左',right:'右',a:'A 決定',b:'B 戻る'};
const keyAction={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',Enter:'a',' ':'a',a:'a',A:'a',Escape:'b',b:'b',B:'b'};
const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const prefKey='himohodoki-controller-v1';

export class ControllerHelp {
  constructor({onAction,onPlay,onChange,onMouse,storage}){
    this.onAction=onAction;this.onPlay=onPlay;this.onChange=onChange;this.onMouse=onMouse;this.storage=storage;
    this.dialog=document.getElementById('controller-dialog');
    this.banner=document.getElementById('controller-status');
    this.edges=new InputEdges();this.seen=new Set();this.keys=new Set();
    this.mode='serial';this.profile={invertX:false,invertY:false};this.center={centerX:0,centerY:0};
    try{const saved=JSON.parse(storage?.getItem(prefKey));if(['serial','gamepad','keyboard'].includes(saved?.mode))this.mode=saved.mode;this.profile={invertX:saved?.invertX===true,invertY:saved?.invertY===true};}catch{}
    this.status='idle';this.message='つなぎ方をえらび、接続と操作を確かめましょう。';this.playing=false;this.raw={...NEUTRAL};this.lastFrame=0;this.padIndex=null;
    this.serial=new SerialController(navigator.serial,frame=>this.receive(frame), (status,message)=>this.setStatus(status,message));
    document.getElementById('controller-button').addEventListener('click',()=>this.open());
    this.dialog.addEventListener('click',event=>this.click(event));
    this.dialog.addEventListener('change',event=>this.change(event));
    this.dialog.addEventListener('cancel',event=>{event.preventDefault();this.close();});
    window.addEventListener('keydown',event=>this.key(event,true),true);
    window.addEventListener('keyup',event=>this.key(event,false),true);
    window.addEventListener('blur',()=>{this.keys.clear();this.edges.reset();});
    document.addEventListener('visibilitychange',()=>{this.keys.clear();this.edges.reset();});
    window.addEventListener('gamepadconnected',()=>{if(this.mode==='gamepad'&&this.dialog.open)this.refreshPads();});
    this.tick=now=>{this.poll(now);this.animation=requestAnimationFrame(this.tick);};
    this.animation=requestAnimationFrame(this.tick);
  }
  savePreference(){try{this.storage?.setItem(prefKey,JSON.stringify({mode:this.mode,...this.profile}));}catch{}}
  setStatus(status,message){
    this.status=status;this.message=message;
    if(status!=='connected'){this.playing=false;this.edges.reset();this.seen.clear();}
    this.update();
  }
  receive(frame){
    this.raw=frame;this.lastFrame=performance.now();
    if(this.status!=='connected'){this.status='connected';this.message='操作の信号が届いています。スティックとボタンから手をはなしてください。';}
  }
  async stop(){
    this.playing=false;this.keys.clear();this.padIndex=null;this.edges.reset();this.seen.clear();this.raw={...NEUTRAL};this.center={centerX:0,centerY:0};
    await this.serial.disconnect();
  }
  open(){
    if(this.dialog.open)return;
    this.previousFocus=document.activeElement;this.playing=false;this.edges.reset();
    this.render();this.dialog.showModal();
    if(this.mode==='gamepad')this.refreshPads();
    this.update();
  }
  close(){this.dialog.close();this.keys.clear();this.edges.reset();this.previousFocus?.focus({preventScroll:true});}
  render(){
    const usbAvailable=!!navigator.serial&&window.isSecureContext;
    this.page=0;
    const pages=[
      `<div class="connection-page"><div><label class="controller-mode-label" for="controller-mode">つなぎ方</label><select id="controller-mode"><option value="serial" ${this.mode==='serial'?'selected':''}>Pico / Pico W（USB）</option><option value="gamepad" ${this.mode==='gamepad'?'selected':''}>USBゲームパッド</option><option value="keyboard" ${this.mode==='keyboard'?'selected':''}>キーボードとして動く機器</option></select>
      <p class="connection-instructions">${this.mode==='serial'?(usbAvailable?'データ通信用USBケーブルでPCにつなぎ、ポートをえらびます。準備手順は4ページへ。':'USB接続はPCのChrome / Edgeで開いてください。マウス・タッチでも遊べます。'):this.mode==='gamepad'?'USBでつなぎ、ボタンをひとつ押してから機器をさがします。':'矢印・A/B（Enter/Esc）を送る機器用です。通常のキーボードでもテストできます。'}</p></div>
      <div><div class="connection-actions">${this.mode==='serial'?`<button class="primary-button" data-controller="serial-connect" ${!usbAvailable?'disabled':''}>USBにつなぐ</button>`:this.mode==='gamepad'?`<select id="gamepad-choice" aria-label="見つかったゲームパッド"><option value="">ボタンを押してからさがしてください</option></select><button data-controller="find-pads">機器をさがす</button><button data-controller="pad-connect">接続する</button>`:'<button class="primary-button" data-controller="keyboard-connect">キー入力をためす</button>'}</div><p class="connection-status" role="status" data-connection-message></p></div></div>`,
      `<div class="test-page"><section class="controller-test" aria-label="操作をためす" tabindex="0" id="controller-test-pad"><p>手をはなし、上下左右とA/Bを試します。</p><div class="controller-monitor"><div class="stick-monitor" aria-hidden="true"><span id="stick-dot"></span></div><div class="input-checks">${Object.entries(names).map(([key,label])=>`<div class="input-check" data-check="${key}"><span>${label}</span><small>未確認</small></div>`).join('')}</div></div><p class="controller-live" id="controller-live">入力を待っています</p></section><div class="controller-play"><p class="controller-play-help" id="controller-play-help"></p><button class="primary-button" data-controller="play" disabled>このコントローラーで遊ぶ</button></div></div>`,
      `<div class="calibration-page"><div><p class="dialog-copy">中央や向きがずれたら、ここで合わせます。変更後は2ページで操作を確認してください。</p><p class="connection-status" role="status" data-connection-message></p></div><div class="calibration-controls"><button data-controller="calibrate" ${this.mode==='keyboard'?'disabled':''}>真ん中を合わせる</button><label><input type="checkbox" id="invert-x" ${this.profile.invertX?'checked':''}> 左右を逆にする</label><label><input type="checkbox" id="invert-y" ${this.profile.invertY?'checked':''}> 上下を逆にする</label><button data-controller="disconnect">接続を解除</button></div></div>`,
      '<p class="dialog-copy"><strong>Pico / Pico W の準備 ①</strong><br>CircuitPythonが入った基板をPCにつなぎ、CIRCUITPYドライブを確認します。</p><p class="dialog-copy">今の boot.py と code.py をPCにコピーして残します。Pi 4などのLinux機や機種不明の基板には、次のコードを入れないでください。</p>',
      '<div class="firmware-page"><p class="dialog-copy"><strong>Pico / Pico W の準備 ②</strong><br>2ファイルをCIRCUITPYの一番上に保存し、USBを抜き差しします。設定や配線を変えている場合は、作った人と確認してください。</p><div class="firmware-links"><a href="./controller-firmware/boot.py" download="boot.py">boot.pyを保存</a><a href="./controller-firmware/code.py" download="code.py">code.pyを保存</a><a href="./controller-firmware/README.txt" download="README.txt">詳しい手順・配線を保存</a></div></div>',
      '<p class="dialog-copy"><strong>つながらないとき</strong><br>充電専用ケーブルは使えません。Thonnyや別タブを閉じ、データ用ポートを選び直してください。</p><p class="dialog-copy">元のWi-Fi用コードはUSBでは動きません。前のページのUSB用コードを使います。純正Wiiリモコンの直接接続には対応していません。</p>'
    ];
    this.dialog.innerHTML=`<div class="dialog-heading"><h2 id="controller-title">コントローラー</h2><button class="close-button" data-controller="close" aria-label="接続画面をとじる">×</button></div><div class="dialog-pages">${pages.map((page,index)=>`<section class="dialog-page" data-controller-page="${index}" ${index?'hidden':''}>${page}</section>`).join('')}</div><nav class="page-navigation" aria-label="接続案内のページ"><button data-controller="previous-page" disabled>もどる</button><span class="page-count" aria-live="polite">1 / ${pages.length}</span><button data-controller="next-page">つぎへ</button><button data-controller="close" data-page-done hidden>とじる</button></nav>`;
  }
  showPage(page){
    const pages=[...this.dialog.querySelectorAll('[data-controller-page]')];
    this.page=Math.max(0,Math.min(pages.length-1,page));
    this.keys.clear();this.edges.reset();
    pages.forEach((item,index)=>item.hidden=index!==this.page);
    this.dialog.querySelector('[data-controller="previous-page"]').disabled=this.page===0;
    this.dialog.querySelector('[data-controller="next-page"]').hidden=this.page===pages.length-1;
    this.dialog.querySelector('[data-page-done]').hidden=this.page!==pages.length-1;
    this.dialog.querySelector('.page-count').textContent=`${this.page+1} / ${pages.length}`;
    (this.page===1?this.dialog.querySelector('#controller-test-pad'):this.dialog.querySelector(this.page===pages.length-1?'[data-page-done]':'[data-controller="next-page"]')).focus({preventScroll:true});
  }
  update(){
    const bannerText=this.playing?'接続中':this.status==='connected'?'入力を確認中':this.status==='lost'||this.status==='stalled'?'接続を確認してください':'';
    if(this.banner.textContent!==bannerText)this.banner.textContent=bannerText;
    document.body.classList.toggle('controller-active',this.playing);
    const stateKey=[this.playing,this.status,this.mode].join(':');
    if(this.previousState!==stateKey){this.previousState=stateKey;this.onChange?.();}
    if(!this.dialog.open)return;
    for(const message of this.dialog.querySelectorAll('[data-connection-message]'))if(message.textContent!==this.message)message.textContent=this.message;
    const adjusted=adjustFrame(this.raw,{...this.profile,...this.center});
    const dot=this.dialog.querySelector('#stick-dot');dot.style.transform=`translate(${adjusted.x*28}px,${adjusted.y*28}px)`;
    for(const [key,label] of Object.entries(names)){
      const item=this.dialog.querySelector(`[data-check="${key}"]`),active=key==='a'||key==='b'?this.raw[key]:this.edges.direction===key;
      item.classList.toggle('active',this.status==='connected'&&!!active);item.classList.toggle('tested',this.seen.has(key));
      const text=this.seen.has(key)?'✓ 確認済':'未確認';if(item.lastElementChild.textContent!==text)item.lastElementChild.textContent=text;
    }
    const ready=this.status==='connected'&&['up','down','left','right','a'].every(key=>this.seen.has(key));
    this.dialog.querySelector('[data-controller="play"]').disabled=!ready;
    const state=this.status!=='connected'?'入力を待っています':!this.edges.armed?'手をはなして、スティックを真ん中にもどしてください':this.edges.direction?`${names[this.edges.direction]}に動いています`:this.raw.a?'Aを押しています':this.raw.b?'Bを押しています':'真ん中です。上下左右とA/Bを試してね';
    const live=this.dialog.querySelector('#controller-live');if(live.textContent!==state)live.textContent=state;
    const playHelp=this.dialog.querySelector('#controller-play-help'),playText=ready?'確認できました。Aで決定、Bでもどります。':'上下左右とAを確認すると遊べます。';
    if(playHelp.textContent!==playText)playHelp.textContent=playText;
    const connect=this.dialog.querySelector('[data-controller="serial-connect"]');if(connect)connect.disabled=!navigator.serial||!window.isSecureContext||this.serial.connecting;
  }
  async click(event){
    const command=event.target.closest('[data-controller]')?.dataset.controller;if(!command)return;
    if(command==='close'){this.close();return;}
    if(command==='previous-page'||command==='next-page'){this.showPage(this.page+(command==='next-page'?1:-1));return;}
    if(command==='serial-connect'){this.edges.reset();this.seen.clear();this.center={centerX:0,centerY:0};this.playing=false;this.savePreference();await this.serial.connect();}
    if(command==='disconnect')await this.stop();
    if(command==='find-pads')this.refreshPads();
    if(command==='pad-connect'){
      const value=this.dialog.querySelector('#gamepad-choice').value;
      if(value===''){this.setStatus('idle','ボタンをひとつ押してから「機器をさがす」を押してください。');}
      else{await this.stop();this.padIndex=Number(value);this.setStatus('waiting','ゲームパッドからの入力を待っています。');this.savePreference();}
    }
    if(command==='keyboard-connect'){
      await this.stop();this.setStatus('connected','キー入力を確認します。機器と普通のキーボードは区別できません。');this.savePreference();this.showPage(1);
    }
    if(command==='calibrate'){
      if(this.status!=='connected'){this.message='先に接続して、信号が届いていることを確認してください。';}
      else if(Math.abs(this.raw.x)>.45||Math.abs(this.raw.y)>.45||this.raw.a||this.raw.b){this.message='スティックとボタンから手をはなして、もう一度押してください。';}
      else{this.center={centerX:this.raw.x,centerY:this.raw.y};this.edges.reset();this.seen.clear();this.message='今の位置を真ん中にしました。もう一度、上下左右とA/Bを試してください。';}
    }
    if(command==='play'&&!event.target.closest('button').disabled){this.playing=true;this.close();this.edges.reset();this.onPlay();}
    if(command==='mouse'){await this.stop();this.close();this.onMouse?.();}
    this.update();
  }
  async change(event){
    if(event.target.id==='controller-mode'){
      await this.stop();this.mode=event.target.value;this.profile={invertX:false,invertY:false};this.render();if(this.mode==='gamepad')this.refreshPads();
    }
    if(event.target.id==='invert-x'||event.target.id==='invert-y'){
      this.profile[event.target.id==='invert-x'?'invertX':'invertY']=event.target.checked;this.edges.reset();this.seen.clear();this.savePreference();
    }
    this.update();
  }
  refreshPads(){
    const select=this.dialog.querySelector('#gamepad-choice');if(!select)return;
    try{
      const pads=Array.from(navigator.getGamepads?.()||[]).filter(p=>p?.connected);
      select.innerHTML=pads.length?'<option value="">機器をえらぶ</option>'+pads.map(p=>`<option value="${p.index}">${escapeHTML(p.id)}</option>`).join(''):'<option value="">機器が見つかりません。ボタンを押してね</option>';
      if(pads.length===1)select.value=String(pads[0].index);
    }catch{this.message='この画面ではゲームパッドを読み取れません。ブラウザーで直接開いてください。';}
  }
  key(event,down){
    const action=keyAction[event.key];if(!action||this.mode!=='keyboard')return;
    const testing=this.dialog.open&&document.activeElement===this.dialog.querySelector('#controller-test-pad');
    if(!down&&this.keys.has(event.key)){this.keys.delete(event.key);this.poll(performance.now());}
    if(!testing&&!this.playing)return;
    if(down){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat)this.keys.add(event.key);}
    else{event.preventDefault();event.stopImmediatePropagation();this.keys.delete(event.key);}
    this.poll(performance.now());
  }
  poll(now){
    if(this.mode==='gamepad'&&this.padIndex!==null){
      let pad;try{pad=navigator.getGamepads?.()[this.padIndex];}catch{}
      if(pad?.connected){this.receive(gamepadFrame(pad));}
      else{this.padIndex=null;this.setStatus('lost','ゲームパッドが外れました。つなぎ直して、もう一度機器をえらんでください。');}
    }else if(this.mode==='keyboard'&&this.status==='connected'){
      const pressed=action=>[...this.keys].some(key=>keyAction[key]===action);
      this.raw={x:Number(pressed('right'))-Number(pressed('left')),y:Number(pressed('down'))-Number(pressed('up')),a:pressed('a'),b:pressed('b')};
    }
    if(this.mode==='serial'&&this.status==='connected'&&now-this.lastFrame>1600){this.setStatus('stalled','操作の信号が止まりました。USBと接続先を確かめ、もう一度テストして再開してください。');this.raw={...NEUTRAL};}
    if(this.mode==='serial'&&this.status==='waiting'){this.message='操作の信号を待っています。届かない場合は、USB用コード・抜き差し・データ用ポートの選択を確かめてください。';}
    if(this.status==='connected'){
      if(!document.hidden&&document.hasFocus()){
        const events=this.edges.update(adjustFrame(this.raw,{...this.profile,...this.center}),now);
        for(const action of events){
          if(this.dialog.open){if(this.page===1)this.seen.add(action);}
          else if(this.playing){this.onAction(action);if(!this.edges.armed)break;}
        }
      }else this.edges.reset();
    }
    this.update();
  }
}
