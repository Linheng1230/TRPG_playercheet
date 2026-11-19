// Real local Convex Auth v2 and DB integration QA. Synthetic data only.
// Uses 2 independent users + second session; no credentials persisted to disk.
import { strict as assert } from "node:assert";
import {randomBytes, createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {ConvexHttpClient} from "convex/browser";
import {api} from "../convex/_generated/api.js";
const URL=process.env.QA_CONVEX_URL ?? "http://127.0.0.1:3210";
const HOSTED_URL="https://scintillating-hornet-218.convex.cloud";
const PRODUCTION_URL="https://canny-chickadee-40.convex.cloud";
if (!["http://127.0.0.1:3210",HOSTED_URL,PRODUCTION_URL].includes(URL)) throw Error("QA host is not an explicitly authorized Convex deployment");
const isHosted=URL===HOSTED_URL;
const isProd=URL===PRODUCTION_URL;
const suffix=randomBytes(6).toString("hex");
const createCredentials=label=>({username:"dndqa_"+label+"_"+suffix,password:"LocalQa!"+randomBytes(24).toString("base64url")});
const A=createCredentials("a"),B=createCredentials("b");
const a=new ConvexHttpClient(URL),b=new ConvexHttpClient(URL),bSecondDevice=new ConvexHttpClient(URL);
const results=[];
async function test(name,fn){
 try{await fn();results.push({name,status:"PASS"});console.log("PASS "+name)}
 catch(e){results.push({name,status:"FAIL",message:String(e?.message??e).replace(/LocalQa![^\s"']+/g,"[redacted]").slice(0,450)});console.error("FAIL "+name+" "+results.at(-1).message);throw e}
}
async function rejected(asyncFn){
 let failed=false;
 try{await asyncFn()}catch(e){failed=true}
 assert.ok(failed,"Unauthorized request was allowed");
}
async function auth(client,credentials,mode="signUp"){
 const f=mode==="signUp"?api.auth.signUpWithUsernamePassword:api.auth.signInWithUsernamePassword;
 const result=await client.mutation(f,credentials);
 assert.equal(result.status,"complete","Auth flow status complete");
 assert.ok(typeof result.tokens?.accessToken==="string");
 client.setAuth(result.tokens.accessToken);
 return result;
}
let ca,cb,campaign, code;
const saveA=JSON.stringify({v:10,ruleset:"2024",id:"charA-"+suffix,meta:{name:"角色A"},play:{hp:21},unknown:{preserve:"原始內容"}});
const saveB=JSON.stringify({v:9,ruleset:"2014",id:"charB-"+suffix,meta:{name:"角色B"},play:{hp:12},unknown:["2014","keep"]});
try {
 await test("A/B independent username-password signup without email or phone",async()=>{
  await auth(a,A);await auth(b,B);
  assert.deepEqual(await a.query(api.characters.listMine,{}),[]);
  assert.deepEqual(await b.query(api.characters.listMine,{}),[]);
 });
 await test("Unauthenticated cannot list, create campaign or upload",async()=>{
  const guest=new ConvexHttpClient(URL);
  await rejected(()=>guest.query(api.characters.listMine,{}));
  await rejected(()=>guest.mutation(api.campaigns.create,{name:"Unauthorized"}));
  await rejected(()=>guest.mutation(api.characters.upload,{originalJson:saveA,expectedRevision:null}));
 });
 await test("A 2024 Save v10 upload and exact download roundtrip",async()=>{
  ca=await a.mutation(api.characters.upload,{originalJson:saveA,expectedRevision:null});
  assert.equal(ca.revision,1);
  const obj=await a.query(api.characters.getMineForDownload,{id:ca.id});
  assert.equal(obj.originalJson,saveA);
  assert.equal(obj.ruleset,"2024");
 });
 await test("B 2014 Save v9 upload and exact download roundtrip",async()=>{
  cb=await b.mutation(api.characters.upload,{originalJson:saveB,expectedRevision:null});
  assert.equal(cb.revision,1);
  assert.equal((await b.query(api.characters.getMineForDownload,{id:cb.id})).originalJson,saveB);
 });
 await test("Owner ACL blocks cross-user reads and deletes",async()=>{
  await rejected(()=>a.query(api.characters.getMineForDownload,{id:cb.id}));
  await rejected(()=>b.query(api.characters.getMineForDownload,{id:ca.id}));
  await rejected(()=>a.mutation(api.characters.remove,{id:cb.id,expectedRevision:1}));
  const aRows=await a.query(api.characters.listMine,{});
  const bRows=await b.query(api.characters.listMine,{});
  assert.equal(aRows.length,1);assert.equal(bRows.length,1);
  assert.equal(aRows[0]._id,ca.id);assert.equal(bRows[0]._id,cb.id);
 });
 await test("Same native character ID in another account has independent ownership",async()=>{
  const c=await b.mutation(api.characters.upload,{originalJson:saveA,expectedRevision:null});
  assert.notEqual(c.id,ca.id);
  assert.equal((await b.query(api.characters.getMineForDownload,{id:c.id})).originalJson,saveA);
 });
 await test("Revision CAS blocks stale version overwrite",async()=>{
  const bNew=JSON.stringify({...JSON.parse(saveB),play:{hp:13}});
  const updated=await b.mutation(api.characters.upload,{originalJson:bNew,expectedRevision:1});
  assert.equal(updated.revision,2);
  await rejected(()=>b.mutation(api.characters.upload,{originalJson:saveB,expectedRevision:1}));
  assert.equal((await b.query(api.characters.getMineForDownload,{id:cb.id})).originalJson,bNew);
 });
 await test("Second device can re-login B and read same cloud revision",async()=>{
  await auth(bSecondDevice,B,"signIn");
  const list=await bSecondDevice.query(api.characters.listMine,{});
  const latest=list.find(x=>x._id===cb.id);
  assert.equal(latest?.revision,2);
  assert.equal(JSON.parse((await bSecondDevice.query(api.characters.getMineForDownload,{id:cb.id})).originalJson).play.hp,13);
 });
 await test("A creates campaign and single-use invitation",async()=>{
  campaign=await a.mutation(api.campaigns.create,{name:"Convex QA "+suffix});
  code=randomBytes(32).toString("hex");
  const codeHash=createHash("sha256").update(code).digest("hex");
  await a.mutation(api.campaigns.issueInvite,{campaignId:campaign,codeHash,expiresAt:Date.now()+3600000});
  await b.mutation(api.campaigns.join,{codeHash});
  await rejected(()=>b.mutation(api.campaigns.join,{codeHash}));
 });
 await test("B cannot read DM roster before sharing or invoke DM endpoint",async()=>{
  assert.deepEqual(await a.query(api.campaigns.dmRoster,{campaignId:campaign}),[]);
  await rejected(()=>b.query(api.campaigns.dmRoster,{campaignId:campaign}));
 });
 await test("B voluntarily shares character and A DM can read unchanged JSON",async()=>{
  await b.mutation(api.campaigns.share,{campaignId:campaign,characterId:cb.id});
  const roster=await a.query(api.campaigns.dmRoster,{campaignId:campaign});
  assert.equal(roster.length,1);
  const shared=await a.query(api.campaigns.dmReadShared,{campaignId:campaign,characterId:cb.id});
  assert.equal(JSON.parse(shared.originalJson).play.hp,13);
  await rejected(()=>a.mutation(api.characters.upload,{originalJson:saveB,expectedRevision:2}));
 });
 await test("B revoke share makes DM access fail immediately",async()=>{
  await b.mutation(api.campaigns.unshare,{campaignId:campaign,characterId:cb.id});
  assert.deepEqual(await a.query(api.campaigns.dmRoster,{campaignId:campaign}),[]);
  await rejected(()=>a.query(api.campaigns.dmReadShared,{campaignId:campaign,characterId:cb.id}));
 });
 await test("Leaving campaign removes shares and DM access",async()=>{
  await b.mutation(api.campaigns.share,{campaignId:campaign,characterId:cb.id});
  await b.mutation(api.campaigns.leave,{campaignId:campaign});
  assert.deepEqual(await a.query(api.campaigns.dmRoster,{campaignId:campaign}),[]);
  await rejected(()=>a.query(api.campaigns.dmReadShared,{campaignId:campaign,characterId:cb.id}));
  await rejected(()=>b.mutation(api.campaigns.share,{campaignId:campaign,characterId:cb.id}));
 });
 await test("Guest, A, B cannot recover another account via username-only mutation",async()=>{
  // Existing backend has no recovery/reset-as-other endpoint.
  assert.ok(!Object.keys(api.auth).includes("resetPasswordForUser"));
  await rejected(()=>b.mutation(api.characters.remove,{id:ca.id,expectedRevision:1}));
 });
} catch(e) {
 // Individual negative test error already captured; report is intentionally conservative.
} finally {
 const failure=results.filter(x=>x.status==="FAIL");
 const report={at:new Date().toISOString(),deployment:isProd?"Convex Free Production QA":isHosted?"Convex Free isolated Hosted Staging":"Convex Local 127.0.0.1:3210",type:"REAL_BACKEND_INTEGRATION",usernames_and_passwords_logged:false,users:"2 synthetic users + second client",completed:results.length,pass:results.length-failure.length,fail:failure.length,tests:results,gate:failure.length?"INTEGRATION_FAIL":(isProd?"PRODUCTION_BACKEND_PASS__BROWSER_PENDING":isHosted?"HOSTED_STAGING_BACKEND_PASS__BROWSER_PENDING":"LOCAL_INTEGRATION_PASS__HOSTED_MOBILE_PENDING")};
 await writeFile(new globalThis.URL(isProd?"./production-integration-result.json":isHosted?"./hosted-integration-result.json":"./local-integration-result.json",import.meta.url),JSON.stringify(report,null,2),"utf8");
 console.log("RESULT "+report.pass+"/"+report.completed+" "+report.gate);
 if(failure.length || results.length!==14)process.exitCode=1;
}
