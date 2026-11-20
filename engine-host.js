/* DuoMint 2.3 — ONLY Stockfish 19 full, single-threaded WASM, no Lite fallback.
 * One persistent Worker, one UCI search at a time. Never autoplay a provisional PV.
 * Official engine files must be installed locally in engine/.
 */
'use strict';
const CH='duomint.engine.v1';
const LABEL='Stockfish 19 FULL';
const files=['engine/stockfish-19-single.js','engine/stockfish-19-single.wasm'];
const UCI=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
let worker=null,ready=false,state='uninitialized',pending=null,active=null;
let bootTimer=null,searchTimer=null;
const tell=(type,data={})=>parent.postMessage({channel:CH,type,...data},'*');
const safeUci=value=>typeof value==='string'&&UCI.test(value);
function clearTimers(){if(bootTimer)clearTimeout(bootTimer);if(searchTimer)clearTimeout(searchTimer);bootTimer=searchTimer=null}
function fail(message){
  clearTimers();
  if(worker){try{worker.terminate()}catch(_){}};
  worker=null;ready=false;state='failed';active=null;
  tell('ERROR',{error:message,requestId:pending?.requestId});
  tell('STATUS',{engine:LABEL,error:message});
}
function scoreOf(info,fen){
  const cpMatch=info.match(/\bscore cp (-?\d+)/), mateMatch=info.match(/\bscore mate (-?\d+)/);
  if(!cpMatch&&!mateMatch)return null;
  const color=fen.split(' ')[1]==='w'?1:-1;
  const side=cpMatch?Number(cpMatch[1]):Math.sign(Number(mateMatch[1]))*(900000-Math.abs(Number(mateMatch[1]))*1000);
  return {cp:side*color,scoreSide:side,mate:mateMatch?Number(mateMatch[1])*color:null};
}
function resultOf(a,final=false){
  const best=a.top?.move;
  return {requestId:a.req.requestId,fen:a.req.fen,depth:a.depth||0,
    top:best?[a.top]:[],score:a.top?.cp??0,nodes:a.nodes||0,
    engine:LABEL,mode:'stockfish',final};
}
function beginPending(){
  if(!ready||active||!pending||!worker)return;
  const req=pending;pending=null;
  const depth=Math.max(8,Math.min(22,Number(req.depth)||16));
  // Use a bounded thinking time. Stockfish FULL stays the only engine.
  // Settable from the popup: Turbo 600ms / Equilibrato 1200ms / Preciso 2500ms.
  const thinkMs=[600,1200,2500].includes(Number(req.think_ms))?Number(req.think_ms):1200;
  active={req,depth:0,top:null,nodes:0,canceled:false,stopping:false};
  try{
    worker.postMessage('position fen '+req.fen);
    worker.postMessage('go depth '+depth+' movetime '+thinkMs);
    searchTimer=setTimeout(()=>{
      if(active&&active.req===req&&!active.stopping){
        active.stopping=true;
        tell('STATUS',{engine:LABEL,message:'Analisi oltre il limite: arresto in corso'});
        worker.postMessage('stop');
        searchTimer=setTimeout(()=>{if(active&&active.req===req)fail('Stockfish non risponde al comando stop: ricarica l’estensione.')},7000);
      }
    },thinkMs+7000);
  }catch(e){fail('Comandi Stockfish non inviati: '+(e.message||String(e)))}
}
function onLine(line){
  if(line==='uciok'){
    worker.postMessage('setoption name MultiPV value 1');
    worker.postMessage('setoption name Hash value 32');
    worker.postMessage('setoption name Skill Level value 20');
    worker.postMessage('isready');
    return;
  }
  if(line==='readyok'){
    if(bootTimer)clearTimeout(bootTimer);bootTimer=null;
    ready=true;state='ready';
    tell('STATUS',{engine:LABEL,message:'Stockfish 19 FULL avviato'});
    beginPending();return;
  }
  const a=active;
  if(!a)return;
  if(line.startsWith('info ')&&!a.canceled){
    const move=line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)/)?.[1];
    const depth=Number(line.match(/\bdepth (\d+)/)?.[1]||0);
    const value=scoreOf(line,a.req.fen);
    if(safeUci(move)&&value&&depth>=a.depth){
      a.depth=depth;a.top={move,...value};a.nodes=Number(line.match(/\bnodes (\d+)/)?.[1]||0);
      tell('RESULT',resultOf(a,false));
    }
    return;
  }
  if(line.startsWith('bestmove ')){
    if(searchTimer)clearTimeout(searchTimer);searchTimer=null;
    const move=line.split(/\s+/)[1];
    const shouldEmit=!a.canceled;
    if(shouldEmit&&safeUci(move)){
      if(!a.top||a.top.move!==move)a.top={move,cp:a.top?.cp??0,scoreSide:a.top?.scoreSide??0,mate:null};
      tell('RESULT',resultOf(a,true));
    }else if(shouldEmit){
      tell('ERROR',{requestId:a.req.requestId,error:'Stockfish non ha restituito una mossa valida.'});
    }
    active=null;
    beginPending();
  }
}
function onOutput(event){
  const str=String(event.data??'');
  for(const line of str.split(/[\r\n]+/)){if(line){try{onLine(line.trim())}catch(e){fail('Errore UCI: '+(e.message||String(e)));return;}}}
}
async function boot(){
  if(state!=='uninitialized')return;
  state='checking';
  tell('STATUS',{engine:LABEL,message:'Verifica file Stockfish 19 FULL'});
  try{
    const checks=await Promise.all(files.map(f=>fetch(f,{method:'HEAD',cache:'no-store'})));
    if(checks.some(x=>!x.ok)){
      fail('File di Stockfish mancanti. Estrai di nuovo la cartella completa di OscarKings e ricarica l’estensione.');
      return;
    }
    state='booting';
    worker=new Worker(files[0]);
    worker.onmessage=onOutput;
    worker.onerror=e=>fail('Errore Worker Stockfish: '+(e.message||'controlla i file scaricati'));
    worker.onmessageerror=()=>fail('Dati del Worker Stockfish non leggibili');
    bootTimer=setTimeout(()=>fail('Stockfish non si avvia: verifica i file FULL o prova a ricaricare l’estensione.'),65000);
    worker.postMessage('uci');
  }catch(e){fail('Impossibile avviare Stockfish: '+(e.message||String(e)))}
}
function analyze(req){
  if(typeof req.fen!=='string'||req.fen.length>150)return;
  pending=req;
  if(state==='failed'){
    tell('ERROR',{requestId:req.requestId,error:'Stockfish non disponibile: verifica i file nella cartella engine e ricarica l’estensione.'});
    return;
  }
  if(active){
    active.canceled=true;
    if(!active.stopping){
      active.stopping=true;
      try{worker.postMessage('stop')}catch(e){fail('Stop Stockfish fallito: '+e.message)}
    }
  }else beginPending();
  if(state==='uninitialized')boot();
}
window.addEventListener('message',e=>{
  if(e.source!==parent)return;
  const msg=e.data||{};
  if(msg.channel===CH&&msg.type==='ANALYZE')analyze(msg);
});
tell('READY');
