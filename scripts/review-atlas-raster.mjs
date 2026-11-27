// Private M1 intake only. Do not copy images to the public repository or promote candidate coordinates.
import {readFile,realpath,mkdir,writeFile} from "node:fs/promises";
import {resolve,relative,isAbsolute} from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
import {calibrate,applyTransform} from "../src/calibration.js";
const digest=b=>createHash("sha256").update(b).digest("hex");
const nonempty=v=>typeof v==="string"&&v.trim().length>0;
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
const inside=(base,p)=>{const r=relative(base,p);return r===""||(!isAbsolute(r)&&r!==".."&&!r.startsWith("../")&&!r.startsWith("..\\"));};
const layers=new Set(["surface","underground","shadow"]);
export function pngDimensions(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<33||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||bytes.readUInt32BE(8)!==13||bytes.toString("ascii",12,16)!=="IHDR")throw Error("Expected PNG with IHDR");
 const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
 if(width<64||height<64||width>20000||height>20000||width*height>100000000)throw Error("PNG dimension budget");
 return {width,height};
}
export async function reviewRaster(input,evidenceRoot,atlas){
 const root=await realpath(evidenceRoot);
 if(input?.schema!==1||!layers.has(input.layer)||!nonempty(input.gameVersion)||!nonempty(input.artist)||!nonempty(input.source)||!["written-grant","original-artist-authorized"].includes(input.rights?.basis)||input.rights.publicNoncommercial!==true||input.rights.offlineRedistribution!==true||input.rights.derivativeUse!==true||!nonempty(input.rights.attribution)||!nonempty(input.rights.reviewer))throw Error("Missing candidate provenance or explicit use scope");
 async function readEvidence(e){
  if(!nonempty(e?.artifact)||isAbsolute(e.artifact)||!(/^[a-f0-9]{64}$/).test(e.sha256??"")||!nonempty(e.locator))throw Error("Missing evidence identity");
  const path=await realpath(resolve(root,e.artifact));if(!inside(root,path))throw Error("Evidence path outside root");
  const bytes=await readFile(path);if(digest(bytes)!==e.sha256)throw Error("Evidence hash mismatch");
  return bytes;
 }
 const image=await readEvidence(input.image),grant=await readEvidence(input.rights.evidence);
 if(!grant.length||input.image.sha256===input.rights.evidence.sha256)throw Error("Missing separate rights evidence");
 const {width,height}=pngDimensions(image),inImage=p=>validPoint(p)&&p.x>=0&&p.y>=0&&p.x<=width-1&&p.y<=height-1;
 if(!Array.isArray(input.fit)||!Array.isArray(input.holdout)||input.fit.length<3||input.holdout.length<2)throw Error("Need 3+ fit and 2+ holdout landmarks");
 const mapBounds=atlas.layers.find(l=>l.id===input.layer)?.bounds;
 if(!mapBounds)throw Error("Unknown atlas layer");
 const anchor=async a=>{
  if(!nonempty(a.id)||!nonempty(a.observer)||!nonempty(a.method)||["tile-center","boss-projection","guess"].includes(a.method)||!validPoint(a.world)||!inImage(a.map)||!nonempty(a.source)||a.world.x<mapBounds[0]||a.world.y<mapBounds[1]||a.world.x>mapBounds[2]||a.world.y>mapBounds[3])throw Error("Invalid independent anchor");
  await readEvidence(a.evidence);
  if(a.evidence.sha256===input.image.sha256||a.evidence.sha256===input.rights.evidence.sha256)throw Error("Anchor evidence must be separate");
  return {...a,evidence:a.evidence.locator};
 };
 const fit=await Promise.all(input.fit.map(anchor)),holdout=await Promise.all(input.holdout.map(anchor));
 const fitHashes=new Set(input.fit.map(a=>a.evidence.sha256)),holdHashes=new Set(input.holdout.map(a=>a.evidence.sha256));
 if(input.holdout.some(a=>fitHashes.has(a.evidence.sha256))||holdHashes.size<2)throw Error("Holdouts must use distinct evidence independent of fit");
 if(!Number.isFinite(input.maxResidual)||input.maxResidual<=0||input.maxResidual>Math.min(width,height)*.01)throw Error("Residual tolerance exceeds 1% of shorter image edge");
 const calibration=calibrate(fit,holdout,input.maxResidual);
 if(!calibration.passed)throw Error("Candidate artwork alignment exceeds tolerance");
 const positions=atlas.markers.filter(m=>m.marker.layer===input.layer).map(m=>{const p=applyTransform(calibration.transform,m.marker);return {id:m.id,...p,inImage:inImage(p),status:"projected-review-only"};});
 return {schema:1,status:"candidate-review-only-not-admitted",layer:input.layer,gameVersion:input.gameVersion,artist:input.artist,source:input.source,rights:input.rights,sha256:input.image.sha256,width,height,calibration,positions,coverage:{projected:positions.length,inImage:positions.filter(p=>p.inImage).length,outside:positions.filter(p=>!p.inImage).map(p=>p.id)},limitations:["PNG header and bytes authenticated; visual image inspection still required.","Submitted permission and observations require human provenance review; hashes do not establish legal rights or accuracy.","Projected candidates do not become independently verified markers.","No artwork or data copied to the public repository."]};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [input,root,out]=process.argv.slice(2);if(!input||!root||!out)throw Error("Usage: node scripts/review-atlas-raster.mjs candidate.json evidence-directory new-output-directory");
 const repo=await realpath(fileURLToPath(new URL("../",import.meta.url))),target=resolve(out),parent=await realpath(resolve(target,".."));
 if(inside(repo,resolve(parent,target.split(/[\\/]/).pop()))||inside(repo,await realpath(root)))throw Error("Private evidence and output must be outside repository");
 const {previewAtlas}=await import("../src/atlas-preview.js");
 const [intake,compass]=await Promise.all(["census/intake.json","geography/compass-research.json"].map(p=>readFile(new URL("../data/"+p,import.meta.url),"utf8").then(JSON.parse)));
 const result=await reviewRaster(JSON.parse(await readFile(input,"utf8")),root,previewAtlas(compass,intake.rows));
 await mkdir(target,{recursive:false});await writeFile(resolve(target,"review.json"),JSON.stringify(result,null,2)+"\n");
 console.log("Candidate artwork bytes and calibration reviewed; no public admission. Coverage "+result.coverage.inImage+"/"+result.coverage.projected);
}
