// ===== InputHandler.pde =====
// UDP (per-port players) + keyboard debug -> unified handlers

import hypermedia.net.*;

UDP udp1, udp2, udp3, udp4;

// === 前回入力状態の保存用 ===
int prevBtnA = 0;
int prevBtnB = 0;
int prevSw   = 0;

boolean prevLeft  = false;
boolean prevRight = false;
boolean prevUp    = false;
boolean prevDown  = false;


void initInput(){
  udp1 = new UDP(this, 5005); udp1.listen(true);
  udp2 = new UDP(this, 6006); udp2.listen(true);
  udp3 = new UDP(this, 7007); udp3.listen(true);
  udp4 = new UDP(this, 8008); udp4.listen(true);
}


void receive(byte[] data, String ip, int port){
  String msg = new String(data);
  String[] t = split(msg, ",");
  if(t==null || t.length<5) return;

  float axisX = float(t[0]);
  float axisY = float(t[1]);
  int swVal = int(t[2]);
  int btnA  = int(t[3]);
  int btnB  = int(t[4]);

  int pid = portToPlayer(port);
  if(pid<1 || pid>4) pid = 1;

  float DEADZONE = 0.3;
  boolean left  = (axisX <  DEADZONE);
  boolean right = (axisX > -DEADZONE);
  boolean up    = (axisY <  DEADZONE);
  boolean down  = (axisY > -DEADZONE);

  // --- ボタンは押した瞬間だけ反応 ---
  if((btnA==1 && prevBtnA==0) || (swVal==1 && prevSw==0)) onA(pid);
  if(btnB==1 && prevBtnB==0) onB(pid);

  // --- スティック方向も「押された瞬間」だけ反応 ---
  if(left && !prevLeft)   onLeft(pid);
  if(right && !prevRight) onRight(pid);
  if(up && !prevUp)       onUp(pid);
  if(down && !prevDown)   onDown(pid);

  // 状態を保存
  prevBtnA = btnA;
  prevBtnB = btnB;
  prevSw   = swVal;

  prevLeft = left;
  prevRight = right;
  prevUp = up;
  prevDown = down;
}


int portToPlayer(int port){
  if(port==5005) return 1;
  if(port==6006) return 2;
  if(port==7007) return 3;
  if(port==8008) return 4;
  return 1;
}

// --- Debug keyboard (as P1) ---
void keyPressed(){
  int pid = 1;
  if(key=='a'||key=='A') onA(pid);
  if(key=='b'||key=='B') onB(pid);
  if(keyCode==LEFT)  onLeft(pid);
  if(keyCode==RIGHT) onRight(pid);
  if(keyCode==UP)    onUp(pid);
  if(keyCode==DOWN)  onDown(pid);
}

// ===== Unified handlers =====
void onA(int pid){
  if(state==STATE_HOME){
    if(homeRow==1){
      if(homeButton==0){ startGameWithPlayers(homeSelPlayers); }
      else { exit(); }
    }
  } else if(state==STATE_STAGE){
    if(stageFocusRow==0){
      startStage(stageCursor);
    } else { // focus on "戻る"
      returnToHome();
    }
  } else if(state==STATE_PLAY){
    if(playFocusRow==0){
      if(playTopIndex==0){ startStage(currentStage); }      // Retry
      else if(playTopIndex==1){ returnToStageSelect(); }    // Quit -> Stage Select
      else if(playTopIndex==2){ activateHint(); }           // Hint (shared)
    } else {
      int[] hit = ropeAtCell(gridCurR,gridCurC);
      if(mode==MODE_SELECT){
        if(hit[0]>=0){
          editRope = hit[0]; editEnd = hit[1]; mode=MODE_EDIT;
        }
      } else if(mode==MODE_EDIT){
        // A again => cancel edit
        mode=MODE_SELECT; editRope=-1; editEnd=-1;
      }
    }
  } else if(state==STATE_CLEAR){
    // A: next stage (or back to select when >=20)
    if(currentStage < 20) startStage(currentStage+1);
    else returnToStageSelect();
  }
}

void onB(int pid){
  if(state==STATE_HOME){
    if(homeRow==1 && homeButton==1) exit();
  } else if(state==STATE_STAGE){
    // Bは無効（「戻る」はボタンにAで実行）
  } else if(state==STATE_PLAY){
    if(mode==MODE_EDIT){
      mode=MODE_SELECT; editRope=-1; editEnd=-1;
    } else {
      returnToStageSelect();
    }
  } else if(state==STATE_CLEAR){
    returnToStageSelect();
  }
}

void onLeft(int pid){
  if(state==STATE_HOME){
    if(homeRow==0) homeSelPlayers = max(1, homeSelPlayers-1);
    else           homeButton = max(0, homeButton-1);
  } else if(state==STATE_STAGE){
    if(stageFocusRow==0){
      boolean extras = allMainCleared();
      int maxId = extras? 23 : 20;
      stageCursor = max(1, stageCursor - 1);
      if(stageCursor > maxId) stageCursor = maxId;
    }
  } else if(state==STATE_PLAY){
    if(mode==MODE_SELECT){
      if(playFocusRow==0) playTopIndex = max(0, playTopIndex-1);
      else { gridCurC = max(0, gridCurC-1); }
    } else if(mode==MODE_EDIT){
      tryMoveSelected(0,-1);
    }
  }
}

void onRight(int pid){
  if(state==STATE_HOME){
    if(homeRow==0) homeSelPlayers = min(4, homeSelPlayers+1);
    else           homeButton = min(1, homeButton+1);
  } else if(state==STATE_STAGE){
    if(stageFocusRow==0){
      boolean extras = allMainCleared();
      int maxId = extras? 23 : 20;
      stageCursor = min(maxId, stageCursor + 1);
    }
  } else if(state==STATE_PLAY){
    if(mode==MODE_SELECT){
      if(playFocusRow==0) playTopIndex = min(2, playTopIndex+1);
      else { gridCurC = min(gridCols-1, gridCurC+1); }
    } else if(mode==MODE_EDIT){
      tryMoveSelected(0, +1);
    }
  }
}

void onUp(int pid){
  if(state==STATE_HOME){
    homeRow = 0;
  } else if(state==STATE_STAGE){
    if(stageFocusRow==1){
      stageFocusRow = 0; // back to grid
    } else {
      // grid up
      if(stageCursor>20 && allMainCleared()){
        stageCursor = 18; // jump from extras to last grid row center
      } else {
        stageCursor = max(1, stageCursor-5);
      }
    }
  } else if(state==STATE_PLAY){
    if(mode==MODE_SELECT){
      if(playFocusRow==1){
        // move inside grid first; if already top row, then go to top buttons
        if(gridCurR>0) gridCurR--;
        else playFocusRow=0;
      } else {
        // already on top buttons -> do nothing
      }
    } else if(mode==MODE_EDIT){
      tryMoveSelected(-1,0);
    }
  }
}

void onDown(int pid){
  if(state==STATE_HOME){
    homeRow = 1;
  } else if(state==STATE_STAGE){
    if(stageFocusRow==0){
      if(stageCursor<=15) stageCursor = min(20, stageCursor+5);
      else if(allMainCleared()) stageCursor = 22; // into extras
      else stageFocusRow = 1; // to "戻る"
      if(stageCursor>20) stageFocusRow = 1; // extras -> go to "戻る"
    }
  } else if(state==STATE_PLAY){
    if(mode==MODE_SELECT){
      if(playFocusRow==0){
        playFocusRow=1; // go to grid
      } else {
        // move inside grid down
        gridCurR = min(gridRows-1, gridCurR+1);
      }
    } else if(mode==MODE_EDIT){
      tryMoveSelected(+1,0);
    }
  }
}
