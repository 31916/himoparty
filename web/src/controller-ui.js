import {NEUTRAL,InputEdges,adjustFrame,gamepadFrame} from './controller-input.js';
import {SerialController} from './serial-controller.js';

const names={up:'上',down:'下',left:'左',right:'右',a:'A：決定',b:'B：もどる'};
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
    this.dialog.innerHTML=`<div class="dialog-heading"><h2 id="controller-title">コントローラーをつなぐ</h2><button class="close-button" data-controller="close" aria-label="接続画面をとじる">×</button></div>
      <p class="dialog-copy">工作したコントローラーを、パソコンにつないで遊ぼう。<br>この画面では入力を試すだけなので、パズルは動きません。</p>
      <ol class="connect-steps" aria-label="接続の手順"><li>1. つなぐ</li><li>2. 操作をためす</li><li>3. 遊ぶ</li></ol>
      <label class="controller-mode-label" for="controller-mode">つなぎ方</label><select id="controller-mode"><option value="serial" ${this.mode==='serial'?'selected':''}>Pico / Pico W（USBケーブル）</option><option value="gamepad" ${this.mode==='gamepad'?'selected':''}>USBゲームパッド</option><option value="keyboard" ${this.mode==='keyboard'?'selected':''}>キーボードとして動く機器</option></select>
      ${this.mode==='serial'?`<div class="connection-instructions"><p>データ通信ができるUSBケーブルで、工作コントローラーとPCをつなぎます。</p><p>${usbAvailable?'下のボタンでポートをえらびます。Pico用のコードは「はじめての準備」から保存できます。':'このブラウザーではUSBポートを使えません。PCのChrome／Edgeでこのゲームを直接開いてください。マウスではこのまま遊べます。'}</p></div><div class="connection-actions"><button class="primary-button" data-controller="serial-connect" ${!usbAvailable?'disabled':''}>USBにつなぐ</button><button data-controller="disconnect">接続を解除</button></div>`:''}
      ${this.mode==='gamepad'?`<div class="connection-instructions"><p>USBでつないだら、ゲームパッドのボタンをひとつ押してください。見つかった機器をえらびます。</p><p>標準ゲームパッドは左スティック・十字キーとA/Bに対応。標準以外は軸1/2・ボタン1/2を仮に割り当てるので、下のテストで確認してください。</p></div><div class="connection-actions"><select id="gamepad-choice" aria-label="見つかったゲームパッド"><option value="">ボタンを押してから、さがしてください</option></select><button data-controller="find-pads">機器をさがす</button><button data-controller="pad-connect">この機器につなぐ</button><button data-controller="disconnect">接続を解除</button></div>`:''}
      ${this.mode==='keyboard'?`<div class="connection-instructions"><p>USBキーボードとして矢印・A/B（またはEnter/Esc）を送る工作機器に対応します。普通のキーボード入力と機器の入力は区別できません。</p><button data-controller="keyboard-connect">キー入力のテストを始める</button></div>`:''}
      <div class="connection-status" role="status" aria-live="polite" id="connection-message"></div>
      <section class="controller-test" aria-labelledby="controller-test-title" tabindex="0" id="controller-test-pad"><h3 id="controller-test-title">操作をためす</h3><p id="controller-test-help">最初に手をはなして中央にもどし、上下左右とAをひとつずつ試してください。Bも確認できます。</p><div class="controller-monitor"><div class="stick-monitor" aria-hidden="true"><span id="stick-dot"></span><i></i></div><div class="input-checks">${Object.entries(names).map(([key,label])=>`<div class="input-check" data-check="${key}"><span>${label}</span><small>未確認</small></div>`).join('')}</div></div><p class="controller-live" id="controller-live">入力を待っています</p></section>
      ${this.mode!=='keyboard'?`<div class="calibration-controls"><button data-controller="calibrate">真ん中を合わせる</button><label><input type="checkbox" id="invert-x" ${this.profile.invertX?'checked':''}> 左右を逆にする</label><label><input type="checkbox" id="invert-y" ${this.profile.invertY?'checked':''}> 上下を逆にする</label></div>`:''}
      <p class="controller-play-help" id="controller-play-help">上下左右とAの反応を確認すると、遊び始められます。</p><div class="connection-actions"><button class="primary-button" data-controller="play" disabled>このコントローラーで遊ぶ</button><button data-controller="mouse">マウスで遊ぶ</button></div>
      <details class="controller-details"><summary>はじめての準備（Pico / Pico W）</summary><ol><li>このコードは <strong>CircuitPythonの入ったPico系基板</strong> 用です。PCにつないで <code>CIRCUITPY</code> ドライブが出ることを確かめます。Raspberry Pi 4などのLinux機や、機種不明の基板にはそのまま使わないでください。</li><li>いま入っている <code>boot.py</code> と <code>code.py</code> をPCの別フォルダーにコピーして残します。</li><li>下の2つのファイルを保存し、<code>CIRCUITPY</code> の一番上に同じ名前でコピーします。既存の設定を変えてある場合は、作った人と内容を確認してください。</li><li>USBを一度抜き、つなぎ直します。「USBにつなぐ」でデータ用ポートをえらびます。COM番号はPCごとに異なります。2つある場合、信号が届かなければ解除してもう一方を試してください。</li><li>上下左右・A/Bを試します。向きが逆なら切り替え、中央がずれていたら手をはなして「真ん中を合わせる」を押します。</li></ol><div class="firmware-links"><a href="./controller-firmware/boot.py" download="boot.py">boot.pyを保存</a><a href="./controller-firmware/code.py" download="code.py">code.pyを保存</a><a href="./controller-firmware/README.txt" download="README.txt">手順・配線を保存</a></div><p>元のリポジトリの配線：横 GP26 / 縦 GP27 / スティック押し込み GP16 / A GP0 / B GP1。ボタンは押すとGNDにつながる構成です。配線が異なる場合は作った人に確認してください。Wi-Fi設定や追加のサーバーは不要です。</p></details>
      <details class="controller-details"><summary>つながらないとき・前のWi-Fi版について</summary><ul><li>充電専用のケーブルでは通信できません。データ通信用ケーブルを使います。</li><li>ポートが開けないときは、Thonnyやシリアルモニター、別のゲームタブを閉じて試します。</li><li>「信号を待っています」のままなら、2つのファイルのコピー、抜き差し、データ用ポートの選択を確かめます。<code>RPI-RP2</code> は通常の <code>CIRCUITPY</code> ドライブとは違います。</li><li>リポジトリの元の <code>raspberry_pi/code.py</code> と <code>connection_check/recv_test.py</code> はWi-Fi（UDP）の送受信用です。元のコードのままUSBを挿しても、このブラウザーへ操作データは届きません。上のUSB用コードに切り替える手順を使ってください。元に戻すときは保存しておいたファイルを戻します。</li><li>USBを抜いたり入力が途切れたりしたら操作を止めます。再接続後、この画面で反応を確かめてから再開できます。</li></ul></details>
      <p class="privacy-copy">接続先をえらぶ操作は必要なときだけ行います。入力データはこのPC内で使い、サーバーへ送りません。対応する工作機器のUSB接続補助です。純正Wiiリモコンの直接接続には対応していません。</p>`;
  }
  update(){
    const bannerText=this.playing?'接続中':this.status==='connected'?'入力を確認中':this.status==='lost'||this.status==='stalled'?'接続を確認してください':'';
    if(this.banner.textContent!==bannerText)this.banner.textContent=bannerText;
    document.body.classList.toggle('controller-active',this.playing);
    const stateKey=[this.playing,this.status,this.mode].join(':');
    if(this.previousState!==stateKey){this.previousState=stateKey;this.onChange?.();}
    if(!this.dialog.open)return;
    const message=this.dialog.querySelector('#connection-message');if(message.textContent!==this.message)message.textContent=this.message;
    const adjusted=adjustFrame(this.raw,{...this.profile,...this.center});
    const dot=this.dialog.querySelector('#stick-dot');dot.style.transform=`translate(${adjusted.x*28}px,${adjusted.y*28}px)`;
    for(const [key,label] of Object.entries(names)){
      const item=this.dialog.querySelector(`[data-check="${key}"]`),active=key==='a'||key==='b'?this.raw[key]:this.edges.direction===key;
      item.classList.toggle('active',this.status==='connected'&&!!active);item.classList.toggle('tested',this.seen.has(key));
      const text=this.seen.has(key)?'✓ 確認できた':'未確認';if(item.lastElementChild.textContent!==text)item.lastElementChild.textContent=text;
    }
    const ready=this.status==='connected'&&['up','down','left','right','a'].every(key=>this.seen.has(key));
    this.dialog.querySelector('[data-controller="play"]').disabled=!ready;
    const state=this.status!=='connected'?'入力を待っています':!this.edges.armed?'手をはなして、スティックを真ん中にもどしてください':this.edges.direction?`${names[this.edges.direction]}に動いています`:this.raw.a?'Aを押しています':this.raw.b?'Bを押しています':'真ん中です。上下左右とA/Bを試してね';
    const live=this.dialog.querySelector('#controller-live');if(live.textContent!==state)live.textContent=state;
    const playHelp=this.dialog.querySelector('#controller-play-help'),playText=ready?'確認できました。スティックで移動、Aで決定、Bではなす／メニューです。':'上下左右とAの反応を確認すると、遊び始められます。';
    if(playHelp.textContent!==playText)playHelp.textContent=playText;
    const connect=this.dialog.querySelector('[data-controller="serial-connect"]');if(connect)connect.disabled=!navigator.serial||!window.isSecureContext||this.serial.connecting;
  }
  async click(event){
    const command=event.target.closest('[data-controller]')?.dataset.controller;if(!command)return;
    if(command==='close'){this.close();return;}
    if(command==='serial-connect'){this.edges.reset();this.seen.clear();this.center={centerX:0,centerY:0};this.playing=false;this.savePreference();await this.serial.connect();}
    if(command==='disconnect')await this.stop();
    if(command==='find-pads')this.refreshPads();
    if(command==='pad-connect'){
      const value=this.dialog.querySelector('#gamepad-choice').value;
      if(value===''){this.setStatus('idle','ボタンをひとつ押してから「機器をさがす」を押してください。');}
      else{await this.stop();this.padIndex=Number(value);this.setStatus('waiting','ゲームパッドからの入力を待っています。');this.savePreference();}
    }
    if(command==='keyboard-connect'){
      await this.stop();this.setStatus('connected','キー入力を確認します。機器と普通のキーボードは区別できません。');this.savePreference();this.dialog.querySelector('#controller-test-pad').focus();
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
          if(this.dialog.open)this.seen.add(action);
          else if(this.playing){this.onAction(action);if(!this.edges.armed)break;}
        }
      }else this.edges.reset();
    }
    this.update();
  }
}
