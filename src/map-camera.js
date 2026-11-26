// Cartesian world coordinates; y increases down. Synthetic coordinates are only in tests.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const positive=(v)=>Number.isFinite(v)&&v>0;
export function createCamera(bounds,width,height,maxFactor=32){
 if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=bounds[0]||bounds[3]<=bounds[1]||!positive(width)||!positive(height)||!positive(maxFactor)||maxFactor<1)throw Error("Invalid map geometry");
 const [x0,y0,x1,y1]=bounds,min=Math.min(width/(x1-x0),height/(y1-y0));
 return {bounds:[...bounds],width,height,min,max:min*maxFactor,scale:min,x:(x0+x1)/2,y:(y0+y1)/2,maxFactor};
}
export function project(c,p){return {x:(p.x-c.x)*c.scale+c.width/2,y:(p.y-c.y)*c.scale+c.height/2};}
export function unproject(c,p){return {x:(p.x-c.width/2)/c.scale+c.x,y:(p.y-c.height/2)/c.scale+c.y};}
export function boundCamera(c){
 const [a,b,d,e]=c.bounds,hx=c.width/(2*c.scale),hy=c.height/(2*c.scale);
 return {...c,x:2*hx>=d-a?(a+d)/2:clamp(c.x,a+hx,d-hx),y:2*hy>=e-b?(b+e)/2:clamp(c.y,b+hy,e-hy)};
}
export function pan(c,dx,dy){if(!Number.isFinite(dx)||!Number.isFinite(dy))return c;return boundCamera({...c,x:c.x-dx/c.scale,y:c.y-dy/c.scale});}
export function zoomAt(c,factor,anchor){return transformGesture(c,anchor,anchor,factor);}
export function transformGesture(c,from,to,factor){
 if(!positive(factor)||![from?.x,from?.y,to?.x,to?.y].every(Number.isFinite))return c;
 const p=unproject(c,from),scale=clamp(c.scale*factor,c.min,c.max);
 return boundCamera({...c,scale,x:p.x-(to.x-c.width/2)/scale,y:p.y-(to.y-c.height/2)/scale});
}
export function resizeCamera(c,width,height){
 const next=createCamera(c.bounds,width,height,c.maxFactor);
 return boundCamera({...next,scale:clamp(next.min*c.scale/c.min,next.min,next.max),x:c.x,y:c.y});
}
export function restoreCamera(c,p){if(!p||![p.x,p.y,p.zoom].every(Number.isFinite)||p.zoom<1)return c;return boundCamera({...c,x:p.x,y:p.y,scale:clamp(c.min*p.zoom,c.min,c.max)});}
export function snapshotCamera(c){return {x:c.x,y:c.y,zoom:c.scale/c.min};}
export function focusCamera(c,p,zoom=8){if(![p?.x,p?.y,zoom].every(Number.isFinite))return c;return restoreCamera(c,{x:p.x,y:p.y,zoom:Math.max(1,zoom)});}
// Only approved markers on active layer. Stable grid grouping means input ordering cannot change a cluster.
export function visibleClusters(c,encounters,layer,cell=52){
 if(!positive(cell))throw Error("Invalid cluster cell");
 const groups=new Map();
 for(const e of encounters){const m=e.marker;if(!m||m.verified!==true||m.layer!==layer||![m.x,m.y].every(Number.isFinite))continue;
 if(m.x<c.bounds[0]||m.x>c.bounds[2]||m.y<c.bounds[1]||m.y>c.bounds[3])continue;
 const p=project(c,m);if(p.x<-cell||p.y<-cell||p.x>c.width+cell||p.y>c.height+cell)continue;
 const key=Math.floor(p.x/cell)+":"+Math.floor(p.y/cell);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({id:e.id,x:p.x,y:p.y});}
 return [...groups.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([key,items])=>{items.sort((a,b)=>a.id.localeCompare(b.id));return {key,ids:items.map(i=>i.id),x:items.reduce((s,i)=>s+i.x,0)/items.length,y:items.reduce((s,i)=>s+i.y,0)/items.length};});
}
