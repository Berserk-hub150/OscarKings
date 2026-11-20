/* DuoMint UI (Chrome isolated world). No tracking, no external network calls. */
(()=>{
'use strict';
if(window.__duomintContent)return;
window.__duomintContent=true;
const DEFAULTS={depth:18,think_ms:1200,show_hints:true,move_analysis:true,depth_bar:true,evaluation_bar:true,auto_move:true,player_color:'auto'};
const BRIDGE='duomint.v1',ENGINE='duomint.engine.v1';
let options={...DEFAULTS},snapshot=null,result=null,prevEval=null,prevFen=null,moveFeedback='',lastAnalyzeKey='',autoAttemptFen='',pendingAuto=null,engineMode='Stockfish 19 FULL',hostReady=false,reqCounter=0,showPanel=true,pendingMove=false;
const $=id=>document.getElementById(id);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const debug=m=>{try{chrome.storage.local.set({duomint_auto_debug:{message:m,time:Date.now()}})}catch(_){}};
const validUci=u=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u||'');
const extUrl=chrome.runtime.getURL;
const ns='http://www.w3.org/2000/svg';
let host,card,overlay,evaluateBar,progressBar,arrowSvg,engineStatusEl,pendingTimer=null;
function h(tag,cls,txt){const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el}
function initialize(){
 if(!$('duomint-host')){
  host=h('iframe');host.id='duomint-host';host.setAttribute('aria-hidden','true');host.src=chrome.runtime.getURL('engine.html');host.style.cssText='display:none!important;width:0;height:0;border:0';document.documentElement.appendChild(host);
 }
 card=h('section','duomint-card');card.id='duomint-card';card.setAttribute('aria-label','DuoMint assistente scacchi');
 const header=h('div','duomint-header');const logo=h('img','duomint-logo');logo.src=chrome.runtime.getURL('img/logo-48.png');logo.alt='';const hbox=h('div','duomint-name');hbox.append(h('b',null,'DuoMint'),h('small',null,'STOCKFISH 19 FULL · v2.3.3'));
 const collapse=h('button','duomint-round','–');collapse.title='Riduci pannello';collapse.addEventListener('click',()=>{showPanel=!showPanel;card.classList.toggle('duomint-collapsed',!showPanel);collapse.textContent=showPanel?'–':'+'});header.append(logo,hbox,collapse);
 const body=h('div','duomint-body');
 const state=h('div','duomint-state');state.append(h('span','duomint-indicator'),h('span',null,'In attesa della scacchiera…'));state.id='duomint-state';
 const stats=h('div','duomint-stats');
 const score=h('div','duomint-tile');score.append(h('small',null,'VALUTAZIONE'),h('strong',null,'—'));score.id='duomint-score';
 const depth=h('div','duomint-tile');depth.append(h('small',null,'PROFONDITÀ'),h('strong',null,'0'));depth.id='duomint-depth';
 stats.append(score,depth);
 const depthWrap=h('div','duomint-progress');progressBar=h('div');progressBar.id='duomint-progressbar';depthWrap.append(progressBar);
 const heading=h('div','duomint-subhead','MOSSE CONSIGLIATE');const moves=h('div','duomint-moves');moves.id='duomint-moves';moves.textContent='Apri una lezione o una partita a scacchi.';
 const info=h('p','duomint-info');info.id='duomint-info';info.textContent='Le analisi vengono eseguite sul dispositivo.';
 const buttons=h('div','duomint-actions');
 const hint=h('button','duomint-button duomint-primary','Mostra suggerimento');hint.id='duomint-hint';hint.addEventListener('click',()=>{options.show_hints=!options.show_hints;save({show_hints:options.show_hints});paint()});
 const play=h('button','duomint-button','Gioca mossa');play.id='duomint-play';play.addEventListener('click',()=>playMove(false));
 const auto=h('button','duomint-button duomint-wide','Auto: OFF');auto.id='duomint-auto';auto.addEventListener('click',()=>{
  if(snapshot?.pvp){setStatus('Auto disattivato contro altri giocatori.','warning');return}
  options.auto_move=!options.auto_move;autoAttemptFen='';save({auto_move:options.auto_move});paint();
  if(options.auto_move)requestAnalysis(true);
 });
 buttons.append(hint,play,auto);
 const foot=h('div','duomint-footer');const about=h('span',null,'Solo allenamento e partite con Oscar');const settings=h('button','duomint-settings','⚙ Opzioni');settings.addEventListener('click',()=>chrome.runtime.sendMessage({type:'OPEN_OPTIONS'}));foot.append(about,settings);
 body.append(state,stats,depthWrap,heading,moves,info,buttons,foot);card.append(header,body);
 document.documentElement.appendChild(card);
 overlay=h('div','duomint-overlay');overlay.id='duomint-overlay';arrowSvg=document.createElementNS(ns,'svg');arrowSvg.setAttribute('viewBox','0 0 800 800');arrowSvg.setAttribute('preserveAspectRatio','none');
 const defs=document.createElementNS(ns,'defs'),marker=document.createElementNS(ns,'marker');marker.setAttribute('id','duomint-arrowhead');marker.setAttribute('markerWidth','5');marker.setAttribute('markerHeight','5');marker.setAttribute('refX','3.4');marker.setAttribute('refY','2.5');marker.setAttribute('orient','auto-start-reverse');const head=document.createElementNS(ns,'path');head.setAttribute('d','M 0 0 L 5 2.5 L 0 5 z');head.setAttribute('fill','#21deaa');marker.append(head);defs.append(marker);arrowSvg.append(defs);
 overlay.append(arrowSvg);evaluateBar=h('div','duomint-evalbar');evaluateBar.innerHTML='<div class="duomint-evalfill"></div><span></span>';document.documentElement.append(overlay,evaluateBar);
 setInterval(poll,700);setInterval(positionOverlay,200);poll();
}
function save(data){chrome.storage.sync.set(data)}
function setStatus(message,kind='info'){
 const state=$('duomint-state');if(!state)return;
 state.dataset.kind=kind;state.lastElementChild.textContent=message;
}
function poll(){
 const canvas=document.querySelector('canvas._3Lbq0')||[...document.querySelectorAll('canvas')].find(c=>c.width>300&&c.getBoundingClientRect().width>220);
 card?.classList.toggle('duomint-hidden',!canvas);overlay?.classList.toggle('duomint-hidden',!canvas);evaluateBar?.classList.toggle('duomint-hidden',!canvas);
 if(!canvas)return;
 window.postMessage({channel:BRIDGE,origin:'extension',type:'SNAPSHOT',requestId:++reqCounter},location.origin);
}
function requestAnalysis(force=false){
 if(!hostReady||!snapshot?.fen)return;
 const key=snapshot.fen+'|'+options.depth+'|'+options.think_ms;
 if(!force&&key===lastAnalyzeKey)return;
 lastAnalyzeKey=key;result=null;
 const id=++reqCounter;
 host.contentWindow.postMessage({channel:ENGINE,type:'ANALYZE',requestId:id,fen:snapshot.fen,depth:options.depth,think_ms:options.think_ms},'*');
 setStatus('Analisi in corso…');paint();
}
function receiveSnapshot(s){
 if(!s?.fen){snapshot=null;setStatus('Posizione FEN non trovata.','warning');return}
 if(snapshot?.fen!==s.fen){
  prevFen=snapshot?.fen||null;prevEval=result?.score??null;
  snapshot=s;result=null;moveFeedback='';autoAttemptFen='';pendingMove=false;
  requestAnalysis();
 }else{snapshot=s}
 paint();
}
window.addEventListener('message',event=>{
 if(event.source===window&&event.origin===location.origin&&event.data?.channel===BRIDGE&&event.data?.origin==='page'){
  const q=event.data;
  if(q.type==='SNAPSHOT')receiveSnapshot(q.snapshot);
  if(q.type==='ERROR')setStatus(q.error,'error');
  if(q.type==='MOVE_ERROR'){pendingMove=false;if(pendingTimer)clearTimeout(pendingTimer);pendingTimer=null;debug('Mossa rifiutata: '+q.error);setStatus('Mossa non eseguita: '+q.error,'error');paint()}
  if(q.type==='MOVED'){pendingMove=false;if(pendingTimer)clearTimeout(pendingTimer);pendingTimer=null;debug('Mossa verificata: '+q.uci+' via '+(q.method||'controller'));setStatus('Mossa eseguita: '+q.uci,'ok');}
 }
 if(event.source===host?.contentWindow&&event.data?.channel===ENGINE){
  const q=event.data;
  if(q.type==='READY'){hostReady=true;requestAnalysis(true)}
  if(q.type==='STATUS'){
   engineMode=q.engine||engineMode;
   if(q.error){debug('Stockfish non disponibile: '+q.error);setStatus(q.error,'warning');}
   paint();
  }
  if(q.type==='ERROR'){result=null;paint();setStatus(q.error,'error')}
  if(q.type==='RESULT'&&snapshot?.fen===q.fen){
   if(!result||q.depth>=result.depth){result=q;engineMode=q.engine||engineMode;
    if(prevFen&&prevEval!=null&&options.move_analysis){
     const mover=prevFen.split(' ')[1],diff=(q.score-prevEval)*(mover==='w'?1:-1);
     moveFeedback=diff>=-35?'Ottima mossa':diff>=-110?'Buona mossa':diff>=-250?'Imprecisione':diff>=-500?'Errore':'Grave errore';
     prevFen=null;
    }
    paint();
    const enough=q.mode==='stockfish'&&q.final===true;
    if(enough)setStatus('Analisi pronta · '+engineMode,'ok');
    if(enough&&options.auto_move&&!pendingMove&&autoAttemptFen!==snapshot.fen&&canPlay()&&bestMove()){
     autoAttemptFen=snapshot.fen;
     const plannedFen=snapshot.fen;
     pendingAuto=setTimeout(()=>{if(snapshot?.fen===plannedFen&&options.auto_move)playMove(true)},150);
    }
   }
  }
 }
});
function effectiveColor(){return options.player_color==='white'||options.player_color==='black'?options.player_color:(snapshot?.orientation==='black'?'black':'white')}
function canPlay(){return !!snapshot&&!snapshot.pvp&&(!!snapshot.canMove||!!snapshot.canvasClickAllowed)&&(snapshot.type==='lesson'||effectiveColor()[0]===snapshot.fen.split(' ')[1])}
function bestMove(){return validUci(snapshot?.solution)?snapshot.solution:result?.top?.find(m=>validUci(m.move))?.move||null}
function playMove(auto=false){
 const uci=bestMove();if(!uci){setStatus('Non ho una mossa valida da giocare.','warning');return}
 if(!canPlay()){setStatus(snapshot?.pvp?'Auto vietato in PvP.':'Mossa automatica non disponibile.','warning');return}
 if(pendingMove)return;
 pendingMove=true;
 const before=snapshot.fen;debug('Invio '+uci+' · FEN '+before+' · colore '+effectiveColor()+' · controller '+!!snapshot.canMove);
 window.postMessage({channel:BRIDGE,origin:'extension',type:'MOVE',requestId:++reqCounter,uci,expectedFen:before,playerColor:effectiveColor()},location.origin);
 if(pendingTimer)clearTimeout(pendingTimer);pendingTimer=setTimeout(()=>{if(pendingMove&&snapshot?.fen===before){pendingMove=false;debug('Timeout: nessuna conferma della mossa '+uci);setStatus('Mossa non confermata: '+uci,'warning');paint()}},4800);
 setStatus((auto?'Auto':'Manuale')+' → '+uci);
}
function formatEval(cp,mate){
 if(Number.isFinite(mate))return 'M'+(mate>0?'+':'')+mate;
 if(!Number.isFinite(cp))return '—';
 if(Math.abs(cp)>800000)return cp>0?'Matto +':'Matto −';
 return (cp>=0?'+':'')+(cp/100).toFixed(2);
}
function squareCenter(s,black){
 const f='abcdefgh'.indexOf(s[0]),r=8-Number(s[1]);
 if(f<0||r<0||r>7)return null;
 return [(black?7-f:f)*100+50,(black?7-r:r)*100+50];
}
function drawArrow(){
 while(arrowSvg.childNodes.length>1)arrowSvg.removeChild(arrowSvg.lastChild);
 if(!options.show_hints||!snapshot)return;
 const black=snapshot.orientation==='black';
 const highlighted=[];
 if(snapshot.type==='lesson'&&validUci(snapshot.solution))highlighted.push({move:snapshot.solution});
 for(const entry of result?.top||[]){if(!highlighted.some(m=>m.move===entry.move))highlighted.push(entry)}
 highlighted.slice(0,3).forEach((m,index)=>{
  const u=m.move;if(!validUci(u))return;
  const from=squareCenter(u.slice(0,2),black),to=squareCenter(u.slice(2,4),black);
  if(!from||!to)return;
  const line=document.createElementNS(ns,'line');line.setAttribute('x1',from[0]);line.setAttribute('y1',from[1]);line.setAttribute('x2',to[0]);line.setAttribute('y2',to[1]);line.setAttribute('stroke',index===0?'#21deaa':'#ffd665');line.setAttribute('stroke-width',index===0?'19':'10');line.setAttribute('stroke-linecap','round');line.setAttribute('opacity',index===0?'0.85':'0.65');if(index===0)line.setAttribute('marker-end','url(#duomint-arrowhead)');arrowSvg.append(line);
 });
}
function positionOverlay(){
 if(!snapshot||!overlay)return;
 const b=document.querySelector('canvas._3Lbq0')||[...document.querySelectorAll('canvas')].find(c=>c.width>300&&c.getBoundingClientRect().width>220);
 if(!b)return;
 const r=b.getBoundingClientRect();
 Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
 Object.assign(evaluateBar.style,{left:Math.max(2,r.left-19)+'px',top:r.top+'px',height:r.height+'px'});
}
function paint(){
 if(!card)return;
 const hint=$('duomint-hint'),auto=$('duomint-auto'),play=$('duomint-play'),moves=$('duomint-moves'),info=$('duomint-info');
 hint.textContent=options.show_hints?'Suggerimenti: ON':'Suggerimenti: OFF';
 auto.textContent=options.auto_move?'Auto: ON':'Auto: OFF';auto.classList.toggle('duomint-active',options.auto_move);
 auto.disabled=!!snapshot?.pvp;
 play.disabled=!canPlay()||!bestMove();
 $('duomint-score').style.display=options.evaluation_bar?'':'none';
 $('duomint-depth').style.display=options.depth_bar?'':'none';
 if(!options.evaluation_bar&&!options.depth_bar)card.querySelector('.duomint-stats').style.display='none';else card.querySelector('.duomint-stats').style.display='grid';
 card.querySelector('.duomint-progress').style.display=options.depth_bar?'':'none';
 $('duomint-score').querySelector('strong').textContent=result?formatEval(result.score,result.top?.[0]?.mate):'—';
 $('duomint-depth').querySelector('strong').textContent=result?result.depth+'/'+Math.min(options.depth,22):'0';
 progressBar.style.width=result?Math.min(100,result.depth/Math.min(options.depth,22)*100)+'%':'0%';
 moves.replaceChildren();
 if(snapshot?.solution&&snapshot.type==='lesson'){
  const suggested=h('div','duomint-solution');suggested.textContent='Soluzione lezione: '+snapshot.solution;moves.append(suggested);
 }
 if(result?.top?.length){result.top.slice(0,3).forEach((m,i)=>{
  const row=h('div','duomint-move');row.append(h('b',null,(i+1)+'. '+m.move),h('span',null,formatEval(m.cp,m.mate)));moves.append(row);
 })}else if(!snapshot){moves.textContent='Apri la scacchiera Duolingo.'}else{moves.textContent='Analisi della posizione in corso…'}
 info.textContent=moveFeedback?(moveFeedback+' · '+engineMode):snapshot?.pvp?'Partita PvP: auto disattivato':snapshot?.type==='lesson'?'Lezione di scacchi · '+engineMode:'Partita con Oscar · '+engineMode+' · nessuna mossa Lite';
 const pct=Math.max(1,Math.min(99,50+Math.tanh((result?.score||0)/450)*46));
 evaluateBar?.querySelector('.duomint-evalfill')?.style.setProperty('height',pct+'%');
 if(evaluateBar)evaluateBar.style.display=options.evaluation_bar?'':'none';
 const label=evaluateBar?.querySelector('span');if(label)label.textContent=result?formatEval(result.score,result.top?.[0]?.mate):'';
 drawArrow();positionOverlay();
}
chrome.storage.sync.get(DEFAULTS,stored=>{
 options={...DEFAULTS,...stored};
 // The old extension forcibly saved auto_move=false every time Stockfish was unavailable.
 // Migrate that stale preference once; later user changes remain respected.
 chrome.storage.local.get({auto_workerless_21_migrated:false},m=>{
  if(!m.auto_workerless_21_migrated){options.auto_move=true;chrome.storage.sync.set({auto_move:true});chrome.storage.local.set({auto_workerless_21_migrated:true})}
  initialize();paint();debug('Avvio: Auto '+(options.auto_move?'ON':'OFF')+' · colore '+options.player_color);
 });
});
chrome.storage.onChanged.addListener((changes,area)=>{if(area!=='sync')return;
 let refresh=false;for(const [k,c] of Object.entries(changes))if(k in DEFAULTS){options[k]=c.newValue;refresh=refresh||(k==='depth'||k==='think_ms')}
 if(refresh){lastAnalyzeKey='';requestAnalysis(true)}paint();
});
})();
