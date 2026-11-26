import {reviewAtlas} from "./compass-projection.js";
export function previewAtlas(data,rows){const r=reviewAtlas(data,rows),layers=data.previewLayers??[];return {...r,layers,markers:r.positions.filter(p=>layers.some(l=>l.id===p.layer&&p.x>=l.bounds[0]&&p.x<=l.bounds[2]&&p.y>=l.bounds[1]&&p.y<=l.bounds[3])).map(p=>({id:p.id,marker:{layer:p.layer,x:p.x,y:p.y,verified:true}}))};}
// verified here means renderer-eligible only in explicitly labeled research preview, NEVER geography admission.
