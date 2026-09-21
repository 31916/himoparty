import test from 'node:test';
import assert from 'node:assert/strict';
import {NEUTRAL,parsePacket,PacketDecoder,InputEdges,adjustFrame,gamepadFrame} from '../src/controller-input.js';
import {SerialController} from '../src/serial-controller.js';

const frame=changes=>({...NEUTRAL,...changes});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function armed(){const input=new InputEdges();input.update(NEUTRAL,0);input.update(NEUTRAL,250);assert.equal(input.armed,true);return input;}

test('only marked, bounded USB packets are accepted; stick press also confirms',()=>{
  assert.deepEqual(parsePacket('HIMO1,-1,0.125,0,1,0'),frame({x:-1,y:.125,a:true}));
  assert.deepEqual(parsePacket('HIMO1,0,0,1,0,1'),frame({a:true,b:true}));
  for(const value of ['0,0,1,1,1','HIMO1,NaN,0,0,0,0','HIMO1,Infinity,0,0,0,0','HIMO1,1.01,0,0,0,0','HIMO1,,0,0,0,0','HIMO1,0,0,2,0,0','HIMO1,0,0,true,0,0','HIMO1,0,0,0,0,0,0','Traceback: HIMO1,0,0,0,0,0'])assert.equal(parsePacket(value),null,value);
});
test('chunked serial records, CRLF, invalid data and oversized lines recover at newline',()=>{
  const decoder=new PacketDecoder();
  assert.deepEqual(decoder.push('log\nHIMO1,0.5,'),[]);
  assert.deepEqual(decoder.push('-0.2,0,0,1\r\nHIMO1,0,0,0,0,0\n'),[frame({x:.5,y:-.2,b:true}),frame()]);
  assert.deepEqual(decoder.push('x'.repeat(10000)+'HIMO1,0,0,0,0,0'),[]);
  assert.ok(decoder.buffer.length<=160);
  assert.deepEqual(decoder.push('\nHIMO1,0,0,0,1,0\n'),[frame({a:true})]);
});
test('new connections and resets require 250ms with stick centered and buttons released',()=>{
  const input=new InputEdges();
  for(const now of [0,100,1000])assert.deepEqual(input.update(frame({x:1,a:true}),now),[]);
  input.update(NEUTRAL,1100);input.update(NEUTRAL,1349);assert.equal(input.armed,false);
  input.update(frame({b:true}),1350);input.update(NEUTRAL,1500);input.update(NEUTRAL,1750);assert.equal(input.armed,true);
  assert.deepEqual(input.update(frame({a:true}),1800),['a']);
  input.reset();assert.deepEqual(input.update(frame({a:true}),1900),[]);assert.equal(input.armed,false);
});
test('direction threshold, hysteresis, dominant axis and bounded key repeat avoid jitter',()=>{
  const input=armed();
  assert.deepEqual(input.update(frame({x:.54}),300),[]);
  assert.deepEqual(input.update(frame({x:.7,y:.6}),320),['right']);
  assert.deepEqual(input.update(frame({x:.4}),790),[]);assert.equal(input.direction,'right');
  assert.deepEqual(input.update(frame({x:.4}),800),['right']);
  assert.deepEqual(input.update(frame({x:.4}),1019),[]);
  assert.deepEqual(input.update(frame({x:.4}),1020),['right']);
  assert.deepEqual(input.update(frame({x:.2}),1040),[]);assert.equal(input.direction,null);
  assert.deepEqual(input.update(frame({y:-.8}),1100),['up']);
  assert.deepEqual(input.update(frame({y:-.8}),10000),['up']); // no queued burst after a pause
});
test('confirm/cancel trigger on press edges only, with cancel taking priority',()=>{
  const input=armed();
  assert.deepEqual(input.update(frame({a:true}),300),['a']);
  assert.deepEqual(input.update(frame({a:true}),1000),[]);
  input.update(NEUTRAL,1010);assert.deepEqual(input.update(frame({a:true,b:true}),1020),['b']);
  assert.deepEqual(input.update(frame({a:true}),1030),[]);
  input.update(NEUTRAL,1040);assert.deepEqual(input.update(frame({b:true}),1050),['b']);
});
test('center offsets and reversed axes preserve buttons and clamp stick range',()=>{
  assert.deepEqual(adjustFrame(frame({x:.15,y:-.12,a:true}),{centerX:.15,centerY:-.12}),frame({a:true}));
  assert.deepEqual(adjustFrame(frame({x:-1,y:.8}),{centerX:.2,invertX:true,invertY:true}),frame({x:1,y:-.8}));
});
test('gamepad adapter accepts standard D-pad, sparse devices and nonstandard analog axes',()=>{
  const buttons=Array.from({length:16},()=>({pressed:false}));buttons[12].pressed=true;buttons[15].pressed=true;buttons[0].pressed=true;
  assert.deepEqual(gamepadFrame({mapping:'standard',axes:[0,0],buttons}),frame({x:1,y:-1,a:true}));
  assert.deepEqual(gamepadFrame({mapping:'',axes:[-.7,.3],buttons}),frame({x:-.7,y:.3,a:true}));
  assert.deepEqual(gamepadFrame({}),frame());
});

function mockPort(){
  let controller;const calls=[];
  const readable=new ReadableStream({start:c=>controller=c,cancel:()=>calls.push('cancel')});
  const port={readable,open:async options=>calls.push(['open',options]),setSignals:async signals=>calls.push(['signals',signals]),close:async()=>{assert.equal(readable.locked,false);calls.push('close');}};
  return {port,calls,send:text=>controller.enqueue(new TextEncoder().encode(text)),unplug:()=>controller.error(new Error('unplugged'))};
}
test('serial opens with DTR, waits for valid data, streams split records and releases on disconnect',async()=>{
  const mock=mockPort(),frames=[],statuses=[];
  let requested=0;
  const serial=new SerialController({requestPort:async()=>{requested++;return mock.port;}},f=>frames.push(f),s=>statuses.push(s));
  assert.equal(requested,0);await serial.connect();assert.equal(requested,1);
  assert.deepEqual(mock.calls.slice(0,2),[['open',{baudRate:115200,bufferSize:1024}],['signals',{dataTerminalReady:true}]]);
  mock.send('CircuitPython console\n0,0,1,1,1\n');await flush();assert.deepEqual(statuses,['choosing','waiting']);
  mock.send('HIMO1,0,');mock.send('0,0,1,0\nHIMO1,-1,0,0,0,0\n');await flush();
  assert.deepEqual(frames,[frame({a:true}),frame({x:-1})]);assert.equal(statuses.at(-1),'connected');
  await serial.disconnect();assert.equal(serial.session,null);assert.equal(statuses.at(-1),'idle');assert.deepEqual(mock.calls.slice(-2),['cancel','close']);
});
test('unexpected cable loss closes the port and reports lost, then a new port can connect',async()=>{
  const first=mockPort(),second=mockPort(),statuses=[];let next=first;
  const serial=new SerialController({requestPort:async()=>next.port},()=>{},s=>statuses.push(s));
  await serial.connect();first.send('HIMO1,0,0,0,0,0\n');await flush();first.unplug();await flush();
  assert.equal(serial.session,null);assert.equal(statuses.at(-1),'lost');assert.equal(first.calls.at(-1),'close');
  next=second;await serial.connect();second.send('HIMO1,0,0,0,0,0\n');await flush();assert.equal(statuses.at(-1),'connected');await serial.disconnect();
});
test('cancelled permission and busy ports do not claim a connection',async()=>{
  for(const [errorName,expected] of [['NotFoundError','idle'],['NetworkError','error'],['SecurityError','error']]){
    const statuses=[];const error=Object.assign(new Error('rejected'),{name:errorName});
    const serial=new SerialController({requestPort:async()=>{throw error;}},()=>assert.fail(),s=>statuses.push(s));
    await serial.connect();assert.equal(serial.session,null);assert.equal(serial.connecting,false);assert.equal(statuses.at(-1),expected);
  }
});
test('disconnect during the permission picker prevents a late selection from opening',async()=>{
  const mock=mockPort(),statuses=[];let select;
  const serial=new SerialController({requestPort:()=>new Promise(resolve=>select=resolve)},()=>assert.fail(),s=>statuses.push(s));
  const connecting=serial.connect();await flush();await serial.disconnect();select(mock.port);await connecting;
  assert.deepEqual(mock.calls,[]);assert.equal(serial.session,null);assert.equal(statuses.at(-1),'idle');
});
test('DTR failure closes the opened port rather than waiting forever without CircuitPython data',async()=>{
  const mock=mockPort(),statuses=[];mock.port.setSignals=async()=>{throw new Error('unavailable');};
  const serial=new SerialController({requestPort:async()=>mock.port},()=>assert.fail(),s=>statuses.push(s));
  await serial.connect();assert.equal(mock.calls.at(-1),'close');assert.equal(statuses.at(-1),'error');assert.equal(serial.session,null);
});
