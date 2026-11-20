'use strict';
const defaults={depth:18,think_ms:1200,show_hints:true,evaluation_bar:true,depth_bar:true,move_analysis:true,auto_move:true,auto_rematch_oscar:true,player_color:'auto'};
const $=id=>document.getElementById(id);
chrome.storage.sync.get(defaults,opts=>{
 for(const k of Object.keys(defaults)){
  const el=$(k);if(!el)continue;
  if(el.type==='checkbox')el.checked=!!opts[k];else el.value=opts[k];
  el.addEventListener(el.type==='range'?'input':'change',()=>{
   const next=el.type==='checkbox'?el.checked:el.tagName==='SELECT'?el.value:Number(el.value);
   chrome.storage.sync.set({[k]:next},()=>{$('status').textContent='Impostazioni salvate.'});
   if(k==='depth')$('depthout').textContent=next;
  });
 }
 $('depthout').textContent=opts.depth;
 chrome.storage.local.get({duomint_auto_debug:null},x=>{const d=$('auto_debug');if(d)d.textContent=x.duomint_auto_debug?.message||'Nessun tentativo registrato';});
});
