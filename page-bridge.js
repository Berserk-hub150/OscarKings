/* Runs in Duolingo's MAIN world solely to access the live chess React state.
 * No internal data leaves the tab. No scripts or network requests are injected.
 */
(()=>{
'use strict';
if(window.__duomintPageBridge)return;
window.__duomintPageBridge=true;
const CHANNEL='duomint.v1';
const isFen=value=>typeof value==='string'&&/^([prnbqkPRNBQK1-8]+\/){7}[prnbqkPRNBQK1-8]+ [wb] /.test(value.trim());
const isUci=s=>typeof s==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(s);
const matchPaths=['/chess-match','/chess-matches','/chess-pvp-session'];
function isPvp(){
 if(/chess[-_/]pvp|pvp[-_/]session|chess[-_/]friend/i.test(location.pathname))return true;
 return ['friend','anyone'].some(m=>[...document.querySelectorAll('[data-test="chess-match-button-'+m+'"]')].some(b=>b.getAttribute('aria-pressed')==='true'));
}
function canvas(){
 const known=document.querySelector('canvas._3Lbq0');if(known)return known;
 return [...document.querySelectorAll('canvas')].filter(c=>{
   const r=c.getBoundingClientRect();return r.width>220&&Math.abs(r.width-r.height)<20&&c.width>250;
 }).sort((a,b)=>b.clientWidth-a.clientWidth)[0]||null;
}
// Best-effort orientation detection when Duolingo does not expose playerColor.
// At the opening, the physical top-left and bottom-left squares contain rooks.
// Both squares have different piece colors; sample piece centers on the actual
// canvas rather than assuming the player always uses White.
function canvasOrientation(board){
 try{
  if(!board||typeof board.getContext!=='function')return null;
  const ctx=board.getContext('2d');
  if(!ctx||typeof ctx.getImageData!=='function'||board.width<160||board.height<160)return null;
  function sample(x,y){
   const cx=Math.round(x),cy=Math.round(y),data=ctx.getImageData(cx,cy,1,1).data;
   if(data[3]<180)return null;
   return (data[0]*.2126+data[1]*.7152+data[2]*.0722);
  }
  const top=sample(board.width/16,board.height/16);
  const bottom=sample(board.width/16,board.height*15/16);
  if(top===null||bottom===null||Math.abs(top-bottom)<35)return null;
  return top>bottom?'black':'white';
 }catch(_){return null;}
}
function hookValues(f){const list=[];
 try{for(let h=f.memoizedState,j=0;h&&j++<100;h=h.next)list.push(h.memoizedState?.current??h.memoizedState)}catch(e){}
 return list;
}
function isController(o){return !!o&&typeof o==='object'&&typeof o.makeMove==='function'&&(typeof o.observeGameState==='function'||typeof o.updateUserInteraction==='function'||typeof o.makeMoveAndClearSelection==='function'||!!o.gameState)}
function live(){
 const board=canvas();if(!board)return null;
 const fiberKey=Object.keys(board).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));
 const chain=[];let root=fiberKey?board[fiberKey]:null;
 for(let i=0;root&&i<150;i++,root=root.return){chain.push(root);if(root.alternate)chain.push(root.alternate)}
 let best=null,controller=null,detectedLesson=false,props=null;
 for(const f of chain){
  const hooks=hookValues(f), fp=f.memoizedProps||{};
  if(fp.challenge?.chessPuzzleInfo)detectedLesson=true;
  if(!controller)controller=hooks.find(isController)||null;
  const fenHooks=hooks.map((v,index)=>({v,index})).filter(x=>isFen(x.v));
  const runtime=hooks.find(v=>v&&typeof v==='object'&&isFen(v.boardFen)&&Array.isArray(v.moveHistory));
  const fen=fenHooks[0]?.v||(runtime?.boardFen||null);
  if(!fen)continue;
  const score=(fp.challenge?.chessPuzzleInfo?50:0)+(fp.challenge?.match?45:0)+(runtime?20:0)+(fenHooks.length?15:0);
  if(!best||score>best.score){
   const fenIndex=fenHooks[0]?.index??-1;
   const possibleMoves=hooks[fenIndex-1];
   const otherMoves=hooks.find(v=>Array.isArray(v)&&v.every(isUci));
   const rawMoves=(Array.isArray(possibleMoves)&&possibleMoves.every(isUci)?possibleMoves:otherMoves)||runtime?.moveHistory||[];
   best={score,fen,fp,moves:rawMoves,controller,fn:f,detectedLesson};
  }
 }
 if(!best)return null;
 if(!best.controller)best.controller=controller;
 const challenge=best.fp.challenge||chain.map(f=>f.memoizedProps?.challenge).find(Boolean)||{};
 const context=challenge.match||best.fp.match||challenge.chessPuzzleInfo||challenge;
 const type=detectedLesson&&!matchPaths.some(p=>location.pathname.endsWith(p))?'lesson':'match';
 // sideToMove is the current turn; it is NOT the player's board orientation.
 const norm=v=>v==='b'?'black':v==='w'?'white':v;
 const color=[context?.playerColor,context?.orientation,best.fp?.playerColor,challenge?.playerColor,best.fp?.orientation].map(norm).find(v=>v==='black'||v==='white');
 const flipped=[context?.isFlipped,context?.boardFlipped,best.fp?.isFlipped].find(v=>typeof v==='boolean');
 const orientation=color||(typeof flipped==='boolean'?(flipped?'black':'white'):canvasOrientation(board))||'white';
 const history=Array.isArray(best.moves)?best.moves.filter(isUci):[];
 const pathSource=best.fp.resetDependency??challenge.chessPuzzleInfo?.validPaths??challenge.chessPuzzleInfo?.correctMoves??best.fp.validPaths??[];
 const solution=parseSolutions(pathSource,history);
 const r=board.getBoundingClientRect();
 return {fen:best.fen,moves:history,orientation,type,pvp:isPvp(),solution,rect:{x:r.left,y:r.top,width:r.width,height:r.height},canMove:!!best.controller,canvasClickAllowed:true};
}
function parseSolutions(source,history){
 const candidates=[];
 const visit=(value,depth=0)=>{
  if(depth>4||!value)return;
  if(typeof value==='string'){
   const seq=value.trim().split(/[\s,]+/).filter(isUci);
   if(seq.length)candidates.push(seq);
  }else if(Array.isArray(value)){
   if(value.every(isUci)&&value.length)candidates.push(value);
   else for(const v of value.slice(0,30))visit(v,depth+1);
  }else if(typeof value==='object'){
   for(const k of ['moves','line','paths','path','correctMoves','validPaths','solution'])if(value[k])visit(value[k],depth+1);
  }
 };
 visit(source);
 // Only use a move if the known history is a prefix of a complete solution.
 for(const seq of candidates){if(history.length<seq.length&&history.every((m,i)=>seq[i]===m))return seq[history.length]}
 return null;
}
function getController(){
 const board=canvas();if(!board)return null;
 const key=Object.keys(board).find(k=>k.startsWith('__reactFiber$')||k.startsWith('__reactInternalInstance$'));
 for(let f=key?board[key]:null,j=0;f&&j++<150;f=f.return){
  const x=hookValues(f).find(isController)||hookValues(f.alternate||{}).find(isController);
  if(x)return x;
 }
 return null;
}
function getGameState(controller){
 const seen=new Set(),queue=[{v:controller,d:0}];
 for(let n=0;queue.length&&n<260;n++){
  const {v,d}=queue.shift();if(!v||(typeof v!=='object'&&typeof v!=='function')||seen.has(v))continue;seen.add(v);
  try{
   if(typeof v.getValidMoveFromString==='function')return v;
   if(typeof v.g2==='function'){
    const g=v.g2();if(g&&typeof g.getValidMoveFromString==='function')return g;
   }
   if(d<4)for(const child of Object.values(v).slice(0,55))if(child&&(typeof child==='object'||typeof child==='function'))queue.push({v:child,d:d+1});
  }catch(_){}
 }
 return null;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function changedFen(fen,ms=1400){
 for(let t=0;t<ms;t+=140){await pause(140);try{const s=live();if(s?.fen&&s.fen!==fen)return true}catch(_){}}
 return false;
}
function squareClick(board,square,color){
 const file='abcdefgh'.indexOf(square[0]),rank=8-Number(square[1]);
 if(file<0||rank<0||rank>7)throw Error('Casella non valida');
 const r=board.getBoundingClientRect();if(r.width<200||Math.abs(r.width-r.height)>25)throw Error('Dimensioni scacchiera inattese');
 const column=color==='black'?7-file:file, row=color==='black'?7-rank:rank;
 const x=r.left+(column+0.5)*r.width/8,y=r.top+(row+0.5)*r.height/8;
 const props={bubbles:true,cancelable:true,composed:true,clientX:x,clientY:y,button:0};
 for(const [type,down] of [['pointerdown',true],['mousedown',true],['pointerup',false],['mouseup',false],['click',false]]){
  const Cls=type.startsWith('pointer')&&typeof PointerEvent!=='undefined'?PointerEvent:MouseEvent;
  board.dispatchEvent(new Cls(type,{...props,buttons:down?1:0,pointerType:'mouse',isPrimary:true}));
 }
}
async function canvasMove(uci,color){
 const board=canvas();if(!board)throw Error('Canvas Duolingo non trovato');
 squareClick(board,uci.slice(0,2),color);await pause(130);squareClick(board,uci.slice(2,4),color);
}
function respond(type,requestId,payload){window.postMessage({channel:CHANNEL,origin:'page',type,requestId,...payload},location.origin)}
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 const q=event.data;
 if(q?.channel!==CHANNEL||q.origin!=='extension')return;
 if(q.type==='SNAPSHOT'){
  try{respond('SNAPSHOT',q.requestId,{snapshot:live()})}catch(e){respond('ERROR',q.requestId,{error:String(e.message||e)})}
 }
 if(q.type==='MOVE'){
  (async()=>{
   try{
    if(isPvp())throw Error('Auto-move non disponibile in PvP');
    if(!isUci(q.uci))throw Error('Mossa UCI non valida');
    const s=live();if(!s||s.fen!==q.expectedFen)throw Error('Posizione cambiata: annullata la mossa');
    const color=q.playerColor==='black'||q.playerColor==='white'?q.playerColor:s.orientation;
    if(s.type==='match'&&color[0]!==s.fen.split(' ')[1])throw Error('Non è il tuo turno ('+color+')');
    const c=getController(),g=c&&getGameState(c);
    let method='controller';
    if(c&&g){
     try{
      const move=g.getValidMoveFromString(q.uci);
      if(!move)throw Error('Mossa non legale per il controller');
      c.makeMove(move,false);
      if(await changedFen(s.fen,1100)){respond('MOVED',q.requestId,{uci:q.uci,method});return}
     }catch(_){ /* Continue with canvas input when the internal API changes. */ }
    }
    method='canvas';
    await canvasMove(q.uci,color);
    if(await changedFen(s.fen,1900))respond('MOVED',q.requestId,{uci:q.uci,method});
    else respond('MOVE_ERROR',q.requestId,{error:'Il canvas ha ricevuto '+q.uci+' ma la FEN non è cambiata. Controlla colore e scacchiera.'});
   }catch(e){respond('MOVE_ERROR',q.requestId,{error:String(e.message||e)})}
  })();
 }

});
})();
