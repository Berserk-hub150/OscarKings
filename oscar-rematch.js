/* DuoMint v1.5 — Oscar victory -> Continue -> Continue -> Challenge Oscar.
 * Runs in Chrome's isolated content-script world. Does not automate PvP.
 * React may keep ALL three screens mounted simultaneously and reuse DOM nodes.
 */
(()=>{
'use strict';
if(window.__duomintOscarRematch)return;
window.__duomintOscarRematch=true;

const VERSION='1.5.0', POLL_MS=350, MIN_GAP_MS=550, TIMEOUT_MS=25000;
const WIN=/scacco\s*matto|hai\s*vinto|vittoria|checkmate|you\s*won|victory/i;
const nextSelector='button[data-test="player-next"]';
const playSelector='button[data-test="chess-match-play-button"]';
const oscSelector='[data-test="chess-match-button-oscar"]';
let enabled=true,stepName='idle',stepAt=0,lastPress=0,firstBtn=null,lastWin=null;
let armed=true,sawClear=false,loop=null,statusText='',observer=null;
const clock=()=>Date.now();
const one=s=>document.querySelector(s);
const all=s=>[...document.querySelectorAll(s)];
const inPvp=()=>/chess[-_/]pvp|pvp[-_/]session|chess[-_/]friend/i.test(location.pathname);
function alive(){try{return !!chrome.runtime?.id}catch(_){return false}}
function close(){if(loop!==null)clearInterval(loop);loop=null;if(observer){observer.disconnect();observer=null}}
function visible(el){
 if(!el||!el.isConnected)return false;
 for(let p=el,i=0;p&&i<35;p=p.parentElement,i++){
  if(p.hidden||p.getAttribute('aria-hidden')==='true'||p.hasAttribute('inert'))return false;
  const s=getComputedStyle(p);
  if(s.display==='none'||s.visibility==='hidden'||s.visibility==='collapse'||s.opacity==='0')return false;
 }
 return !!el.getClientRects().length;
}
function clickable(b){return !!b&&visible(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'}
function pressed(mode){return all('[data-test="chess-match-button-'+mode+'"]').some(b=>b.getAttribute('aria-pressed')==='true')}
function oppositeMode(){return pressed('friend')||pressed('anyone')}
function oscarContext(){
 if(inPvp()||oppositeMode())return false;
 // Do NOT require a visible Oscar selector: the result view can hide the game menu.
 return pressed('oscar')||/\/(?:chess-match|chess-matches)(?:\/|$)/.test(location.pathname);
}
function winningPanel(){
 for(const result of all('[data-test="blame blame-correct"]')){
  const headline=result.querySelector('h2');
  if(headline&&WIN.test(headline.textContent||'')&&visible(result))return result;
 }
 return null;
}
function nextButtons(){return all(nextSelector).filter(clickable)}
function playButton(){return all(playSelector).find(b=>clickable(b)&&/sfida\s+oscar|play\s+oscar|challenge\s+oscar/i.test(b.textContent||''))||null}
function log(message,diagnostics=''){
 const next=message+(diagnostics?' · '+diagnostics:'');
 if(next===statusText)return;
 statusText=next;
 console.info('[DuoMint Oscar '+VERSION+']',next);
 if(!alive())return;
 try{chrome.storage.local.set({oscar_debug:{version:VERSION,message:next,time:clock(),path:location.pathname}})}catch(_){}
}
function reset(message){stepName='idle';stepAt=0;lastPress=0;firstBtn=null;lastWin=null;if(message)log(message)}
function goto(phase,message){stepName=phase;stepAt=lastPress=clock();log(message)}
function press(btn,label){
 if(!clickable(btn))return false;
 try{btn.click();log('Clic inviato: '+label);return true}
 catch(e){log('Errore clic '+label+': '+String(e?.message||e));return false}
}
function firstContinue(win){
 // The first Continue is in the same top-level screen as the result message.
 let p=win;
 for(let i=0;p&&i<7;i++,p=p.parentElement){
  if(p.matches?.('.U8jH3')){
   const inResult=[...p.querySelectorAll(nextSelector)].find(clickable);
   if(inResult)return inResult;
  }
 }
 return nextButtons()[0]||null;
}
function secondContinue(){
 const candidates=nextButtons();
 // Result and next screen can both be in the DOM even before the first click.
 const other=candidates.find(b=>b!==firstBtn);
 if(other)return other;
 // If React recycled the exact button, only reuse it once the result panel vanished.
 const winStillVisible=!!winningPanel();
 if(!winStillVisible)return candidates.find(b=>b===firstBtn)||null;
 return null;
}
function tick(){
 if(!alive()){close();return}
 if(!enabled){if(stepName!=='idle')reset('Riavvio Oscar disattivato nelle opzioni');return}
 if(inPvp()||oppositeMode()){
  if(stepName!=='idle')reset('Bloccato: partita con altri giocatori');
  return;
 }
 const now=clock(),win=winningPanel();
 // Re-arm only after the old win view has cleared AND the rematch completes.
 if(!win&&stepName!=='idle')sawClear=true;
 if(!win&&stepName==='idle'&&!armed&&sawClear){armed=true;sawClear=false}
 if(stepName==='idle'){
  if(!win||!armed)return;
  if(!oscarContext()){
   log('Vittoria rilevata, ma Oscar non confermato', 'URL '+location.pathname+'; oscar='+pressed('oscar'));
   return;
  }
  const btn=firstContinue(win);
  if(!btn){log('Vittoria rilevata, ma primo Continua non visibile');return}
  armed=false;lastWin=win;firstBtn=btn;
  if(press(btn,'Continua 1/2')){sawClear=false;goto('second','Aspetto secondo Continua')}
  return;
 }
 if(now-stepAt>TIMEOUT_MS){
  log('Fermo alla fase '+stepName+' da '+Math.round((now-stepAt)/1000)+'s. Apri il popup per la diagnostica');
  // Do not endlessly click the same win; the next real match re-arms automatically.
  reset();return;
 }
 if(now-lastPress<MIN_GAP_MS)return;
 if(stepName==='second'){
  const btn=secondContinue();
  if(!btn)return;
  if(press(btn,'Continua 2/2'))goto('play','Aspetto menu Sfida Oscar');
  return;
 }
 if(stepName==='play'){
  const btn=playButton();
  if(!btn)return;
  // Explicitly select Oscar if the match menu reset to an unselected state.
  if(!pressed('oscar')){
   const oscar=all(oscSelector).find(clickable);
   if(!oscar){log('Menu visibile, ma pulsante Oscar non selezionabile');return}
   if(press(oscar,'Seleziona Oscar'))lastPress=clock();
   return;
  }
  if(press(btn,'Sfida Oscar'))goto('done','Sfida Oscar cliccato: nuova partita richiesta');
  return;
 }
 if(stepName==='done'){
  if(now-stepAt>2000){reset('Riavvio terminato; in attesa della prossima vittoria')}
 }
}
function safelyTick(){try{tick()}catch(e){log('Errore automazione: '+String(e?.message||e))}}
function start(){
 if(!alive())return;
 try{
  chrome.storage.sync.get({auto_rematch_oscar:true},data=>{
   if(!alive())return;
   enabled=data.auto_rematch_oscar!==false;
   log(enabled?'Riavvio Oscar attivo, in attesa di Scacco matto!':'Riavvio Oscar disattivato');
   loop=setInterval(safelyTick,POLL_MS);
   safelyTick();
  });
  chrome.storage.onChanged.addListener((changes,area)=>{
   if(!alive()){close();return}
   if(area==='sync'&&changes.auto_rematch_oscar){
    enabled=changes.auto_rematch_oscar.newValue!==false;
    if(!enabled)reset('Riavvio Oscar disattivato');
    else {armed=true;log('Riavvio Oscar attivato');safelyTick()}
   }
  });
 }catch(e){log('Avvio fallito: '+String(e?.message||e))}
}
start();
})();
