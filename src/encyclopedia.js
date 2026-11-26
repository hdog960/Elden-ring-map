export const guideFields=["grace","directions","conditions","combat","strategy","rewards","preparation"];
export function validateDrafts(data,ids){const errors=[],seen=new Set();if(data?.schema!==1||data.status!=="research-drafts-not-release"||!Array.isArray(data.guides))return ["Invalid encyclopedia"];for(const g of data.guides){if(!ids.has(g.id)||seen.has(g.id))errors.push("Invalid guide ID "+g.id);seen.add(g.id);if(g.review!=="draft-researched"||guideFields.some(k=>typeof g[k]!=="string"||!g[k].trim())||new Set(g.sources??[]).size<2||!(g.sources??[]).every(s=>s.startsWith("https://"))||!Array.isArray(g.unresolved)||!g.unresolved.length)errors.push("Incomplete guide "+g.id);if(Object.values(g.numericStats??{}).some(v=>v!==null))errors.push("Unqualified numeric stats "+g.id);}return errors;}
export function searchEncounters(rows,query,{game="all",hunt="all",region="all",completion="all",defeated={},sort="region"}={}){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);const result=rows.filter(r=>(game==="all"||r.game===game)&&(hunt==="all"||r.hunt===hunt)&&(region==="all"||r.region===region)&&(completion==="all"||(completion==="defeated")===Object.hasOwn(defeated,r.id))&&terms.every(t=>[r.name,r.region,r.location,r.category,...(r.aliases??[]),r.rewards??""].join(" ").toLowerCase().includes(t)));return result.sort((a,b)=>sort==="name"?a.name.localeCompare(b.name)||a.region.localeCompare(b.region)||a.id.localeCompare(b.id):a.game.localeCompare(b.game)||a.region.localeCompare(b.region)||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));}

// Research is deliberately unavailable to the release guide path. Never derive a total
// across phases, and never select a value from an unresolved conflict.
export function combatResearch(data,id,{releaseReady=false}={}){
 if(releaseReady||data?.status!=="corroborated-values-not-final"||!Array.isArray(data.records))return null;
 const matches=data.records.filter(r=>r.id===id);if(matches.length!==1)return null;
 const r=matches[0],positive=v=>Number.isFinite(v)&&v>0;
 if(typeof r.scope!=="string"||!r.scope||typeof r.note!=="string"||!r.note||!Array.isArray(r.sources)||new Set(r.sources.filter(x=>typeof x==="string"&&x.startsWith("https://"))).size<2||!positive(r.stance))return null;
 const conflict=r.health===null&&Array.isArray(r.reportedHealth)&&r.reportedHealth.every(positive)&&new Set(r.reportedHealth).size>=2&&/conflict|disagree/i.test(r.note);
 if(!conflict&&(!positive(r.health)||r.reportedHealth!==undefined))return null;
 const fields=[["Health",conflict?"Disputed: "+r.reportedHealth.map(v=>v.toLocaleString("en-US")).join(" / "):r.health.toLocaleString("en-US")],["Stance",String(r.stance)]];
 if(positive(r.runes))fields.push(["Runes (reported)",r.runes.toLocaleString("en-US")]);
 const types=["standard","slash","strike","pierce","magic","fire","lightning","holy"];
 const negations=types.filter(k=>Number.isFinite(r.negations?.[k])).map(k=>[k,r.negations[k]+"%"]);
 const phases=(Array.isArray(r.phaseResearch)?r.phaseResearch:[]).filter(p=>typeof p.phase==="string"&&positive(p.health)&&positive(p.stance)).map(p=>({name:p.phase,health:p.health.toLocaleString("en-US"),stance:String(p.stance)}));
 return {scope:r.scope,note:r.note,fields,negations,phases,sources:[...new Set(r.sources.filter(x=>typeof x==="string"&&x.startsWith("https://")))]};
}
