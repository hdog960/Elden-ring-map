// Factual coordinate intake must be separate from artistic assets and research-only markers.
export function admitGeography(ledger,encounters){
 const errors=[];if(!ledger||ledger.schema!==1||!Array.isArray(ledger.layers)||!Array.isArray(ledger.positions))return {errors:["Invalid geography ledger"],layers:[],markers:[]};
 const layers=new Map(),ids=new Set(encounters.map(e=>e.id)),positions=new Set(),markers=[];
 for(const l of ledger.layers){if(!l?.id||layers.has(l.id)||!Array.isArray(l.bounds)||l.bounds.length!==4||!l.bounds.every(Number.isFinite)||l.bounds[2]<=l.bounds[0]||l.bounds[3]<=l.bounds[1]||!l.artifact||l.artifact.startsWith("/")||l.artifact.includes("..")||/^[a-z]+:/i.test(l.artifact)||!l.rightsEvidence||l.rightsReviewed!==true||l.calibrationVerified!==true){errors.push("Unqualified layer "+l?.id);continue;}layers.set(l.id,l);}
 for(const p of ledger.positions){const l=layers.get(p?.layer);
 if(!p||!ids.has(p.id)||positions.has(p.id)||!l||![p.x,p.y].every(Number.isFinite)||p.x<l.bounds[0]||p.x>l.bounds[2]||p.y<l.bounds[1]||p.y>l.bounds[3]||!p.source||!p.locator||!p.rightsEvidence||p.rightsReviewed!==true||!p.calibrationEvidence||p.verified!==true){errors.push("Unqualified position "+p?.id);continue;}
 positions.add(p.id);markers.push({id:p.id,marker:{layer:p.layer,x:p.x,y:p.y,verified:true}});}
 return {errors,layers:[...layers.values()],markers};
}
