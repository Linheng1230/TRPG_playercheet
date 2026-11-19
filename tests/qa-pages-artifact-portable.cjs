"use strict";
/* Release coupling regression: audit must live next to, not inside, the Pages
 * package and must work on both Windows and Ubuntu GitHub Actions runners. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const output=path.resolve(process.argv[2]||"");
assert(["dnd5r-pages-site","site-package"].includes(path.basename(output)),"Pass exact sanitized output directory");
assert(fs.statSync(output).isDirectory(),"The Pages producer must have succeeded first");
const auditPath=path.join(path.dirname(output),"pages-artifact-audit.json");
assert(fs.existsSync(auditPath),"Portable audit receipt missing beside artifact output");
assert(!fs.existsSync(path.join(output,"pages-artifact-audit.json")),"Private audit receipt leaked into Pages artifact");
const audit=JSON.parse(fs.readFileSync(auditPath,"utf8"));
assert.equal(path.resolve(audit.artifactRoot),output,"Audit describes wrong output");
assert.equal(audit.status,"STATIC_PACKAGE_PASS__PROD_CANDIDATE_NOT_DEPLOYED");
const files=[];
function walk(dir,prefix=""){
 for(const x of fs.readdirSync(dir,{withFileTypes:true})){
  const name=prefix+x.name,p=path.join(dir,x.name);
  assert(!x.isSymbolicLink(),"Links must not enter the public package");
  if(x.isDirectory())walk(p,name+"/");
  else files.push(name);
 }
}
walk(output);
assert.equal(files.length,audit.files,"Audit count must reflect actual packaged files");
assert.equal(audit.bytes,files.reduce((n,f)=>n+fs.statSync(path.join(output,f)).size,0),"Audit bytes must match");
const denied=["cloud-free/","scripts/","tests/",".github/","node_modules/"];
assert(!files.some(f=>denied.some(x=>f.startsWith(x))||f.endsWith(".env.local")),"Private files leaked");
for(const name of ["index.html","home.html","cloud-vault/index.html","cloud-vault/build-manifest.json"])assert(files.includes(name),name+" missing");
const manifest=JSON.parse(fs.readFileSync(path.join(output,"cloud-vault/build-manifest.json"),"utf8"));
for(const asset of manifest.files){
 const p=path.join(output,"cloud-vault",asset.file);
 assert(fs.existsSync(p),"Missing built asset "+asset.file);
 assert.equal(crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"),asset.sha256,"SHA mismatch "+asset.file);
}
const producer=fs.readFileSync(path.join(root,"scripts/prepare-pages-site.cjs"),"utf8");
assert(!/D:\/Tools\/zizi-ai-runtime/.test(producer),"Windows-only audit path must never return");
console.log(JSON.stringify({gate:"PORTABLE_PAGES_AUDIT_PASS",os:process.platform,publicFiles:files.length,manifestAssets:manifest.files.length,auditRelative:path.relative(path.dirname(output),auditPath)}));
