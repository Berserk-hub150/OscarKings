chrome.runtime.onMessage.addListener(msg=>{
 if(msg?.type==='OPEN_OPTIONS')chrome.runtime.openOptionsPage();
});
