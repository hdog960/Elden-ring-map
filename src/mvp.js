import {validateIntake} from "./census.js";
import {validateDrafts} from "./encyclopedia.js";
// Explicit creator-authorized playable research edition. Never promotes a marker or final release flag.
export function buildMvp({catalog,intake,stable,audit,drafts,atlas,permission}){
 const errors=[];
 const fail=(ok,message)=>{if(!ok)errors.push(message);};
 fail(catalog?.mvpReady===true&&catalog.releaseReady===false,"MVP mode not authorized or conflicts with final mode");
 fail(catalog?.mvpVersion==="mvp-20261126-v1","Unexpected MVP edition");
 const rows=intake?.rows??[],ids=new Set(stable?.ids??[]),rowIds=new Set(rows.map(r=>r.id)),decisions=audit?.decisions??[],guides=drafts?.guides??[],markers=atlas?.markers??[];
 const same=xs=>xs.length===ids.size&&new Set(xs).size===ids.size&&xs.every(id=>ids.has(id));
 errors.push(...validateIntake(intake),...validateDrafts(drafts,ids));
 fail(ids.size===291&&stable.ids.length===291&&same(rows.map(r=>r.id))&&same(decisions.map(r=>r.id))&&same(guides.map(r=>r.id)),"MVP stable census or guide coverage mismatch");
 const byId=new Map(decisions.map(d=>[d.id,d]));
 fail(rows.filter(r=>r.hunt==="primary").length===207&&rows.filter(r=>r.hunt==="extended").length===84&&rows.every(r=>byId.get(r.id)?.classification===r.hunt),"MVP classification mismatch");
 fail(markers.length===199&&new Set(markers.map(m=>m.id)).size===199&&markers.every(m=>rowIds.has(m.id)&&m.marker?.verified===false&&m.marker.projected===true&&Number.isFinite(m.marker.x)&&Number.isFinite(m.marker.y)&&atlas.layers.some(l=>l.id===m.marker.layer&&m.marker.x>=l.bounds[0]&&m.marker.x<=l.bounds[2]&&m.marker.y>=l.bounds[1]&&m.marker.y<=l.bounds[3])),"MVP projected marker coverage mismatch");
 fail(atlas?.layers?.length===3&&["surface","underground","shadow"].every(id=>atlas.layers.some(l=>l.id===id)),"MVP research layers incomplete");
 fail(permission?.grant==="https://github.com/EthanShoeDev/elden-ring-compass/issues/13#issuecomment-7180600988"&&permission?.status?.startsWith("grant-confirmed")&&typeof permission.followup==="string","MVP coordinate attribution grant missing");
 fail(catalog?.encounters?.length===0&&catalog?.layers?.length===0,"MVP must not populate final catalog");
 if(errors.length)throw Error(errors.join("; "));
 const holds=new Map();for(const h of audit.holds??[])holds.set(h.id,[...(holds.get(h.id)??[]),h.reason]);for(const h of audit.additionalMappingHolds??[])for(const id of h.ids)holds.set(id,[...(holds.get(id)??[]),h.reason]);
 const mapped=new Set(markers.map(m=>m.id));
 return {releaseReady:false,mvpReady:true,encounters:rows.map(r=>({...r,mapped:mapped.has(r.id),holds:holds.get(r.id)??[]})),mapped,version:catalog.mvpVersion};
}
export function filterPlacement(rows,placement){return rows.filter(r=>placement==="all"|| (placement==="mapped"&&r.mapped===true)||(placement==="unplaced"&&r.mapped===false));}
