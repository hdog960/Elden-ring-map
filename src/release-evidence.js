import {validateCatalog} from "./catalog.js";
import {admitGeography} from "./map-admission.js";
const text=v=>typeof v==="string"&&v.trim().length>0;
const url=v=>typeof v==="string"&&/^https:\/\/[^/]+/.test(v);
export function validateRelease({catalog,intake,stable,geography,audit}){
 const errors=validateCatalog(catalog,{release:true});const candidates=new Map((intake?.rows??[]).map(r=>[r.id,r])),registry=new Set(stable?.ids??[]),published=new Map((catalog?.encounters??[]).map(r=>[r.id,r]));
 if(registry.size!==(stable?.ids??[]).length||registry.size!==candidates.size||[...candidates.keys()].some(id=>!registry.has(id)))errors.push("Stable ID registry mismatch");
 if(audit?.schema!==1||audit.status!=="reconciled"||!Array.isArray(audit.decisions)||!text(audit.version)||!Array.isArray(audit.sourceInventories)||audit.sourceInventories.length<2)errors.push("Missing final census evidence");
 const decisions=new Map();
 for(const r of audit?.decisions??[]){if(!registry.has(r.id)||decisions.has(r.id)||!["primary","extended","excluded"].includes(r.classification)||!text(r.rationale)||!Array.isArray(r.evidence)||new Set(r.evidence.filter(x=>url(x.url)&&text(x.locator)).map(x=>new URL(x.url).hostname)).size<2){errors.push("Invalid adjudication "+r.id);continue;}decisions.set(r.id,r);const p=published.get(r.id);if(r.classification==="excluded"){if(p)errors.push("Excluded ID published "+r.id);}else if(!p||p.hunt!==r.classification)errors.push("Adjudicated ID missing or misclassified "+r.id);}
 for(const id of registry)if(!decisions.has(id))errors.push("Unadjudicated "+id);
 for(const id of published.keys())if(!registry.has(id))errors.push("Unknown published ID "+id);
 const geo=admitGeography(geography,[...published.values()]);errors.push(...geo.errors);const markers=new Map(geo.markers.map(m=>[m.id,m.marker]));
 for(const [id,r] of published){const m=markers.get(id);if(!m||m.layer!==r.marker?.layer||m.x!==r.marker?.x||m.y!==r.marker?.y)errors.push("Geography mismatch "+id);if(!r.guideReview||r.guideReview.status!=="verified"||!text(r.guideReview.gameVersion)||!text(r.guideReview.evidence))errors.push("Guide not qualified "+id);}
 for(const l of catalog?.layers??[]){const match=geo.layers.find(g=>g.id===l.id);if(!match||JSON.stringify(match.bounds)!==JSON.stringify(l.bounds)||match.artifact!==l.artifact)errors.push("Layer mismatch "+l.id);}
 for(const s of audit?.sourceInventories??[])if(!url(s.url)||!text(s.scope)||!text(s.reconciliation)||!text(s.evidence)||s.unresolved!==0)errors.push("Unresolved source inventory");
 return errors;
}
