import {calibrate,applyTransform,validateGeometry} from "./calibration.js";
const nonempty=v=>typeof v==="string"&&v.trim().length>0;
const sha=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const pt=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function prepareSurvey(s,knownIds){
 if(s?.schema!==1||!["surface","underground","shadow"].includes(s.layer)||!Array.isArray(s.bounds)||s.bounds.length!==4||!s.bounds.every(Number.isFinite)||s.bounds[2]<=s.bounds[0]||s.bounds[3]<=s.bounds[1]||!nonempty(s.gameVersion)||!Array.isArray(s.observations)||!Array.isArray(s.features))throw Error("Invalid survey");
 const evidence=e=>e&&nonempty(e.source)&&nonempty(e.locator)&&sha(e.sha256)&&nonempty(e.rightsEvidence)&&e.rightsReviewed===true&&nonempty(e.observer);
 for(const a of [...(s.fit??[]),...(s.holdout??[])])if(!evidence(a.provenance)||!pt(a.world)||!pt(a.map))throw Error("Unqualified anchor evidence");
 const fitHashes=new Set(s.fit.map(a=>a.provenance.sha256));if(s.holdout.some(a=>fitHashes.has(a.provenance.sha256)))throw Error("Holdouts reuse fit evidence");
 const cal=calibrate(s.fit.map(a=>({...a,evidence:a.provenance.locator})),s.holdout.map(a=>({...a,evidence:a.provenance.locator})),s.maxResidual);
 if(!cal.passed)throw Error("Calibration residual exceeds tolerance");
 const seen=new Set(),positions=[];for(const o of s.observations){if(!knownIds.has(o.id)||seen.has(o.id)||!["arena","entrance","field"].includes(o.kind)||!pt(o.world)||!evidence(o.provenance)||o.method==="tile-center"||o.verified!==true)throw Error("Unqualified observation "+o.id);seen.add(o.id);const p=applyTransform(cal.transform,o.world);if(p.x<s.bounds[0]||p.x>s.bounds[2]||p.y<s.bounds[1]||p.y>s.bounds[3])throw Error("Outside layer "+o.id);positions.push({id:o.id,layer:s.layer,...p,kind:o.kind,source:o.provenance.source,locator:o.provenance.locator,rightsEvidence:o.provenance.rightsEvidence,rightsReviewed:true,calibrationEvidence:o.provenance.sha256,verified:true});}
 const geometry={schema:1,features:s.features.map(f=>{if(!evidence(f.provenance))throw Error("Unqualified geometry source "+f.id);return {...f,evidence:f.provenance.locator,reviewed:true};})};const errors=validateGeometry(geometry,s.bounds);if(errors.length)throw Error(errors.join("; "));
 if(!geometry.features.some(f=>f.kind==="land"))throw Error("Missing surveyed land geometry");
 return {calibration:cal,positions,geometry};
}
const escape=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function renderSurveySVG(geometry,bounds){const errors=validateGeometry(geometry,bounds);if(errors.length)throw Error(errors.join("; "));const [x,y,x1,y1]=bounds;const colors={land:"#867653",water:"#344b4f",ridge:"#534634",road:"#c9b78b",label:"#f5e7bc"};const shapes=geometry.features.map(f=>{const points=f.points.map(p=>p.x+","+p.y).join(" ");if(f.kind==="label"){const p=f.points[0];return '<text x="'+p.x+'" y="'+p.y+'" fill="'+colors.label+'" font-size="12">'+escape(f.label??f.id)+'</text>';}if(f.kind==="land"||f.kind==="water")return '<polygon points="'+points+'" fill="'+colors[f.kind]+'" stroke="#302b20" stroke-width="1"/>';return '<polyline points="'+points+'" fill="none" stroke="'+colors[f.kind]+'" stroke-width="'+(f.kind==="road"?2:4)+'"/>';});return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+[x,y,x1-x,y1-y].join(" ")+'"><rect x="'+x+'" y="'+y+'" width="'+(x1-x)+'" height="'+(y1-y)+'" fill="#344b4f"/>'+shapes.join("")+'</svg>';}
