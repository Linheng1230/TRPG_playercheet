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
// Regression: an edited React signup page must ship as a rebuilt cloud-vault bundle,
// not only as unused cloud-free/src source. Fail before upload if it is stale.
const bundledScripts=files.filter(f=>f.startsWith("cloud-vault/assets/")&&f.endsWith(".js"));
const manifestScripts=manifest.files.map(x=>"cloud-vault/"+x.file).filter(x=>x.endsWith(".js"));
assert.deepEqual(bundledScripts.slice().sort(),manifestScripts.slice().sort(),"Unmanifested or stale cloud-vault JavaScript");
const compiled=bundledScripts.map(f=>fs.readFileSync(path.join(output,f),"utf8")).join("\n");
assert(compiled.includes("註冊密碼至少 10 個字元"),"The shipped signup hint is missing (unrebuilt Vite bundle)");
assert(compiled.includes("註冊成功後，自動把這個瀏覽器已有的角色合併到雲端"),"Signup auto-merge consent is missing from deployed bundle");
assert(compiled.includes("合併本機角色到雲端"),"Existing-account one-click merge is missing from deployed bundle");
assert(compiled.includes("本機資料完全保留"),"Non-destructive merge outcome is missing from deployed bundle");
assert(compiled.includes("此帳號名稱目前無法註冊"),"The shipped safe signup error mapping is missing");
assert(!compiled.includes("帳號或密碼驗證失敗，請檢查後重試。"),"Stale shared signin/signup error survived bundling");
assert(compiled.includes("https://canny-chickadee-40.convex.cloud"),"Wrong public auth backend");
assert(!compiled.includes("https://scintillating-hornet-218.convex.cloud"),"Hosted QA backend must not ship");
const producer=fs.readFileSync(path.join(root,"scripts/prepare-pages-site.cjs"),"utf8");
assert(!/D:\/Tools\/zizi-ai-runtime/.test(producer),"Windows-only audit path must never return");
console.log(JSON.stringify({gate:"PORTABLE_PAGES_AUDIT_PASS",os:process.platform,publicFiles:files.length,manifestAssets:manifest.files.length,auditRelative:path.relative(path.dirname(output),auditPath)}));
