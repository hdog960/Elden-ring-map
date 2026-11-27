import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {reviewRaster,pngDimensions} from "../scripts/review-atlas-raster.mjs";
// Synthetic fixtures test intake mechanics only, not map geography or actual artwork.
async function fixture(t){
 const root=await mkdtemp(join(tmpdir(),"atlas-v02-test-"));t.after(()=>rm(root,{recursive:true,force:true}));
 async function evidence(name,bytes){await writeFile(join(root,name),bytes);return {artifact:name,sha256:createHash("sha256").update(bytes).digest("hex"),locator:"synthetic fixture"};}
 const header=Buffer.alloc(33);Buffer.from([137,80,78,71,13,10,26,10]).copy(header);header.writeUInt32BE(13,8);header.write("IHDR",12);header.writeUInt32BE(1000,16);header.writeUInt32BE(1000,20);
 const image=await evidence("header.png",header),grant=await evidence("rights.txt","synthetic permission");
 const points=[[0,0],[100,0],[0,100],[50,50],[80,20]];
 const anchors=await Promise.all(points.map(async([x,y],i)=>({id:"anchor-"+i,world:{x,y},map:{x:x*5+20,y:y*5+30},source:"synthetic",observer:"fixture",method:"independent-measurement",evidence:await evidence("anchor-"+i+".txt","evidence "+i)})));
 const input={schema:1,layer:"surface",gameVersion:"fixture",artist:"fixture",source:"fixture",image,rights:{basis:"written-grant",publicNoncommercial:true,offlineRedistribution:true,derivativeUse:true,attribution:"fixture",reviewer:"fixture",evidence:grant},fit:anchors.slice(0,3),holdout:anchors.slice(3),maxResidual:1};
 const atlas={layers:[{id:"surface",bounds:[0,0,250,250]}],markers:[{id:"er:test-a",marker:{layer:"surface",x:10,y:10}},{id:"er:test-b",marker:{layer:"surface",x:240,y:240}}]};
 return {root,input,atlas};
}
test("private candidate review reports calibrated coverage without admission",async t=>{const {root,input,atlas}=await fixture(t);const result=await reviewRaster(input,root,atlas);assert.equal(result.status,"candidate-review-only-not-admitted");assert.deepEqual(result.coverage,{projected:2,inImage:1,outside:["er:test-b"]});assert.ok(result.positions.every(p=>p.status==="projected-review-only"&&!p.verified));});
test("private intake rejects missing rights, tampered evidence, reused holdouts and bad alignment",async t=>{const {root,input,atlas}=await fixture(t);await assert.rejects(reviewRaster({...input,rights:{...input.rights,offlineRedistribution:false}},root,atlas),/use scope/);await assert.rejects(reviewRaster({...input,image:{...input.image,sha256:"0".repeat(64)}},root,atlas),/hash mismatch/);await assert.rejects(reviewRaster({...input,holdout:input.holdout.map((a,i)=>i?a:{...a,evidence:input.fit[0].evidence})},root,atlas),/independent of fit/);await assert.rejects(reviewRaster({...input,holdout:input.holdout.map((a,i)=>i?a:{...a,map:{x:a.map.x+50,y:a.map.y}})},root,atlas),/alignment/);assert.throws(()=>pngDimensions(Buffer.from("not png")),/PNG/);});
