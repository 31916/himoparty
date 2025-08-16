// ===== GameLogic.pde =====
// Rope model, generation, crossings, hint logic

final int MAX_ROPES = 10;

// Rope count for current stage
int N = 4;

// Grid
int gridCols = 4, gridRows = 3;
float gridW, gridH;

// Rope endpoints (world coords, snapped to grid)
PVector[] endA = new PVector[MAX_ROPES];
PVector[] endB = new PVector[MAX_ROPES];

// Rope colors
color[] ropeColors = new color[MAX_ROPES];
final color[] PALETTE = {
  #E63946, #F1A208, #06D6A0, #118AB2, #9B5DE5,
  #FF6B6B, #FFD166, #06B6D4, #8338EC, #FF9F1C
};

// Rope state
static final int ROPE_ACTIVE=0, ROPE_FADING=1, ROPE_REMOVED=2;
int[] ropeState   = new int[MAX_ROPES];
int[] fadeStartMs = new int[MAX_ROPES];

// Draw order (last moved on top)
int[] drawOrder = new int[MAX_ROPES];

// --- Hint system (shared with Render) ---
boolean hintActive = false;

class HintMove {
  int ropeId;          // rope to move
  int endpointIndex;   // 0=A, 1=B
  PVector target;      // target position (snapped)
  HintMove(int r,int e,PVector t){ ropeId=r; endpointIndex=e; target=t; }
}
HintMove hintMove = null;
int hintExpireAt = 0; // millis to stop blinking

// --- Helpers ---
PVector gridToPos(int r,int c){
  return new PVector(80 + c*gridW, 160 + r*gridH);
}
int[] posToCell(PVector p){
  int c = round( (p.x - 80) / gridW );
  int r = round( (p.y - 160) / gridH );
  return new int[]{constrain(r,0,gridRows-1), constrain(c,0,gridCols-1)};
}
boolean cellIn(int r,int c){ return r>=0 && r<gridRows && c>=0 && c<gridCols; }
boolean samePos(PVector a,PVector b){ return abs(a.x-b.x)<0.5 && abs(a.y-b.y)<0.5; }

// ----- Stage generation -----
void generateStage(int stage){
  N = ropeCountForStage(stage);
  if(N <= 7){ gridRows=3; gridCols=4; }
  else { gridRows=5; gridCols=6; }

  gridW = (W-160.0) / (gridCols-1);
  gridH = (H-200.0) / (gridRows-1);

  for(int i=0;i<N;i++){
    endA[i] = new PVector();
    endB[i] = new PVector();
    ropeColors[i] = PALETTE[i % PALETTE.length];
    ropeState[i] = ROPE_ACTIVE;
    drawOrder[i] = i;
  }

  int tries=0;
  while(tries++ < 300){
    randomizeEndpoints();
    if(allRopesHaveAtLeastOneCross() && likelySolvable()) break;
  }
}

int ropeCountForStage(int s){
  if(s>=1 && s<=4) return 4;
  if(s<=8)  return 5;
  if(s<=12) return 6;
  if(s<=16) return 7;
  if(s<=20) return 8;
  if(s==21) return 9;   // A
  if(s==22) return 10;  // B
  if(s==23) return 10;  // C
  return 4;
}

void randomizeEndpoints(){
  boolean[] used = new boolean[gridRows*gridCols];
  int need = 2*N;
  int[] picks = new int[need];
  int cnt=0, guard=0;
  while(cnt<need && guard++<2000){
    int idx = int(random(gridRows*gridCols));
    if(!used[idx]){
      used[idx]=true;
      picks[cnt++]=idx;
    }
  }
  for(int i=0;i<N;i++){
    int a = picks[i];
    int b = picks[N+i];
    int ar=a/gridCols, ac=a%gridCols;
    int br=b/gridCols, bc=b%gridCols;
    endA[i].set( gridToPos(ar,ac) );
    endB[i].set( gridToPos(br,bc) );
  }
  // tangle more by shuffling B ends
  for(int k=0;k<N;k++){
    if(random(1)<0.5){
      int i=int(random(N)), j=int(random(N));
      PVector t=endB[i].copy(); endB[i].set(endB[j]); endB[j].set(t);
    }
  }
}

boolean allRopesHaveAtLeastOneCross(){
  for(int i=0;i<N;i++){
    if(ropeState[i]!=ROPE_ACTIVE) continue;
    boolean ok=false;
    for(int j=0;j<N;j++){
      if(i==j || ropeState[j]!=ROPE_ACTIVE) continue;
      if(segmentsCross(endA[i],endB[i],endA[j],endB[j])){ ok=true; break; }
    }
    if(!ok) return false;
  }
  return true;
}

boolean likelySolvable(){
  // heuristic: at least one rope has a one-move freeing option
  for(int i=0;i<N;i++){
    if(ropeState[i]!=ROPE_ACTIVE) continue;
    if(existsOneMoveToFree(i,0) || existsOneMoveToFree(i,1)) return true;
  }
  return true; // permissive; generation already enforces crossings
}

boolean existsOneMoveToFree(int ropeId,int endIdx){
  for(int r=0;r<gridRows;r++){
    for(int c=0;c<gridCols;c++){
      if(isCellFree(r,c)){
        PVector bakA=endA[ropeId].copy();
        PVector bakB=endB[ropeId].copy();
        if(endIdx==0) endA[ropeId].set(gridToPos(r,c));
        else          endB[ropeId].set(gridToPos(r,c));
        boolean free = ropeBecomesFree(ropeId);
        endA[ropeId].set(bakA);
        endB[ropeId].set(bakB);
        if(free) return true;
      }
    }
  }
  return false;
}

boolean isCellFree(int r,int c){
  PVector p = gridToPos(r,c);
  for(int i=0;i<N;i++){
    if(ropeState[i]==ROPE_REMOVED) continue;
    if(samePos(endA[i],p) || samePos(endB[i],p)) return false;
  }
  return true;
}

// ----- Crossings -----
boolean segmentsCross(PVector p1,PVector p2,PVector q1,PVector q2){
  if (touchingAtEndpoint(p1,p2,q1,q2)) return false;
  float d1 = cross(q1,q2,p1);
  float d2 = cross(q1,q2,p2);
  float d3 = cross(p1,p2,q1);
  float d4 = cross(p1,p2,q2);
  return ((d1>0 && d2<0)||(d1<0 && d2>0)) && ((d3>0 && d4<0)||(d3<0 && d4>0));
}
boolean touchingAtEndpoint(PVector p1,PVector p2,PVector q1,PVector q2){
  return samePos(p1,q1)||samePos(p1,q2)||samePos(p2,q1)||samePos(p2,q2);
}
float cross(PVector a,PVector b,PVector c){
  return (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
}

int totalCrossingsActive(){
  int cnt=0;
  for(int i=0;i<N;i++){
    if(ropeState[i]!=ROPE_ACTIVE) continue;
    for(int j=i+1;j<N;j++){
      if(ropeState[j]!=ROPE_ACTIVE) continue;
      if(segmentsCross(endA[i],endB[i],endA[j],endB[j])) cnt++;
    }
  }
  return cnt;
}

boolean ropeBecomesFree(int i){
  for(int j=0;j<N;j++){
    if(i==j || ropeState[j]!=ROPE_ACTIVE) continue;
    if(segmentsCross(endA[i],endB[i],endA[j],endB[j])) return false;
  }
  return true;
}

void bringRopeToFront(int id){
  int pos=-1;
  for(int k=0;k<N;k++) if(drawOrder[k]==id){ pos=k; break; }
  if(pos<0) return;
  for(int k=pos;k<N-1;k++) drawOrder[k]=drawOrder[k+1];
  drawOrder[N-1]=id;
}

void updateRopes(){
  int now = millis();
  for(int i=0;i<N;i++){
    if(ropeState[i]==ROPE_ACTIVE){
      if(ropeBecomesFree(i)){
        ropeState[i]=ROPE_FADING;
        fadeStartMs[i]=now;
        if(i==editRope){ editRope=-1; editEnd=-1; mode=MODE_SELECT; }
      }
    } else if(ropeState[i]==ROPE_FADING){
      if(now - fadeStartMs[i] > 100){ // fixed 100ms fade
        ropeState[i]=ROPE_REMOVED;
      }
    }
  }
}

boolean isSolved(){
  for(int i=0;i<N;i++) if(ropeState[i]==ROPE_ACTIVE) return false;
  return true;
}

// ----- Selection helpers -----
int[] ropeAtCell(int r,int c){
  PVector p = gridToPos(r,c);
  for(int i=0;i<N;i++){
    if(ropeState[i]==ROPE_REMOVED) continue;
    if(samePos(endA[i],p)) return new int[]{i,0};
    if(samePos(endB[i],p)) return new int[]{i,1};
  }
  return new int[]{-1,-1};
}

void tryMoveSelected(int dr,int dc){
  if(editRope<0 || editEnd<0) return;
  int[] rc = (editEnd==0)? posToCell(endA[editRope]) : posToCell(endB[editRope]);
  int nr = rc[0]+dr, nc = rc[1]+dc;
  if(!cellIn(nr,nc) || !isCellFree(nr,nc)) return;
  PVector tgt = gridToPos(nr,nc);
  if(editEnd==0) endA[editRope].set(tgt);
  else           endB[editRope].set(tgt);
  bringRopeToFront(editRope);
}

// ----- Hint (3 plies + fallback best-first) -----
void activateHint(){
  HintMove m = searchHintUpTo3();
  if(m==null) m = chooseBestGreedyFirstMove(); // fallback
  if(m!=null){
    hintMove = m;
    hintActive = true;
    hintExpireAt = millis() + 2000; // show ~2s
  } else {
    hintMove = null;
    hintActive = false;
  }
}

HintMove searchHintUpTo3(){
  // snapshot
  PVector[] snapA = new PVector[N];
  PVector[] snapB = new PVector[N];
  for(int i=0;i<N;i++){ snapA[i]=endA[i].copy(); snapB[i]=endB[i].copy(); }

  int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};

  for(int i=0;i<N;i++){
    if(ropeState[i]!=ROPE_ACTIVE) continue;
    for(int e=0;e<2;e++){
      int[] rc = (e==0)? posToCell(endA[i]) : posToCell(endB[i]);
      for(int d=0; d<4; d++){
        int nr=rc[0]+dirs[d][0], nc=rc[1]+dirs[d][1];
        if(!cellIn(nr,nc) || !isCellFree(nr,nc)) continue;

        // 1st move
        if(e==0) endA[i].set(gridToPos(nr,nc)); else endB[i].set(gridToPos(nr,nc));
        if(ropeBecomesFree(i)){ restoreSnap(snapA,snapB); return new HintMove(i,e, gridToPos(nr,nc)); }

        // 2nd move
        for(int j=0;j<N;j++){
          if(ropeState[j]!=ROPE_ACTIVE) continue;
          for(int e2=0;e2<2;e2++){
            int[] rc2 = (e2==0)? posToCell(endA[j]) : posToCell(endB[j]);
            for(int d2=0; d2<4; d2++){
              int nr2=rc2[0]+dirs[d2][0], nc2=rc2[1]+dirs[d2][1];
              if(!cellIn(nr2,nc2) || !isCellFree(nr2,nc2)) continue;
              if(e2==0) endA[j].set(gridToPos(nr2,nc2)); else endB[j].set(gridToPos(nr2,nc2));
              if(ropeBecomesFree(j)){ restoreSnap(snapA,snapB); return new HintMove(i,e, gridToPos(nr,nc)); }

              // 3rd move
              for(int m=0;m<N;m++){
                if(ropeState[m]!=ROPE_ACTIVE) continue;
                for(int em=0;em<2;em++){
                  int[] rcm = (em==0)? posToCell(endA[m]) : posToCell(endB[m]);
                  for(int d3=0; d3<4; d3++){
                    int nr3=rcm[0]+dirs[d3][0], nc3=rcm[1]+dirs[d3][1];
                    if(!cellIn(nr3,nc3) || !isCellFree(nr3,nc3)) continue;
                    if(em==0) endA[m].set(gridToPos(nr3,nc3)); else endB[m].set(gridToPos(nr3,nc3));
                    if(ropeBecomesFree(m)){ restoreSnap(snapA,snapB); return new HintMove(i,e, gridToPos(nr,nc)); }
                    // undo 3rd
                    if(em==0) endA[m].set(snapA[m]); else endB[m].set(snapB[m]);
                  }
                }
              }
              // undo 2nd
              if(e2==0) endA[j].set(snapA[j]); else endB[j].set(snapB[j]);
            }
          }
        }
        // undo 1st
        if(e==0) endA[i].set(snapA[i]); else endB[i].set(snapB[i]);
      }
    }
  }
  restoreSnap(snapA,snapB);
  return null;
}

void restoreSnap(PVector[] a,PVector[] b){
  for(int k=0;k<N;k++){ endA[k].set(a[k]); endB[k].set(b[k]); }
}

HintMove chooseBestGreedyFirstMove(){
  int base = totalCrossingsActive();
  int bestDelta = 0; // want negative (reduce crossings)
  HintMove best = null;

  int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
  PVector[] snapA = new PVector[N];
  PVector[] snapB = new PVector[N];
  for(int i=0;i<N;i++){ snapA[i]=endA[i].copy(); snapB[i]=endB[i].copy(); }

  for(int i=0;i<N;i++){
    if(ropeState[i]!=ROPE_ACTIVE) continue;
    for(int e=0;e<2;e++){
      int[] rc = (e==0)? posToCell(endA[i]) : posToCell(endB[i]);
      for(int d=0; d<4; d++){
        int nr=rc[0]+dirs[d][0], nc=rc[1]+dirs[d][1];
        if(!cellIn(nr,nc) || !isCellFree(nr,nc)) continue;
        if(e==0) endA[i].set(gridToPos(nr,nc)); else endB[i].set(gridToPos(nr,nc));
        int now = totalCrossingsActive();
        int delta = now - base; // negative is good
        if(best==null || delta<bestDelta){
          bestDelta = delta;
          best = new HintMove(i,e, gridToPos(nr,nc));
        }
        // undo
        if(e==0) endA[i].set(snapA[i]); else endB[i].set(snapB[i]);
      }
    }
  }
  restoreSnap(snapA,snapB);
  return best;
}
