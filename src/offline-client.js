export async function registerOffline(host){
 if(!host)return;const line=document.createElement("p");line.id="offline-status";line.setAttribute("role","status");host.append(line);
 if(!("serviceWorker" in navigator)){line.textContent="Offline cache not supported by this browser.";return;}
 line.textContent="Preparing offline assets…";
 try{const registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
 function waiting(){if(registration.waiting)line.textContent="Update downloaded. Close all Boss Hunter windows, then reopen to activate safely.";}
 function check(){const worker=navigator.serviceWorker.controller;if(worker)worker.postMessage({type:"CACHE_STATUS"});else waiting();}
 navigator.serviceWorker.addEventListener("message",e=>{if(e.source!==navigator.serviceWorker.controller)return;if(e.data?.type==="CACHE_STATUS"){line.textContent=e.data.complete?(e.data.releaseReady?"Offline ready — verified full release.":e.data.mvpReady?"Playable MVP cached offline; approximate map.":"Research preview cached offline; full boss map not yet available."):"Offline cache incomplete. Reconnect to repair.";waiting();}});
 navigator.serviceWorker.addEventListener("controllerchange",check);registration.addEventListener("updatefound",()=>{const worker=registration.installing;worker?.addEventListener("statechange",()=>{waiting();if(worker.state==="redundant"&&!registration.active)line.textContent="Offline preparation failed; reconnect and reload.";});});check();navigator.serviceWorker.ready.then(check).catch(()=>{});
 if(navigator.storage?.persisted&&navigator.storage?.persist){try{if(!await navigator.storage.persisted())await navigator.storage.persist();}catch{}}
 }catch{line.textContent="Offline preparation failed; reconnect and reload.";}
}