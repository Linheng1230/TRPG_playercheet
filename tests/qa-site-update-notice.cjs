"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),cp=require("node:child_process"),assert=require("node:assert/strict");
const root=path.resolve(__dirname,"..");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"dnd5r-version-"));
const shaA="a".repeat(40),shaB="b".repeat(40);
function build(sha){
 const output=path.join(temp,"dnd5r-pages-site");
 const p=cp.spawnSync(process.execPath,[path.join(root,"scripts/prepare-pages-site.cjs"),output],{cwd:root,encoding:"utf8",env:{...process.env,GITHUB_SHA:sha}});
 assert.equal(p.status,0,"Pages producer must build: "+(p.stderr||p.stdout).slice(-700));
 return output;
}
try{
 for(const version of [shaA,shaB]){
  const dir=build(version);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,"site-version.json"),"utf8"));
  assert.deepEqual(manifest,{schemaVersion:1,sha:version});
  for(const page of ["home.html","index.html"]){
   const html=fs.readFileSync(path.join(dir,page),"utf8");
   assert(html.includes('name="dnd5r-build-version" content="'+version+'"'),page+" stamped SHA");
   assert(html.includes('assets/site-update-notice.js?v=1'),page+" linked notice script");
   assert(html.includes('assets/site-update-notice.css?v=1'),page+" linked notice stylesheet");
   assert(!html.includes("__DND5R_BUILD_VERSION__"),page+" no template marker in package");
  }
  assert(fs.existsSync(path.join(dir,"assets/site-update-notice.js")),"packaged JS");
  assert(fs.existsSync(path.join(dir,"assets/site-update-notice.css")),"packaged CSS");
  assert(!fs.existsSync(path.join(root,"site-version.json")),"no tracked runtime manifest or second store");
 }
 const raw=fs.readFileSync(path.join(root,"index.html"),"utf8");
 assert(raw.includes("saveCurrent(true)"),"canonical save pipeline is used");
 assert(raw.includes("DND5RSafeVersionReload"),"save guard exists");
 assert(raw.includes('__DND5R_BUILD_VERSION__'),"canonical HTML stays unstamped");
 const invalid=cp.spawnSync(process.execPath,[path.join(root,"scripts/prepare-pages-site.cjs"),path.join(temp,"dnd5r-pages-site")],{cwd:root,encoding:"utf8",env:{...process.env,GITHUB_SHA:"bad-build"}});
 assert.notEqual(invalid.status,0,"invalid SHA must fail closed");
 console.log("PASS site update manifest producer, 2 HTML stamps, no false release identity, invalid SHA rejects");
}finally{fs.rmSync(temp,{recursive:true,force:true})}
