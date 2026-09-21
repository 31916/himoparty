export const NEUTRAL = Object.freeze({x:0,y:0,a:false,b:false});

// USB data uses an explicit marker so a console/logging port is never treated as a controller.
export function parsePacket(line) {
  const parts=line.trim().split(',');
  if(parts.length!==6||parts[0]!=='HIMO1')return null;
  if(parts.slice(1,3).some(s=>!/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(s)))return null;
  const [x,y]=parts.slice(1,3).map(Number);
  if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x)>1||Math.abs(y)>1)return null;
  if(parts.slice(3).some(s=>s!=='0'&&s!=='1'))return null;
  return {x,y,a:parts[3]==='1'||parts[4]==='1',b:parts[5]==='1'};
}

export class PacketDecoder {
  buffer=''; dropping=false;
  push(text) {
    const frames=[];
    for(const char of text){
      if(char==='\n'){
        if(!this.dropping){const frame=parsePacket(this.buffer);if(frame)frames.push(frame);}
        this.buffer='';this.dropping=false;
      }else if(!this.dropping){
        this.buffer+=char;
        if(this.buffer.length>160){this.buffer='';this.dropping=true;}
      }
    }
    return frames;
  }
}

export function gamepadFrame(pad) {
  const pressed=i=>!!pad.buttons?.[i]?.pressed;
  let x=Number(pad.axes?.[0])||0,y=Number(pad.axes?.[1])||0;
  if(pad.mapping==='standard'){
    if(pressed(14)||pressed(15))x=Number(pressed(15))-Number(pressed(14));
    if(pressed(12)||pressed(13))y=Number(pressed(13))-Number(pressed(12));
  }
  return {x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),a:pressed(0),b:pressed(1)};
}

export function adjustFrame(frame,settings={}){
  const clamp=n=>Math.max(-1,Math.min(1,n));
  return {...frame,x:clamp((frame.x-(settings.centerX||0))*(settings.invertX?-1:1)),y:clamp((frame.y-(settings.centerY||0))*(settings.invertY?-1:1))};
}

export class InputEdges {
  constructor(){this.reset();}
  reset(){this.armed=false;this.neutralSince=null;this.direction=null;this.nextRepeat=0;this.previous={a:false,b:false};}
  update(frame,now) {
    const events=[];
    if(!this.armed){
      if(Math.abs(frame.x)<=.28&&Math.abs(frame.y)<=.28&&!frame.a&&!frame.b){
        this.neutralSince??=now;if(now-this.neutralSince>=250)this.armed=true;
      }else{this.neutralSince=null;}
      return events;
    }
    // Hysteresis avoids jitter near the threshold; only the dominant axis moves.
    let direction=null;
    if(Math.max(Math.abs(frame.x),Math.abs(frame.y))>=.55){
      direction=Math.abs(frame.x)>=Math.abs(frame.y)?(frame.x<0?'left':'right'):(frame.y<0?'up':'down');
    }else if(this.direction){
      const value={left:-frame.x,right:frame.x,up:-frame.y,down:frame.y}[this.direction];
      if(value>.28)direction=this.direction;
    }
    if(direction!==this.direction){this.direction=direction;this.nextRepeat=now+480;if(direction)events.push(direction);}
    else if(direction&&now>=this.nextRepeat){events.push(direction);this.nextRepeat=now+220;}
    // Confirm and cancel never repeat while held. Cancel takes precedence.
    if(frame.b&&!this.previous.b)events.push('b');
    else if(frame.a&&!this.previous.a)events.push('a');
    this.previous={a:frame.a,b:frame.b};
    return events;
  }
}
