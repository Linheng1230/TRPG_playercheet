// Read-only backend source checks. NOT a substitute for Convex codegen or live auth.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const files=[
  "convex/auth.config.ts", "convex/auth.ts", "convex/convex.config.ts",
  "convex/schema.ts", "convex/users.ts", "convex/characters.ts",
  "convex/campaigns.ts", "convex/lib/authz.ts", "convex/lib/characterPayload.ts", "convex/lib/inviteCodes.ts",
  "src/dm-sheet-projection.ts", "src/dm-character-sheet.tsx"
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
const validConvexLibModule=(name)=>/^[A-Za-z_][A-Za-z0-9_]*\.ts$/.test(name);
const libModuleNames=fs.readdirSync("convex/lib").filter(name=>name.endsWith(".ts"));
check("Convex helper module filenames contain no hyphens",libModuleNames.every(validConvexLibModule));
check("Convex helper filename negative regression",!validConvexLibModule("invite-codes.ts")&&validConvexLibModule("inviteCodes.ts"));
// Cover unlisted Convex modules too: the official deploy rejects invalid
// module paths even if a file is absent from the explicit TS source list.
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
check("non-destructive release has NO permanent campaign deletion backend or UI",
  !ca.includes("export const removeCampaign = mutation")
  && !ca.includes("DND5R_CAMPAIGN_DELETE_ALLOWED")
  && !fs.readFileSync("src/main.tsx","utf8").includes("anyApi.campaigns.removeCampaign"));
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
const dmSheetSource=fs.readFileSync("src/dm-sheet-projection.ts","utf8");
check("DM share viewer renders role sheet without raw JSON textarea",
  vaultSource.includes("projectDmSheet(String(shared.originalJson))")
  && vaultSource.includes("<DmCharacterSheet sheet={sheet}/>")
  && !vaultSource.includes("DM 唯讀角色 JSON"));
check("GM sheet projection never writes local storage or injects unsafe HTML",
  !dmSheetSource.includes("localStorage.setItem(")
  && !dmSheetSource.includes("dangerouslySetInnerHTML")
  && !fs.readFileSync("src/dm-character-sheet.tsx","utf8").includes("dangerouslySetInnerHTML"));
check("DM share revocation clears viewer and ignores in-flight stale responses",
  vaultSource.includes("request.current++")
  && vaultSource.includes("setSheet(null)")
  && vaultSource.includes("sharedSheetRevisionStatus(rosterRef.current,characterId,Number(shared.revision))"));
check("campaign closure is reversible and does not delete user or character records",
  schema.includes("closedAt: v.optional(v.number())")
  && ca.includes("export const closeCampaign = mutation")
  && ca.includes("export const reopenCampaign = mutation")
  && ca.includes("ctx.db.patch(campaignId, { closedAt: 0 })"));
check("closed campaign blocks issue, join and sharing while preserving existing reads",
  ca.includes('throw new Error("CAMPAIGN_CLOSED")')
  && ca.includes('if (!campaign || (campaign.closedAt ?? 0) > 0) return {status:"invalid" as const}'));
check("close revokes outstanding invite codes for reopened campaigns",
  ca.includes("await ctx.db.patch(invite._id,{revokedAt:now})"));
const handlerBody=name=>{
  const start=ca.indexOf("export const "+name+" = ");
  const end=ca.indexOf("\nexport const ",start+1);
  return start<0?"":ca.slice(start,end<0?undefined:end);
};
check("current admin checked on each GM invite and share read endpoint",
  ["issueInvite","revokeInvite","listInvites","dmRoster","dmReadShared"]
    .every(name=>handlerBody(name).includes("await requireGameMaster(ctx)"))
  && handlerBody("dmReadShared").includes("await requireCampaignOwner(ctx, campaignId)"));
check("demoted GM has no campaign management or shared-sheet UI",
  vaultSource.includes('{myRole==="admin"&&<div className="actions">')
  && vaultSource.includes('myRole==="admin"&&dmCampaign')
  && !vaultSource.includes('setDeletingCampaignId('));
check("DM cached sheet invalidates on revoked share or newer player revision",
  vaultSource.includes('sharedSheetRevisionStatus(roster,openedId,openedRevision)')
  && vaultSource.includes('sharedSheetRevisionStatus(rosterRef.current,characterId,Number(shared.revision))')
  && vaultSource.includes("setSheet(null)")
  && dmSheetSource.includes('if(!row)return "revoked"')
  && dmSheetSource.includes('return "stale"'));
const cloudCi=fs.readFileSync("../.github/workflows/qa-cloud-free-access-ui.yml","utf8").replace(/\r\n/g,"\n");
check("CI runs actual DM sheet tests and rejects false-green omissions",
  cloudCi.includes("dm-sheet-projection.test.ts")
  && cloudCi.includes("vitest-ci.json")
  && cloudCi.includes("npm test -- --reporter=json")
  && cloudCi.includes("DM_SHEET_TEST_COLLECTION_MISSING_OR_FAILED"));
check("new cloud CI has read-only GitHub permissions and cannot deploy",
  cloudCi.includes("permissions:\\n  contents: read".replace(/\\n/g,"\n"))
  && !cloudCi.includes("pages: write")
  && !cloudCi.includes("gh pr merge")
  && !cloudCi.includes("convex deploy")
  && !cloudCi.includes("actions/deploy-pages"));
result.totalChecks=files.length+contractChecks;result.passedChecks=result.totalChecks-result.failures.length;
fs.writeFileSync("QA_SOURCE.json",JSON.stringify(result,null,2)+"\n");
console.log("BACKEND_SOURCE_SYNTAX "+files.length+" files; FAILURES="+result.failures.length);
for(const e of result.failures)console.log("FAIL "+e);
if(result.failures.length)process.exitCode=1;
