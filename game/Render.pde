// ===== Render.pde =====
// All drawing (grid, ropes, endpoints, cursors, buttons, HUD, timer, hint, clear banner)

// Background grid
void drawGrid(){
  stroke(40); strokeWeight(1);
  for(int x=0;x<W;x+=40) line(x,0,x,H);
  for(int y=0;y<H;y+=40) line(0,y,W,y);
}

// Draw all pegs (free points included)
void drawAllPoints(){
  for(int r=0;r<gridRows;r++){
    for(int c=0;c<gridCols;c++){
      PVector p = gridToPos(r,c);
      boolean occupied=false;
      for(int i=0;i<N;i++){
        if(ropeState[i]==ROPE_REMOVED) continue;
        if(samePos(endA[i],p) || samePos(endB[i],p)){ occupied=true; break; }
      }
      if(!occupied){
        fill(150); noStroke(); ellipse(p.x,p.y,12,12); // free peg
      }
    }
  }
}

void drawScene(){
  // ropes (draw by drawOrder so last moved is on top)
  for(int idx=0; idx<N; idx++){
    int i = drawOrder[idx];
    if(ropeState[i]==ROPE_REMOVED) continue;
    color col = ropeColors[i];
    if(ropeState[i]==ROPE_FADING){
      float alpha = map(millis()-fadeStartMs[i], 0, 100, 255, 0);
      stroke(col, alpha);
    } else {
      stroke(col);
    }
    strokeWeight(16);
    line(endA[i].x,endA[i].y, endB[i].x,endB[i].y);
    
  }

  // free pegs
  drawAllPoints();

  // endpoints with cursor/selection
  for(int i=0;i<N;i++){
    if(ropeState[i]==ROPE_REMOVED) continue;
    drawEndpoint(endA[i], ropeColors[i], i, 0);
    drawEndpoint(endB[i], ropeColors[i], i, 1);
  }

  // show yellow cursor also on FREE cell (when grid focus & no endpoint at that cell)
  drawFreeCellCursorIfNeeded();

  // top-left stage caption
  fill(255); textAlign(LEFT,TOP); textSize(16);
  text("ステージ "+currentStage, 16, 16);
}

void drawEndpoint(PVector p, color col, int ropeId, int endIdx){
  // base peg
  fill(250,220,120); stroke(60); strokeWeight(2);
  ellipse(p.x,p.y,28,28);
  // rope cap
  noStroke(); fill(col); ellipse(p.x,p.y,20,20);

  // SELECT cursor (yellow) — only when cursor is on this endpoint cell
  if(playFocusRow==1){
    PVector cp = gridToPos(gridCurR, gridCurC);
    if(samePos(p,cp)){
      noFill(); stroke(255,230,120); strokeWeight(3);
      ellipse(p.x,p.y,36,36);
    }
  }
  // EDIT selection (red) only for chosen endpoint
  if(editRope==ropeId && editEnd==endIdx){
    noFill(); stroke(255,60,60); strokeWeight(4);
    ellipse(p.x,p.y,40,40);
  }
}

// Yellow cursor ring for FREE cell (when grid focused & no endpoint there)
void drawFreeCellCursorIfNeeded(){
  if(state!=STATE_PLAY) return;
  if(mode!=MODE_SELECT) return;
  if(playFocusRow!=1) return;

  PVector cp = gridToPos(gridCurR, gridCurC);
  // check occupancy by any endpoint
  boolean occupied=false;
  for(int i=0;i<N;i++){
    if(ropeState[i]==ROPE_REMOVED) continue;
    if(samePos(endA[i],cp) || samePos(endB[i],cp)){ occupied=true; break; }
  }
  if(!occupied){
    noFill(); stroke(255,230,120); strokeWeight(3);
    ellipse(cp.x, cp.y, 28, 28); // yellow ring on free peg
  }
}

void drawTopButtons(){
  String[] labels={"リトライ","やめる","ヒント"};
  for(int i=0;i<3;i++){
    float x=W/2 + (i-1)*160;
    float y=80;
    boolean focus = (playFocusRow==0 && playTopIndex==i);
    rectMode(CENTER);
    fill(focus? color(60,60,20): color(40));
    stroke(focus? color(255,230,120): color(200));
    strokeWeight(focus?3:1.5);
    rect(x,y,120,36,8);
    fill(255); textAlign(CENTER,CENTER); textSize(18);
    text(labels[i],x,y);
  }
}

// HUD bottom text
void drawPlayHUD(){
  fill(220); textSize(14); textAlign(CENTER,CENTER);
  text("ステージ "+currentStage+"  |  プレイヤー数: "+activePlayers+
       "  |  選択:矢印  A:決定  (EDIT中: ←→↑↓ , A/Bでキャンセル)", W/2, H-15);
}

// Timer (top-right)
void drawTimer(){
  pushStyle();
  fill(255); textSize(16); textAlign(RIGHT,TOP);
  int elapsed = (state==STATE_CLEAR && clearTimeMillis>0)? clearTimeMillis : millis()-stageStartMillis;
  float sec = elapsed/1000.0;
  text(nf(sec,0,2)+" 秒", W-20, 20);
  popStyle();
}

// Clear banner
void drawClearBanner(){
  pushStyle();
  rectMode(CENTER);
  fill(60,180,120,220); noStroke();
  rect(W/2, 80, 360, 60, 12);
  fill(0); textAlign(CENTER,CENTER);
  textSize(22); text("クリア！", W/2, 65);
  textSize(16); text("タイム: "+nf(clearTimeMillis/1000.0,0,2)+" 秒", W/2, 95);
  popStyle();
}

// Hint blinking (endpoint + target) — color = GREEN, ~100ms blink
void drawHintEffect(){
  if(!hintActive || hintMove==null) return;
  if(millis() > hintExpireAt){ hintActive=false; hintMove=null; return; }

  // 100ms ON / 100ms OFF (200ms cycle)
  boolean vis = ( (millis()%200) < 100 );
  if(!vis) return;

  // moved endpoint position
  PVector hp = (hintMove.endpointIndex==0)? endA[hintMove.ropeId] : endB[hintMove.ropeId];
  PVector tp = hintMove.target;

  pushStyle();
  noFill();
  stroke(0, 220, 80);     // <-- GREEN (変更点)
  strokeWeight(4);
  ellipse(hp.x, hp.y, 40, 40);
  ellipse(tp.x, tp.y, 40, 40);
  popStyle();
}
