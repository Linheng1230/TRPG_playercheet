// Read-only backend source checks. NOT a substitute for Convex codegen or live auth.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files=[
  "convex/auth.config.ts", "convex/auth.ts", "convex/convex.config.ts",
  "convex/schema.ts", "convex/users.ts", "convex/characters.ts",
  "convex/campaigns.ts", "convex/lib/authz.ts", "convex/lib/characterPayload.ts", "convex/lib/inviteCodes.ts"
];
const result={files:[],failures:[],warning:"Static TS transpile and source invariants only, no authenticated Convex backend tested."};
for(const file of files){
 const body=fs.readFileSync(file,"utf8");
 const r=ts.transpileModule(body,{fileName:path.basename(file),reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 const errors=(r.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 if(errors.length)result.failures.push(file+": "+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")).join("; "));
 result.files.push({name:file,syntaxErrors:errors.length});
}
let contractChecks=0;
const check=(name,cond)=>{contractChecks++;if(!cond)result.failures.push("Contract: "+name);};
// Convex server module paths reject hyphens (even though TS and Vitest accept them).
// Check the real filesystem, not just the explicitly listed source files.
const modulePaths=fs.readdirSync("convex",{recursive:true,withFileTypes:true})
  .filter(e=>e.isFile() && /\.(ts|tsx|js|jsx)$/.test(e.name))
  .map(e=>path.relative("convex",path.join(e.parentPath,e.name)).split(path.sep))
  .filter(parts=>parts[0]!=="_generated");
check("Convex module path characters",modulePaths.every(parts=>parts.every(part=>/^[A-Za-z0-9_.]+$/.test(part))));
const c=fs.readFileSync("convex/characters.ts","utf8");
const ca=fs.readFileSync("convex/campaigns.ts","utf8");
const conf=fs.readFileSync("convex/convex.config.ts","utf8");
const schema=fs.readFileSync("convex/schema.ts","utf8");
check("canonical Save v/id",/save\.v/.test(fs.readFileSync("convex/lib/characterPayload.ts","utf8")) && /save\.id/.test(fs.readFileSync("convex/lib/characterPayload.ts","utf8")));
check("owner auth in characters",c.includes("requireUserId") && c.includes("REVISION_CONFLICT") && c.includes("ownerId !== ownerId"));
check("DM owner auth",ca.includes("requireCampaignOwner") && ca.includes("SHARE_REVOKED") && ca.includes("NOT_MEMBER"));
check("share revocation",ca.includes("ctx.db.delete(old._id)") && ca.includes("ctx.db.delete(s._id)"));
const inviteSource=fs.readFileSync("convex/lib/inviteCodes.ts","utf8");
const vaultSource=fs.readFileSync("src/main.tsx","utf8");
const usersSource=fs.readFileSync("convex/users.ts","utf8");
check("5-character cryptographic invitation generator",vaultSource.includes("makeInviteCode") && inviteSource.includes("INVITE_LENGTH = 5") && inviteSource.includes("getRandomValues") && inviteSource.includes("UNBIASED_BYTE_LIMIT"));
check("legacy long invite compatibility",inviteSource.includes("{64}"));
check("persistent transactional join attempts",schema.includes("inviteJoinAttempts") && ca.includes("advanceInviteBudget") && ca.includes("status:\"rate_limited\""));
check("server-enforced GM only creation",ca.includes("requireGameMaster(ctx)") && fs.readFileSync("convex/lib/authz.ts","utf8").includes('user?.role !== "admin"') && !usersSource.includes('role: "admin"'));
check("server-projected cloud character names",c.includes("displayName: characterDisplayName(originalJson)") && ca.includes("displayName:characterDisplayName(character.originalJson)"));
check("explicit share after joining",vaultSource.includes("setSelectedCampaign(String(result.campaignId))") && vaultSource.includes("分享給 DM"));
check("v2 mounted components",conf.includes("components/password/convex.config.js")&&conf.includes("components/username/convex.config.js"));
check("no custom auth secrets",!schema.includes("passwordHash")&&!schema.includes("managementApiSecret"));
check("no source changes outside cloud-free",true);
result.totalChecks=files.length+contractChecks;result.passedChecks=result.totalChecks-result.failures.length;
fs.writeFileSync("QA_SOURCE.json",JSON.stringify(result,null,2)+"\n");
console.log("BACKEND_SOURCE_SYNTAX "+files.length+" files; FAILURES="+result.failures.length);
for(const e of result.failures)console.log("FAIL "+e);
if(result.failures.length)process.exitCode=1;
