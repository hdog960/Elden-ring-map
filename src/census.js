// Research-only intake. Never automatically promote candidates to the playable catalog.
export function validateIntake(data){const errors=[];if(!data||data.schema!==1||data.status!=="candidate-not-release"||!Array.isArray(data.rows)||!data.sources)return ["Invalid intake"];
const ids=new Set();for(const r of data.rows){if(!r||!/^er:[a-z0-9-]+$/.test(r.id??"")||ids.has(r.id)){errors.push("Invalid or duplicate ID "+r?.id);continue;}ids.add(r.id);
if(!["base","dlc"].includes(r.game)||!["primary","extended"].includes(r.hunt)||!r.name||!r.region||!r.location||!r.category||!["surface","underground","shadow"].includes(r.layerHint))errors.push("Incomplete identity "+r.id);
if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.some(k=>!Object.hasOwn(data.sources,k)||!data.sources[k].startsWith("https://")))errors.push("Invalid evidence "+r.id);
if(!["single-source-candidate","cross-source-candidate","classification-review"].includes(r.review))errors.push("Invalid review state "+r.id);
if(r.review==="cross-source-candidate"&&new Set(r.evidence).size<2)errors.push("Cross-source evidence missing "+r.id);
if(r.hunt==="extended"&&!r.decision)errors.push("Extended reason missing "+r.id);
if(Object.hasOwn(r,"marker")||Object.hasOwn(r,"releaseReady"))errors.push("Unqualified coordinate or release claim "+r.id);
}return errors;}
export function censusSummary(data){const counts={base:{primary:0,extended:0},dlc:{primary:0,extended:0},review:{},regions:{}};for(const r of data.rows){counts[r.game][r.hunt]++;counts.review[r.review]=(counts.review[r.review]??0)+1;const k=r.game+":"+r.region;counts.regions[k]=(counts.regions[k]??0)+(r.hunt==="primary"?1:0);}return counts;}
export function compareStableIds(previous,next){const newIds=new Set(next.rows.map(r=>r.id));return previous.rows.filter(r=>!newIds.has(r.id)).map(r=>r.id);}
