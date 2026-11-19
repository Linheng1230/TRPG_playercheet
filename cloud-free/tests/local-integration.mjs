// Real local Convex Auth v2 and DB integration QA. Synthetic data only.
// Uses 2 independent users + second session; no credentials persisted to disk.
import { strict as assert } from "node:assert";
import {randomBytes, createHash} from "node:crypto";
import {writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {ConvexHttpClient} from "convex/browser";
import {api} from "../convex/_generated/api.js";
const URL=process.env.QA_CONVEX_URL ?? "http://127.0.0.1:3210";
// PR83 requires an admin provisioned outside public Auth. Test only on isolated local Convex:
// Auth v2 synthetic cleanup cannot safely be guaranteed for Hosted or Production.
if(URL!=="http://127.0.0.1:3210")throw Error("LOCAL_ONLY_NO_HOSTED_OR_PRODUCTION");
if(!process.env.QA_LOCAL_GM_PROVISION_MODULE)throw Error("QA_LOCAL_GM_PROVISION_MODULE_REQUIRED");
const {grantLocalSyntheticAdmin}=await import(pathToFileURL(resolve(process.env.QA_LOCAL_GM_PROVISION_MODULE)).href);
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
 await test("GM role deny-by-default and isolated local synthetic provisioning",async()=>{
   assert.equal(await a.query(api.users.myRole,{}),"user");
   assert.equal(await b.query(api.users.myRole,{}),"user");
   await rejected(()=>a.mutation(api.campaigns.create,{name:"Not a GM"}));
   await rejected(()=>b.mutation(api.campaigns.create,{name:"Not a GM"}));
   await grantLocalSyntheticAdmin({client:a,api});
   assert.equal(await a.query(api.users.myRole,{}),"admin");
   assert.equal(await b.query(api.users.myRole,{}),"user");
   await rejected(()=>b.mutation(api.campaigns.create,{name:"Still not a GM"}));
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
  assert.equal((await b.mutation(api.campaigns.join,{codeHash})).status,"joined");
  assert.equal((await b.mutation(api.campaigns.join,{codeHash})).status,"invalid");
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
 await test("Only the DM can delete a campaign, clearing access but preserving players' characters",async()=>{
  const campaignName="Convex QA "+suffix;
  await rejected(()=>b.mutation(api.campaigns.removeCampaign,{campaignId:campaign,expectedName:campaignName}));
  await rejected(()=>a.mutation(api.campaigns.removeCampaign,{campaignId:campaign,expectedName:"wrong name"}));
  const freshHash=createHash("sha256").update(randomBytes(32).toString("hex")).digest("hex");
  await a.mutation(api.campaigns.issueInvite,{campaignId:campaign,codeHash:freshHash,expiresAt:Date.now()+3600000});
  assert.equal((await b.mutation(api.campaigns.join,{codeHash:freshHash})).status,"joined");
  await b.mutation(api.campaigns.share,{campaignId:campaign,characterId:cb.id});
  assert.equal((await a.query(api.campaigns.dmRoster,{campaignId:campaign})).length,1);
  await a.mutation(api.campaigns.removeCampaign,{campaignId:campaign,expectedName:campaignName});
  assert.deepEqual(await b.query(api.campaigns.myShares,{campaignId:campaign}),[],"revoked stale share subscription fails closed");
  assert.deepEqual(await a.query(api.campaigns.dmRoster,{campaignId:campaign}),[],"deleted DM roster subscription clears");
  assert.ok(!(await a.query(api.campaigns.myCampaigns,{})).owned.some(x=>x._id===campaign));
  assert.ok(!(await b.query(api.campaigns.myCampaigns,{})).joined.some(x=>x._id===campaign));
  assert.equal((await b.mutation(api.campaigns.join,{codeHash:freshHash})).status,"invalid");
  await rejected(()=>b.mutation(api.campaigns.share,{campaignId:campaign,characterId:cb.id}));
  await rejected(()=>a.query(api.campaigns.dmReadShared,{campaignId:campaign,characterId:cb.id}));
  assert.equal(JSON.parse((await b.query(api.characters.getMineForDownload,{id:cb.id})).originalJson).play.hp,13);
  await rejected(()=>a.mutation(api.campaigns.removeCampaign,{campaignId:campaign,expectedName:campaignName}));
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
 const report={at:new Date().toISOString(),deployment:"Convex Local 127.0.0.1:3210",type:"REAL_BACKEND_INTEGRATION",usernames_and_passwords_logged:false,users:"2 synthetic users + second client",completed:results.length,pass:results.length-failure.length,fail:failure.length,tests:results,gate:failure.length?"INTEGRATION_FAIL":"LOCAL_INTEGRATION_PASS__HOSTED_MOBILE_PENDING"};
 await writeFile(new globalThis.URL("./local-integration-result.json",import.meta.url),JSON.stringify(report,null,2),"utf8");
 console.log("RESULT "+report.pass+"/"+report.completed+" "+report.gate);
 if(failure.length || results.length!==16)process.exitCode=1;
}
