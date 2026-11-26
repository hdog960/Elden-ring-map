// Count only explicit blockers; absence of a mark is not evidence of availability.
// Conflicting historical marks are preserved, counted as recorded, and disclosed.
export function questProgress(encounters,defeated={},profiles=[]){
 const rows=encounters.filter(r=>r.hunt==="extended"),has=(p,id)=>Object.hasOwn(p,id),known=new Set(rows.map(r=>r.id));
 const blocked=rows.filter(r=>(r.blockedBy??[]).some(id=>known.has(id)&&has(defeated,id)));
 const blockedIds=new Set(blocked.map(r=>r.id)),crossConflicts=blocked.filter(r=>has(defeated,r.id)).map(r=>r.id);
 const groups=new Map(),ordinary=[];for(const r of rows){if(r.exclusiveGroup){if(!groups.has(r.exclusiveGroup))groups.set(r.exclusiveGroup,[]);groups.get(r.exclusiveGroup).push(r.id);}else ordinary.push(r.id);}
 const available=id=>!blockedIds.has(id)||has(defeated,id),journeyOrdinary=ordinary.filter(available),journeyGroups=[...groups.values()].filter(ids=>ids.some(available));
 const active=journeyOrdinary.filter(id=>has(defeated,id)).length+journeyGroups.filter(ids=>ids.some(id=>has(defeated,id))).length;
 const union=new Set(Object.keys(defeated));for(const p of profiles)for(const id of Object.keys(p.defeated??{}))union.add(id);
 const all=rows.map(r=>r.id);
 return {journey:{defeated:active,total:journeyOrdinary.length+journeyGroups.length},collection:{defeated:all.filter(id=>union.has(id)).length,total:all.length},conflicts:[...groups].filter(([,ids])=>ids.filter(id=>has(defeated,id)).length>1).map(([key])=>key),groups:[...groups].map(([id,ids])=>({id,ids,chosen:ids.filter(x=>has(defeated,x))})),blocked:blocked.map(r=>r.id),crossConflicts};
}
