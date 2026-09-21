import {PacketDecoder} from './controller-input.js';

export class SerialController {
  constructor(serial,onFrame,onStatus){this.serial=serial;this.onFrame=onFrame;this.onStatus=onStatus;this.session=null;this.connecting=false;this.generation=0;}
  async connect(){
    if(this.connecting)return;
    this.connecting=true;const generation=++this.generation;
    try{
      await this.closeSession();
      this.onStatus('choosing','一覧からPicoのデータ用ポートをえらんでください。');
      const port=await this.serial.requestPort();
      if(generation!==this.generation)return;
      await port.open({baudRate:115200,bufferSize:1024});
      if(generation!==this.generation){await port.close();return;}
      try{await port.setSignals({dataTerminalReady:true});}catch{await port.close();throw new Error('DTR unavailable');}
      if(generation!==this.generation){await port.close();return;}
      const session={port,reader:null,done:null,stop:false,received:false};this.session=session;
      this.onStatus('waiting','ポートが開きました。コントローラーからの信号を待っています。');
      session.done=this.read(session);
    }catch(error){
      if(generation===this.generation)this.onStatus(error.name==='NotFoundError'?'idle':'error',error.name==='NotFoundError'?'接続をキャンセルしました。もう一度えらべます。':error.name==='SecurityError'?'この画面ではUSB接続が許可されていません。Chrome／Edgeでゲームを直接開いてください。':'ポートを開けませんでした。Thonnyなど他のアプリを閉じ、USBをつなぎ直してください。');
    }finally{this.connecting=false;}
  }
  async read(session){
    const decoder=new PacketDecoder(),text=new TextDecoder();
    try{
      if(!session.port.readable)throw new Error('No readable stream');
      session.reader=session.port.readable.getReader();
      while(!session.stop){
        const {value,done}=await session.reader.read();if(done)break;
        for(const frame of decoder.push(text.decode(value,{stream:true}))){
          if(session.stop)break;
          if(!session.received){session.received=true;this.onStatus('connected','Picoから操作の信号が届いています。');}
          this.onFrame(frame);
        }
      }
    }catch{
      // A cable removal or read error ends this session; reconnect is an explicit action.
    }finally{
      session.reader?.releaseLock();session.reader=null;
      try{await session.port.close();}catch{}
      if(this.session===session){this.session=null;if(!session.stop)this.onStatus('lost','USB接続が切れました。ケーブルを確かめて、もう一度接続してください。');}
    }
  }
  async closeSession(){
    const session=this.session;if(!session)return;
    session.stop=true;try{await session.reader?.cancel();}catch{}
    await session.done;
  }
  async disconnect(){this.generation++;await this.closeSession();this.onStatus('idle','接続を解除しました。');}
}
