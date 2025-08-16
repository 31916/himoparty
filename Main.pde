// ===== Main.pde =====
// Global state & scene flow

final int W = 960, H = 720;

// Game states
static final int STATE_HOME   = 0;
static final int STATE_STAGE  = 1;
static final int STATE_PLAY   = 2;
static final int STATE_CLEAR  = 3;
int state = STATE_HOME;

// In-game modes
static final int MODE_SELECT = 0; // selecting buttons / endpoints
static final int MODE_EDIT   = 1; // moving a chosen endpoint
int mode = MODE_SELECT;

// Players
int activePlayers = 1;

// Stage info
int currentStage = 1;
int stageStartMillis = 0;
int clearTimeMillis  = 0;

// Stage records (1..20 + extras A,B,C=21..23)
int[] bestMs = new int[24]; // -1 = not cleared
{
  for (int i=0;i<24;i++) bestMs[i] = -1;
}

// --- Play cursor state (shared with Render/Input) ---
int playFocusRow = 0;    // 0: top buttons, 1: grid
int playTopIndex = 0;    // 0: Retry, 1: Quit, 2: Hint
int gridCurR = 0, gridCurC = 0;

int editRope = -1;       // selected rope in EDIT
int editEnd  = -1;       // 0=A, 1=B

// --- Home/Stage cursors (used by HomeScreen/Input) ---
int homeRow = 0;         // 0: numbers row, 1: bottom buttons
int homeSelPlayers = 1;  // 1..4
int homeButton = 0;      // 0: Start, 1: Exit

int stageFocusRow = 0;   // 0: stage grid, 1: back button
int stageCursor = 1;     // current stage highlight (1..20) (+extras handled in HomeScreen)

// Fonts
PFont uiFont;

void settings(){ size(W, H); smooth(4); }

void setup(){
  frameRate(60);
  uiFont = createFont("SansSerif", 18, true);
  textFont(uiFont);
  textAlign(CENTER, CENTER);
  initHomeScreen();
  initInput();
}

void draw(){
  background(10);
  drawGrid();

  if(state == STATE_HOME){
    drawHome();
  } else if(state == STATE_STAGE){
    drawStageSelect();
  } else if(state == STATE_PLAY){
    updateRopes();          // fade & removal (100ms)
    drawScene();            // ropes + points + endpoints + cursors
    drawTopButtons();       // Retry / Quit / Hint (with focus)
    drawPlayHUD();          // bottom HUD (JP text)
    drawTimer();            // top-right timer
    drawHintEffect();       // blinking hint (endpoint & target)
    if(isSolved()){
      clearTimeMillis = millis() - stageStartMillis;
      // update stars/time record
      if(bestMs[currentStage-1] < 0 || clearTimeMillis < bestMs[currentStage-1]){
        bestMs[currentStage-1] = clearTimeMillis;
      }
      state = STATE_CLEAR;
    }
  } else if(state == STATE_CLEAR){
    drawScene();
    drawTopButtons();
    drawClearBanner();
    drawTimer();
  }
}

// --- Scene transitions ---
void startGameWithPlayers(int nPlayers){
  activePlayers = constrain(nPlayers, 1, 4);
  state = STATE_STAGE;
  stageFocusRow = 0;
  stageCursor = max(1, min(stageCursor, 20));
}

void startStage(int n){
  currentStage = n;
  generateStage(n);      // GameLogic: build grid + ropes with constraints
  // reset cursors
  playFocusRow = 0;
  playTopIndex = 0;
  gridCurR = 0; gridCurC = 0;
  editRope = -1; editEnd = -1;
  // timers
  stageStartMillis = millis();
  clearTimeMillis  = 0;
  state = STATE_PLAY;
  mode = MODE_SELECT;
  // stop hint
  hintActive = false;
  hintMove = null;
}

void returnToStageSelect(){
  // go to stage select (not home)
  state = STATE_STAGE;
  mode = MODE_SELECT;
  editRope = -1; editEnd = -1;
  hintActive = false;
  hintMove = null;
}

void returnToHome(){
  state = STATE_HOME;
  mode = MODE_SELECT;
  editRope = -1; editEnd = -1;
  hintActive = false;
  hintMove = null;
}
