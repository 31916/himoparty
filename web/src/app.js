import {levels} from './levels.js';
import {clone,move,solved,endpointAt,neighbors,stateKey} from './engine.js';
import {restore,readStorage,writeStorage} from './storage.js';
import {ControllerHelp} from './controller-ui.js';

const $=id=>document.getElementById(id);
let storage;try{storage=window.localStorage;}catch{storage=null;}
const restored=restore(readStorage(storage),levels);
let {level,ropes,actions,history,largeText}=restored;
const completed=new Set(restored.completed);
const colors=['#c66343','#367f88','#7867a3','#a87925','#44754d','#a94f79'];
const colorNames=['だいだい','青','むらさき','黄土','緑','もも'];
let selected=null,focusCell=ropes.find(Boolean)?.[0]??0,hint=null,hintWorker=null,hintTimer=null,hintId=0,installPrompt=null,registration=null,previousFocus=null;
let controller;
const dialog=$('dialog');
const positions=cell=>({x:10+(cell%level.cols)*80/(level.cols-1),y:14+(Math.floor(cell/level.cols))*72/(level.rows-1)});
const say=text=>{$('feedback').textContent=text;};
function persist(){
  const saved=writeStorage(storage,{level,completed,actions,largeText});
  $('save-status').textContent=saved?'記録はこのブラウザーに保存されます':'このブラウザーでは記録を保存できません';
}
function cancelHint(){
  hint=null;hintId++;hintWorker?.terminate();hintWorker=null;clearTimeout(hintTimer);
  $('hint-button').disabled=false;$('hint-button').innerHTML='<span aria-hidden="true">✧</span> ヒントをみる';
}
function render(){
  const isClear=solved(ropes);
  if(isClear)completed.add(level.id);
  document.documentElement.classList.toggle('large-text',largeText);
  $('text-button').setAttribute('aria-pressed',String(largeText));
  $('group-name').textContent=level.group;
  $('level-number').textContent=`${String(level.id).padStart(2,'0')} / 20`;
  $('level-title').textContent=level.title;
  $('move-count').textContent=actions.length;
  $('rope-count').textContent=ropes.filter(Boolean).length;
  $('board-status').textContent=isClear?'よくできました':'ひもをほどこう';
  $('undo-button').disabled=history.length===0;
  $('hint-button').disabled=isClear||!!hintWorker;
  $('progress-count').innerHTML=`${completed.size} <small>/ 20問</small>`;
  $('progress-bar').value=completed.size;
  $('step-marker').textContent=isClear?'✓':selected?'2':'1';
  $('instruction-title').textContent=isClear?'きれいにほどけました':selected?'となりの丸へ動かす':'ひもの端をえらぶ';
  $('instruction-detail').textContent=isClear?'つぎの問題も、自分のペースで。':selected?'点線の丸へ動かします。':'色のついた丸をえらびます。';
  renderBoard();
  const panel=$('clear-panel');panel.hidden=!isClear;
  $('board').inert=isClear;
  if(isClear){
    const allDone=completed.size===levels.length;
    panel.innerHTML=`<div class="clear-symbol" aria-hidden="true">✓</div><h2>${allDone?'20問、ぜんぶ達成！':'すっきり、ほどけた！'}</h2><p>${allDone?'ここまで、ひとつずつ。<br>何度でも、また遊びにきてね。':`${actions.length}手で、ひもがほどけました。<br>そのひらめき、いい感じ。`}</p><button class="primary-button" id="next-button">${level.id<20?'つぎの問題へ　→':'問題をえらぶ　→'}</button><button class="text-button" id="clear-stages-button">問題の一覧へ</button>`;
  }
  persist();
}
function renderBoard(){
  const destinations=selected?neighbors(ropes[selected.rope][selected.end],level.cols,level.rows).filter(c=>!endpointAt(ropes,c)):[];
  const lines=ropes.map((rope,i)=>{
    if(!rope)return '';
    const a=positions(rope[0]),b=positions(rope[1]);
    const coords=`x1="${a.x*10}" y1="${a.y*6.4}" x2="${b.x*10}" y2="${b.y*6.4}"`;
    return `<line class="rope-shadow" ${coords}/><line class="rope-line ${selected?.rope===i?'selected-rope':''}" ${coords} stroke="${colors[i]}"/>`;
  }).join('');
  const cells=Array.from({length:level.cols*level.rows},(_,cell)=>{
    const pos=positions(cell),hit=endpointAt(ropes,cell);
    const isSelected=hit&&selected?.rope===hit.rope&&selected?.end===hit.end;
    const from=hint&&ropes[hint.rope]?.[hint.end]===cell;
    const label=`${Math.floor(cell/level.cols)+1}行${cell%level.cols+1}列、${hit?`ひも${hit.rope+1}、${colorNames[hit.rope]}の端`:'空いた丸'}${destinations.includes(cell)?'、移動できます':''}${hint?.to===cell?'、ヒントの移動先':''}`;
    return `<button type="button" class="cell ${hit?'occupied':''} ${isSelected?'selected':''} ${destinations.includes(cell)?'destination':''} ${from?'hint-from':''} ${hint?.to===cell?'hint-target':''} ${cell===focusCell?'controller-cursor':''}" data-cell="${cell}" style="left:${pos.x}%;top:${pos.y}%;${hit?`--rope-color:${colors[hit.rope]}`:''}" aria-label="${label}" ${hit?`aria-pressed="${!!isSelected}"`:''} tabindex="${cell===focusCell?0:-1}"><span class="peg" aria-hidden="true">${hit?hit.rope+1:''}</span></button>`;
  }).join('');
  $('board').innerHTML=`<svg viewBox="0 0 1000 640" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${cells}`;
}
function focusBoard(cell){focusCell=cell;$('board').querySelectorAll('[data-cell]').forEach(b=>{const focused=Number(b.dataset.cell)===cell;b.tabIndex=focused?0:-1;b.classList.toggle('controller-cursor',focused);});$('board').querySelector(`[data-cell="${cell}"]`)?.focus({preventScroll:true});}
function stepOnBoard(direction){
  const offsets={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
  if(solved(ropes)||!offsets[direction])return;
  const origin=selected?ropes[selected.rope][selected.end]:focusCell;
  const [dx,dy]=offsets[direction],x=origin%level.cols+dx,y=Math.floor(origin/level.cols)+dy;
  if(x<0||x>=level.cols||y<0||y>=level.rows)return;
  const to=y*level.cols+x;selected?performMove(to):focusBoard(to);
}
function chooseCell(cell){
  if(solved(ropes))return;
  focusCell=cell;
  const hit=endpointAt(ropes,cell);
  if(hit){
    selected=selected?.rope===hit.rope&&selected?.end===hit.end?null:hit;
    render();focusBoard(cell);
    say(selected?`ひも${hit.rope+1}をえらびました。となりの点線の丸へ動かせます。`:'ひもの端をえらんでください。');
  }else if(selected){performMove(cell);}else{say('先に、色のついたひもの端をえらんでください。');}
}
function performMove(to){
  if(!selected)return;
  if(actions.length>=1000){say('１手もどすか、はじめから遊びなおせます。');return;}
  const action={...selected,to};const next=move(ropes,action,level.cols,level.rows);
  if(!next){say('動かせるのは、上下左右のとなりにある空いた丸です。');return;}
  const removed=ropes.filter(Boolean).length-next.filter(Boolean).length;
  history.push(clone(ropes));actions.push(action);ropes=next;focusCell=to;
  cancelHint();if(!ropes[selected.rope])selected=null;
  render();
  if(solved(ropes)){controller?.edges.reset();$('next-button').focus({preventScroll:true});say('クリア！ すべてのひもがほどけました。');}
  else{focusBoard(to);say(removed?`${removed}本ほどけました！ 残りも、ゆっくり考えてみよう。`:'動かしました。交差しない場所をさがしてみよう。');}
}
function startLevel(id){
  controller?.edges.reset();
  level=levels.find(l=>l.id===id)||levels[0];ropes=clone(level.ropes);actions=[];history=[];selected=null;focusCell=ropes[0][0];cancelHint();
  render();say('ひもが交差しなくなると、すっとほどけます。');
  $('level-title').tabIndex=-1;$('level-title').focus({preventScroll:true});
}
function undo(){
  if(!history.length)return;
  ropes=history.pop();const last=actions.pop();selected=null;focusCell=ropes[last.rope][last.end];cancelHint();render();say('１手もどしました。何度やりなおしても大丈夫。');$('undo-button').disabled?focusBoard(focusCell):$('undo-button').focus({preventScroll:true});
}
function showHint(action){
  if(!action){say('ここからのヒントは見つかりませんでした。１手もどすか、はじめから試してみよう。');return;}
  hint=action;selected={rope:action.rope,end:action.end};focusCell=ropes[action.rope][action.end];render();
  say(`ひも${action.rope+1}のえらばれた端を、茶色の点線の丸へ動かしてみよう。`);
}
function requestHint(){
  if(solved(ropes)||hintWorker)return;
  cancelHint();
  let check=clone(level.ropes);
  for(let i=0;i<level.solution.length;i++){
    if(stateKey(check)===stateKey(ropes)){showHint(level.solution[i]);return;}
    check=move(check,level.solution[i],level.cols,level.rows);
  }
  if(!window.Worker){say('このブラウザーでは追加のヒントを使えません。１手もどすか、はじめから試してみよう。');return;}
  try{
    hintWorker=new Worker(new URL('./hint-worker.js',import.meta.url),{type:'module'});
    $('hint-button').disabled=true;$('hint-button').textContent='ヒントを考えています…';say('今の盤面から、ほどき方を考えています。');
    const id=++hintId;
    const fail=()=>{cancelHint();showHint(null);};
    hintWorker.onmessage=({data})=>{if(data.id!==hintId)return;const action=data.solution?.[0];cancelHint();showHint(action);};
    hintWorker.onerror=fail;hintTimer=setTimeout(fail,12000);
    hintWorker.postMessage({id,ropes:clone(ropes),cols:level.cols,rows:level.rows});
  }catch{cancelHint();showHint(null);}
}
function openDialog(title,content){
  controller?.edges.reset();
  previousFocus=document.activeElement;
  dialog.innerHTML=`<div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button class="close-button" data-close aria-label="とじる">×</button></div>${content}`;
  dialog.showModal();
}
function closeDialog(){dialog.close();controller?.edges.reset();previousFocus?.focus({preventScroll:true});}
function showControllerMenu(){
  openDialog('操作メニュー',`<p class="dialog-copy">スティックの下・右で次の項目、上・左で前の項目へ。<br>Aで決定、Bでパズルにもどります。</p><div class="controller-menu"><button data-game-control="continue">パズルをつづける</button><button data-game-control="hint" ${solved(ropes)||hintWorker?'disabled':''}>ヒントをみる</button><button data-game-control="undo" ${history.length?'':'disabled'}>１手もどす</button><button data-game-control="restart">はじめから</button><button data-game-control="stages">問題をえらぶ</button><button data-game-control="next-player">次の人へ（リセット）</button><button data-game-control="setup">コントローラーの設定</button></div>`);
  dialog.querySelector('[data-game-control="continue"]').focus();
}
function showPlayerReset(){
  openDialog('次の人に交代しますか？','<p class="dialog-copy">このブラウザーの<strong>クリア記録と途中の盤面を消して、問題1から</strong>始めます。前の人の記録には戻せません。</p><p class="dialog-copy">文字サイズとコントローラーの接続・設定は引き継ぎます。</p><div class="dialog-actions"><button data-close id="cancel-player-reset">交代しない</button><button class="primary-button" id="confirm-player-reset">記録を消して交代する</button></div>');
  $('cancel-player-reset').focus();
}
function controllerAction(action){
  if(dialog.open){
    if(action==='b'){closeDialog();return;}
    if(action==='a'){if(dialog.contains(document.activeElement)&&document.activeElement.tagName==='BUTTON')document.activeElement.click();return;}
    const buttons=[...dialog.querySelectorAll('button:not(:disabled)')];
    const index=buttons.indexOf(document.activeElement),delta=action==='up'||action==='left'?-1:1;
    buttons[(index+delta+buttons.length)%buttons.length]?.focus();return;
  }
  if(action==='b'){
    if(selected){selected=null;render();focusBoard(focusCell);say('ひもの端をはなしました。');}else showControllerMenu();
  }else if(action==='a'){
    if(solved(ropes))$('next-button')?.click();else chooseCell(focusCell);
  }else stepOnBoard(action);
}
function showStages(){
  const groups=['はじめて','なれてきた','ひと工夫','じっくり'];
  openDialog('問題をえらぶ',`<p class="dialog-copy">好きな問題から、ゆっくりどうぞ。<br>✓ はクリアした問題です。別の問題に移ると、いまの盤面は最初にもどります。</p>${groups.map(group=>`<h3 class="stage-group">${group}</h3><div class="stage-grid">${levels.filter(l=>l.group===group).map(l=>`<button data-level="${l.id}" class="${completed.has(l.id)?'done':''} ${level.id===l.id?'current':''}" aria-label="問題${l.id} ${l.title}${completed.has(l.id)?' クリア済み':''}${level.id===l.id?' 現在の問題':''}">${String(l.id).padStart(2,'0')}<small>${completed.has(l.id)?'✓ クリア':`${l.ropes.length}本のひも`}</small></button>`).join('')}</div>`).join('')}`);
}
const diagram=(step)=>`<svg viewBox="0 0 180 100" aria-hidden="true"><path d="${step===3?'M30 25L150 25':'M30 20L150 80'}" stroke="#c66343" stroke-width="7" fill="none" stroke-linecap="round"/><path d="${step===3?'M30 75L150 75':'M150 20L30 80'}" stroke="#fffefa" stroke-width="13"/><path d="${step===3?'M30 75L150 75':'M150 20L30 80'}" stroke="#367f88" stroke-width="7" stroke-linecap="round"/>${step===3?'<text x="83" y="58" font-size="28" fill="#28594d">✓</text>':`<circle cx="30" cy="20" r="11" fill="#c66343" stroke="#fffefa" stroke-width="3"/><circle cx="30" cy="20" r="17" fill="none" stroke="#28594d" stroke-width="2"/>${step===2?'<path d="M51 20H83" stroke="#28594d" stroke-width="2"/><circle cx="99" cy="20" r="12" fill="#e5efdf" stroke="#28594d" stroke-width="2" stroke-dasharray="3 3"/>':''}`}</svg>`;
function showHelp(){
  openDialog('あそびかた',`<p class="dialog-copy">ひもの端を動かして、からまりをほどくパズルです。<br>時間制限はありません。自分のペースで遊べます。</p><div class="tutorial-steps"><div class="tutorial-step">${diagram(1)}<strong>① 端をえらぶ</strong><p>色のついた丸をクリック。数字が同じ丸は、１本のひもの両端です。</p></div><div class="tutorial-step">${diagram(2)}<strong>② となりへ動かす</strong><p>上下左右の空いた丸をクリック。点線の丸が、動かせる場所です。</p></div><div class="tutorial-step">${diagram(3)}<strong>③ ほどけて、クリア</strong><p>ほかのひもに交差・接触しなくなったひもは消えます。全部ほどけばクリア！</p></div></div><p class="privacy-copy">キーボード：矢印で丸を移動し、Enter / Spaceで選択。選択中は矢印でひもの端を動かせます。Escではなします。Tabで操作ボタンへ移れます。<br>困ったときは「ヒントをみる」「１手もどす」を使ってね。</p><div class="dialog-actions"><button class="primary-button" data-close>やってみよう</button></div>`);
}
function showInstallHelp(){
  openDialog('パソコンにインストール',`<p class="dialog-copy">アプリとして開くと、ひもほどきをすぐに始められます。</p><ol class="install-list"><li>Chrome または Edge でこのページを開きます。</li><li>アドレスバーのインストールアイコン、またはブラウザーのメニューから「アプリをインストール」を選びます。</li><li>画面下に「オフラインでも遊べます」と出たら、ネットがなくても遊べます。</li></ol><p class="privacy-copy">記録はこの端末・このブラウザーに保存されます。アカウント登録や通信による記録の送信はありません。ブラウザーのデータを消すと記録も消えます。<br>インストール機能はブラウザーによって異なります。すでにインストールしている場合は、アプリ一覧から開けます。</p>`);
}
$('board').addEventListener('click',event=>{const cell=event.target.closest('[data-cell]');if(cell)chooseCell(Number(cell.dataset.cell));});
$('board').addEventListener('focusin',event=>{const cell=event.target.closest('[data-cell]');if(cell){focusCell=Number(cell.dataset.cell);$('board').querySelectorAll('[data-cell]').forEach(b=>b.tabIndex=b===cell?0:-1);}});
$('board').addEventListener('keydown',event=>{
  const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
  if(event.key==='Escape'){event.preventDefault();selected=null;render();focusBoard(focusCell);say('ひもの端をはなしました。');return;}
  if(!dirs[event.key])return;event.preventDefault();
  stepOnBoard(dirs[event.key]);
});
$('hint-button').addEventListener('click',requestHint);
$('undo-button').addEventListener('click',undo);
$('restart-button').addEventListener('click',()=>{
  if(!actions.length){startLevel(level.id);return;}
  openDialog('はじめから遊ぶ？','<p class="dialog-copy">この問題を最初の状態にもどします。これまでのクリア記録は残ります。</p><div class="dialog-actions"><button data-close>つづける</button><button class="primary-button" id="confirm-restart">はじめから</button></div>');
});
$('help-button').addEventListener('click',showHelp);
$('stages-button').addEventListener('click',showStages);
$('next-player-button').addEventListener('click',showPlayerReset);
$('controller-menu-button').addEventListener('click',showControllerMenu);
$('text-button').addEventListener('click',()=>{largeText=!largeText;render();});
$('clear-panel').addEventListener('click',event=>{
  if(event.target.closest('#next-button'))level.id<20?startLevel(level.id+1):showStages();
  if(event.target.closest('#clear-stages-button'))showStages();
});
dialog.addEventListener('click',event=>{
  const command=event.target.closest('[data-game-control]')?.dataset.gameControl;
  if(command){closeDialog();if(command==='hint')requestHint();if(command==='undo')undo();if(command==='restart')$('restart-button').click();if(command==='stages')showStages();if(command==='next-player')showPlayerReset();if(command==='setup')controller.open();if(command==='continue')focusBoard(focusCell);return;}
  if(event.target.closest('[data-close]'))closeDialog();
  const stage=event.target.closest('[data-level]');if(stage){closeDialog();if(Number(stage.dataset.level)!==level.id)startLevel(Number(stage.dataset.level));}
  if(event.target.closest('#confirm-restart')){closeDialog();startLevel(level.id);}
  if(event.target.closest('#confirm-player-reset')){closeDialog();completed.clear();startLevel(1);focusBoard(focusCell);say('次の人の番です。問題1から、自分のペースでどうぞ。');}
});
dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;});
window.addEventListener('appinstalled',()=>{installPrompt=null;$('install-button').hidden=true;});
$('install-button').addEventListener('click',async()=>{
  if(!installPrompt){showInstallHelp();return;}
  const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;
});
if(matchMedia('(display-mode: standalone)').matches)$('install-button').hidden=true;
function offlineLabel(ready){$('offline-status').textContent=ready?(navigator.onLine?'✓ オフラインでも遊べます':'✓ オフラインで遊んでいます'):'オフラインの準備ができませんでした';}
if('serviceWorker' in navigator){
  navigator.serviceWorker.register(new URL('../sw.js',import.meta.url)).then(reg=>{
    registration=reg;
    if(reg.waiting)$('update-notice').hidden=false;
    reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',()=>{if(reg.waiting&&navigator.serviceWorker.controller)$('update-notice').hidden=false;});});
    navigator.serviceWorker.ready.then(()=>offlineLabel(true));
  }).catch(()=>offlineLabel(false));
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)location.reload();});
  $('update-button').addEventListener('click',()=>{persist();refreshing=true;registration?.waiting?.postMessage('SKIP_WAITING');});
  window.addEventListener('online',()=>offlineLabel(!!registration?.active));window.addEventListener('offline',()=>offlineLabel(!!registration?.active));
}else{offlineLabel(false);}
render();
controller=new ControllerHelp({storage,onAction:controllerAction,onPlay:()=>{focusBoard(focusCell);say('スティックで移動、Aで決定、Bではなす／操作メニューです。');}});
