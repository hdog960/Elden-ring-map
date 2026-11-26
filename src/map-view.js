import {createCamera,resizeCamera,restoreCamera,snapshotCamera,zoomAt,focusCamera,visibleClusters,project} from "./map-camera.js";
import {bindMapGestures} from "./map-gestures.js";
const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export function mountMap(host,{layers,encounters,onSelect,getDefeated=()=>({}),onViewport=()=>{},initial={},focusId=null,research=false}){
 if(!layers.length){host.append(make("p","Geographical survey not yet admitted. No placeholder maps or markers are displayed. Use Bosses or Search to inspect research records."));return ()=>{};}
 const controls=make("div"),selector=make("select"),stage=make("div"),image=make("img"),overlay=make("div"),choices=make("div");
 controls.className="map-controls";selector.setAttribute("aria-label","Map layer");stage.className="map-stage";image.className="map-art";image.alt=research?"Original coordinate study, not a terrain map":"Map of the selected realm";overlay.className="map-markers";choices.className="map-choices";stage.append(image,overlay);host.append(controls,stage,choices);
 for(const l of layers){const o=make("option",l.name??l.id);o.value=l.id;selector.append(o);}controls.append(selector);
 const requested=encounters.find(e=>e.id===focusId)?.marker;
 let layer=layers.find(l=>l.id===(requested?.layer??initial.layer))??layers[0],camera,frame=0,disposed=false;
 const dimensions=()=>[Math.max(1,stage.clientWidth),Math.max(1,stage.clientHeight)];
 function render(){frame=0;if(disposed)return;const [x0,y0,x1,y1]=layer.bounds,p=project(camera,{x:x0,y:y0});Object.assign(image.style,{left:p.x+"px",top:p.y+"px",width:(x1-x0)*camera.scale+"px",height:(y1-y0)*camera.scale+"px"});overlay.replaceChildren();const defeated=getDefeated();
 for(const group of visibleClusters(camera,encounters,layer.id,52,{research})){const row=encounters.find(e=>e.id===group.ids[0]);const done=group.ids.every(id=>Object.hasOwn(defeated,id));const b=make("button",group.ids.length>1?String(group.ids.length):done?"✓":row.category?.includes("night")?"☾":"◆");b.type="button";b.className="map-pin"+(research?" projected":"")+(group.ids.includes(focusId)?" focused":"")+(done?" defeated":"")+(row.category==="remembrance"?" major":"");b.style.left=group.x+"px";b.style.top=group.y+"px";b.setAttribute("aria-label",group.ids.length>1?group.ids.length+" encounters":row.name+(research?", projected candidate":done?", defeated":", undefeated"));b.addEventListener("pointerdown",e=>e.stopPropagation());b.addEventListener("click",()=>{choices.replaceChildren();if(group.ids.length===1)onSelect(row.id);else{choices.append(make("p","Choose an overlapping encounter"));for(const id of group.ids){const r=encounters.find(e=>e.id===id),choice=make("button",r.name+" — "+r.location);choice.onclick=()=>onSelect(id);choices.append(choice);}}});overlay.append(b);}
 }
 const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(render);};
 const save=()=>onViewport({layer:layer.id,...snapshotCamera(camera)});
 function setLayer(l,restore){layer=l;selector.value=l.id;camera=createCamera(l.bounds,...dimensions());if(restore)camera=restoreCamera(camera,restore);image.src=new URL(l.artifact,document.baseURI).href;choices.replaceChildren();schedule();}
 setLayer(layer,initial.layer===layer.id?initial:null);
 if(requested&&requested.layer===layer.id)camera=focusCamera(camera,requested);
 selector.onchange=()=>{setLayer(layers.find(l=>l.id===selector.value));save();};
 for(const [label,action] of [["−",()=>zoomAt(camera,.5,{x:camera.width/2,y:camera.height/2})],["+",()=>zoomAt(camera,2,{x:camera.width/2,y:camera.height/2})],["Reset",()=>createCamera(layer.bounds,...dimensions())]]){const b=make("button",label);b.type="button";b.onclick=()=>{camera=action();schedule();save();};controls.append(b);}
 const cleanup=bindMapGestures(stage,{getCamera:()=>camera,setCamera:c=>{camera=c;schedule();},onGestureEnd:save});
 const observer=new ResizeObserver(()=>{const [w,h]=dimensions();camera=resizeCamera(camera,w,h);schedule();});observer.observe(stage);schedule();
 return ()=>{disposed=true;cleanup();observer.disconnect();if(frame)cancelAnimationFrame(frame);};
}
