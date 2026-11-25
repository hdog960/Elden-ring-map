export function validateCatalog(c,{release=false}={}){
 const errors=[];if(!c||c.schema!==1||typeof c.version!=="string"||!Array.isArray(c.encounters)||!Array.isArray(c.layers))return ["Invalid catalog structure"];
 const ids=new Set(),layers=new Map();
 for(const l of c.layers){if(!l||typeof l.id!=="string"||layers.has(l.id)||!Array.isArray(l.bounds)||l.bounds.length!==4||!l.bounds.every(Number.isFinite)||l.bounds[0]>=l.bounds[2]||l.bounds[1]>=l.bounds[3])errors.push("Invalid layer");else layers.set(l.id,l);}
 for(const e of c.encounters){if(!e||typeof e.id!=="string"||!/^er:[a-z0-9-]+$/.test(e.id)){errors.push("Invalid encounter ID");continue;}
 if(ids.has(e.id))errors.push("Duplicate "+e.id);ids.add(e.id);
 if(!["base","dlc"].includes(e.game)||!["primary","extended"].includes(e.hunt)||!e.name||!e.region||!e.location)errors.push("Invalid identity "+e.id);
 if(release){const l=layers.get(e.marker?.layer),x=e.marker?.x,y=e.marker?.y;if(!l||!Number.isFinite(x)||!Number.isFinite(y)||x<l.bounds[0]||x>l.bounds[2]||y<l.bounds[1]||y>l.bounds[3]||e.marker.verified!==true)errors.push("Unverified marker "+e.id);
 for(const k of ["directions","grace","strategy","rewards","conditions","combat","preparation"])if(typeof e[k]!=="string"||!e[k].trim()||/^(todo|tbd|placeholder)$/i.test(e[k].trim()))errors.push("Missing "+k+" "+e.id);
 if(!Array.isArray(e.sources)||new Set(e.sources.filter(s=>typeof s==="string"&&s.startsWith("https://"))).size<2)errors.push("Insufficient source references "+e.id);}
 }
 if(release){if(!c.releaseReady||!c.audit?.reconciled||!c.audit?.geographyVerified||!c.audit?.licensesVerified)errors.push("Release audits incomplete");
 for(const game of ["base","dlc"])if(!c.encounters.some(e=>e.game===game&&e.hunt==="primary"))errors.push("No primary "+game+" encounters");
 for(const id of ["surface","underground","shadow"])if(!layers.has(id))errors.push("Missing layer "+id);}
 return errors;
}
export function counts(c,defeated={}){const primary=c.encounters.filter(e=>e.hunt==="primary");const count=items=>({total:items.length,defeated:items.filter(e=>Object.hasOwn(defeated,e.id)).length});return {overall:count(primary),base:count(primary.filter(e=>e.game==="base")),dlc:count(primary.filter(e=>e.game==="dlc")),extended:count(c.encounters.filter(e=>e.hunt==="extended"))};}
