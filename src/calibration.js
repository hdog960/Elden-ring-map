// Original affine calibration. Requires three non-collinear fitting anchors and independent holdouts.
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
function solve3(a,b){const m=a.map((row,i)=>[...row,b[i]]);for(let j=0;j<3;j++){let p=j;for(let i=j+1;i<3;i++)if(Math.abs(m[i][j])>Math.abs(m[p][j]))p=i;[m[j],m[p]]=[m[p],m[j]];if(Math.abs(m[j][j])<1e-10)throw Error("Degenerate anchors");const z=m[j][j];for(let k=j;k<4;k++)m[j][k]/=z;for(let i=0;i<3;i++)if(i!==j){const f=m[i][j];for(let k=j;k<4;k++)m[i][k]-=f*m[j][k];}}return m.map(r=>r[3]);}
export function applyTransform(t,p){if(!finite(p))throw Error("Invalid point");return {x:t.x[0]*p.x+t.x[1]*p.y+t.x[2],y:t.y[0]*p.x+t.y[1]*p.y+t.y[2]};}
export function calibrate(fit,holdout,maxResidual){
 if(!Array.isArray(fit)||fit.length<3||!Array.isArray(holdout)||holdout.length<2||!Number.isFinite(maxResidual)||maxResidual<=0)throw Error("Need fit and independent holdouts");
 const ids=new Set();for(const a of [...fit,...holdout]){if(!a?.id||ids.has(a.id)||!finite(a.world)||!finite(a.map)||!a.evidence)throw Error("Invalid or reused anchor");ids.add(a.id);}
 const origin=fit.reduce((o,a)=>({x:o.x+a.world.x/fit.length,y:o.y+a.world.y/fit.length}),{x:0,y:0});
 const scale=Math.max(...fit.map(a=>Math.hypot(a.world.x-origin.x,a.world.y-origin.y)));if(!scale)throw Error("Degenerate anchors");
 const rows=fit.map(a=>[(a.world.x-origin.x)/scale,(a.world.y-origin.y)/scale,1]);
 const gram=Array.from({length:3},(_,i)=>Array.from({length:3},(_,j)=>rows.reduce((s,r)=>s+r[i]*r[j],0)));
 const coeff=k=>{const q=solve3(gram,[0,1,2].map(i=>rows.reduce((s,r,j)=>s+r[i]*fit[j].map[k],0)));return [q[0]/scale,q[1]/scale,q[2]-(q[0]*origin.x+q[1]*origin.y)/scale];};
 const t={x:coeff("x"),y:coeff("y")};if(Math.abs(t.x[0]*t.y[1]-t.x[1]*t.y[0])<1e-14)throw Error("Collapsed transform");
 const residual=a=>{const p=applyTransform(t,a.world);return {id:a.id,error:Math.hypot(p.x-a.map.x,p.y-a.map.y)};};
 const fitResiduals=fit.map(residual),holdoutResiduals=holdout.map(residual);return {transform:t,fitResiduals,holdoutResiduals,passed:[...fitResiduals,...holdoutResiduals].every(r=>r.error<=maxResidual),maxResidual};
}
// Original vector basemap schema; input geometry must come from independently reviewed surveys, never arbitrary polygons.
export function validateGeometry(g,bounds){const errors=[];if(!g||g.schema!==1||!Array.isArray(g.features))return ["Invalid geometry"];const ids=new Set();for(const f of g.features){if(!f?.id||ids.has(f.id)||!["land","water","ridge","road","label"].includes(f.kind)||!f.evidence||f.reviewed!==true||!Array.isArray(f.points)||f.points.length<(f.kind==="label"?1:f.kind==="land"||f.kind==="water"?3:2)||f.points.some(p=>!finite(p)||p.x<bounds[0]||p.x>bounds[2]||p.y<bounds[1]||p.y>bounds[3]))errors.push("Invalid feature "+f?.id);ids.add(f?.id);}return errors;}
