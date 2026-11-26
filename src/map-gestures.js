import {pan,zoomAt,transformGesture} from "./map-camera.js";
const middle=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function bindMapGestures(element,{getCamera,setCamera,onTap=()=>{},onGestureEnd=()=>{}}){
 const points=new Map();let gesture=null,lastTap=null;
 const local=e=>{const r=element.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
 function down(e){if(e.pointerType==="mouse"&&e.button!==0)return;if(points.size>=2)return;points.set(e.pointerId,local(e));element.setPointerCapture?.(e.pointerId);if(points.size===1)gesture={start:local(e),at:e.timeStamp,moved:false,multiple:false};else if(gesture)gesture.multiple=true;}
 function move(e){if(!points.has(e.pointerId))return;const previous=[...points.values()],p=local(e);points.set(e.pointerId,p);const current=[...points.values()];
 if(gesture&&distance(gesture.start,p)>8)gesture.moved=true;
 const c=getCamera();if(current.length===1)setCamera(pan(c,current[0].x-previous[0].x,current[0].y-previous[0].y));
 else {const a=distance(...previous),b=distance(...current);if(a>1&&b>1)setCamera(transformGesture(c,middle(...previous),middle(...current),b/a));}}
 function finish(e){if(!points.has(e.pointerId))return;const p=local(e);points.delete(e.pointerId);
 if(points.size)return;
 if(e.type==="pointerup"&&gesture&&!gesture.moved&&!gesture.multiple&&e.timeStamp-gesture.at<350){if(lastTap&&e.timeStamp-lastTap.at<320&&distance(lastTap.p,p)<28){setCamera(zoomAt(getCamera(),2,p));lastTap=null;}else{lastTap={p,at:e.timeStamp};onTap(p);}}else lastTap=null;gesture=null;onGestureEnd();}
 function wheel(e){e.preventDefault();setCamera(zoomAt(getCamera(),Math.exp(-Math.max(-500,Math.min(500,e.deltaY))*.002),local(e)));onGestureEnd();}
 const listeners={pointerdown:down,pointermove:move,pointerup:finish,pointercancel:finish,lostpointercapture:finish,wheel};
 const oldTouch=element.style.touchAction;element.style.touchAction="none";
 for(const [event,fn] of Object.entries(listeners))element.addEventListener(event,fn,event==="wheel"?{passive:false}:undefined);
 return ()=>{for(const [event,fn] of Object.entries(listeners))element.removeEventListener(event,fn);element.style.touchAction=oldTouch;points.clear();};
}
