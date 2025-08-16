// ===== HomeScreen.pde =====
// Home (players) + Stage select (with stars)

void initHomeScreen(){
  homeRow = 0; homeSelPlayers=1; homeButton=0;
  stageFocusRow = 0; stageCursor = 1;
}

// Home screen
void drawHome(){
  fill(255); textSize(28); text("紐解きパズル — ホーム", W/2, 64);
  textSize(16); text("↑↓で上段(人数)/下段(ボタン)を切替  ←→で選択  A:決定", W/2, 100);

  // numbers row (1..4), sliding
  for(int i=1;i<=4;i++){
    float x = W/2 + (i-homeSelPlayers)*120;
    float y = H/2;
    boolean focus = (homeRow==0 && i==homeSelPlayers);
    rectMode(CENTER);
    fill(40); stroke(focus? color(255,230,120): color(100)); strokeWeight(focus?3:2);
    rect(x,y,80,80,12);
    fill(255); textSize(32); text(i, x, y);
  }

  // bottom buttons
  String[] labels={"開始","終了"};
  for(int i=0;i<2;i++){
    float x = W/2 + (i==0? -120: 120);
    float y = H/2 + 160;
    boolean focus = (homeRow==1 && homeButton==i);
    rectMode(CENTER);
    fill(focus? color(60,60,20): color(40));
    stroke(focus? color(255,230,120): color(200)); strokeWeight(focus?3:2);
    rect(x,y,120,40,8);
    fill(255); textAlign(CENTER,CENTER); textSize(20);
    text(labels[i], x, y);
  }
}

// Stage select (1..20 + extras after all cleared)
void drawStageSelect(){
  fill(255); textSize(28); text("ステージ選択", W/2, 64);
  textSize(14); text("←→↑↓：移動  A：開始  B：戻る", W/2, 94);

  // grid 5x4 for 1..20
  int cols=5, rows=4;
  float gx0=100, gy0=140;
  float gw=(W-200)/cols;
  float gh=(H-260)/rows;

  int n=1;
  for(int r=0;r<rows;r++){
    for(int c=0;c<cols;c++){
      float x=gx0 + c*gw + gw*0.5;
      float y=gy0 + r*gh + gh*0.5;
      boolean focus = (stageFocusRow==0 && stageCursor==n);
      rectMode(CENTER);
      fill(focus? color(60,60,20): color(50));
      stroke(focus? color(255,230,120): color(160)); strokeWeight(focus?3:1.5);
      rect(x,y, gw*0.7, gh*0.6, 10);
      fill(255); textSize(18); text(n, x, y-6);

      // stars per record
      int ms = bestMs[n-1];
      int stars = (ms<0)? 0 : (ms<=15000?3: (ms<=30000?2:1));
      drawStars(x, y+14, stars);
      n++;
      if(n>20) break;
    }
  }

  // extras (A,B,C) row appears only if all 1..20 cleared at least ★1
  if(allMainCleared()){
    float y = H-120;
    String[] ex = {"A","B","C"};
    for(int i=0;i<3;i++){
      float x = W/2 + (i-1)*120;
      boolean focus = (stageFocusRow==0 && stageCursor==(21+i));
      rectMode(CENTER);
      fill(focus? color(60,60,20): color(50));
      stroke(focus? color(255,230,120): color(160)); strokeWeight(focus?3:1.5);
      rect(x,y, 90, 60, 10);
      fill(255); textSize(20); text(ex[i], x, y-6);
      int idx = 21+i;
      int ms = bestMs[idx-1];
      int stars = (ms<0)? 0 : (ms<=15000?3: (ms<=30000?2:1));
      drawStars(x, y+14, stars);
    }
  }

  // Back button (to Home)
  boolean backFocus = (stageFocusRow==1);
  rectMode(CENTER);
  float bx=W/2, by=H-40;
  fill(backFocus? color(60,60,20): color(40));
  stroke(backFocus? color(255,230,120): color(200)); strokeWeight(backFocus?3:2);
  rect(bx,by,120,40,8);
  fill(255); textSize(18); text("戻る", bx, by);
}

boolean allMainCleared(){
  for(int i=0;i<20;i++) if(bestMs[i]<0) return false;
  return true;
}

void drawStars(float x,float y,int n){
  // draw 1..3 tiny stars
  pushStyle();
  textAlign(CENTER,CENTER); textSize(14); fill(255,230,120);
  String s = (n==0)?"": (n==1?"★": (n==2?"★★":"★★★"));
  text(s, x, y);
  popStyle();
}
