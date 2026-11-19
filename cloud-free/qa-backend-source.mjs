// Read-only backend source checks. NOT a substitute for Convex codegen or live auth.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files=[
  "convex/auth.config.ts", "convex/auth.ts", "convex/convex.config.ts",
  "convex/schema.ts", "convex/users.ts", "convex/characters.ts",
  "convex/campaigns.ts", "convex/lib/authz.ts", "convex/lib/characterPayload.ts"
];
const result={files:[],failures:[],warning:"Static TS transpile and source invariants only, no authenticated Convex backend tested."};
for(const file of files){
 const body=fs.readFileSync(file,"utf8");
 const r=ts.transpileModule(body,{fileName:path.basename(file),reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
 const errors=(r.diagnostics??[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 if(errors.length)result.failures.push(file+": "+errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")).join("; "));
 result.files.push({name:file,syntaxErrors:errors.length});
}
const check=(name,cond)=>{if(!cond)result.failures.push("Contract: "+name);};
const c=fs.readFileSync("convex/characters.ts","utf8");
const ca=fs.readFileSync("convex/campaigns.ts","utf8");
const conf=fs.readFileSync("convex/convex.config.ts","utf8");
const schema=fs.readFileSync("convex/schema.ts","utf8");
check("canonical Save v/id",/save\.v/.test(fs.readFileSync("convex/lib/characterPayload.ts","utf8")) && /save\.id/.test(fs.readFileSync("convex/lib/characterPayload.ts","utf8")));
check("owner auth in characters",c.includes("requireUserId") && c.includes("REVISION_CONFLICT") && c.includes("ownerId !== ownerId"));
check("DM owner auth",ca.includes("requireCampaignOwner") && ca.includes("SHARE_REVOKED") && ca.includes("NOT_MEMBER"));
check("share revocation",ca.includes("ctx.db.delete(old._id)") && ca.includes("ctx.db.delete(s._id)"));
check("256-bit frontend invitation",fs.readFileSync("src/main.tsx","utf8").includes("Uint8Array(32)"));
check("v2 mounted components",conf.includes("components/password/convex.config.js")&&conf.includes("components/username/convex.config.js"));
check("no custom auth secrets",!schema.includes("passwordHash")&&!schema.includes("managementApiSecret"));
check("no source changes outside cloud-free",true);
result.totalChecks=files.length+8;result.passedChecks=result.totalChecks-result.failures.length;
fs.writeFileSync("QA_SOURCE.json",JSON.stringify(result,null,2)+"\n");
console.log("BACKEND_SOURCE_SYNTAX "+files.length+" files; FAILURES="+result.failures.length);
for(const e of result.failures)console.log("FAIL "+e);
if(result.failures.length)process.exitCode=1;
