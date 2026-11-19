// D&D 5R cloud-vault static packaging, isolated to the current worktree.
// Default is intentionally safe/offline. Hosted staging builds are forbidden in cloud-vault/.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const {spawnSync}=require("node:child_process");
const root=path.resolve(__dirname,"..");
const appDir=path.join(root,"cloud-free");
const outputDir=path.join(root,"cloud-vault");
const staging=process.argv.includes("--qa-staging");
const qaRoot="D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/convex-pages-rc-20261119";
const qaOutput=path.join(qaRoot,"staging-cloud-vault");
const target=staging?qaOutput:outputDir;
if (!fs.existsSync(path.join(appDir,"package-lock.json")))throw Error("Missing pinned package-lock");
if(!fs.existsSync(path.join(appDir,"node_modules")))throw Error("Run npm ci in cloud-free first");
const env={...process.env};
if(staging){
 if(env.VITE_CONVEX_URL!=="https://scintillating-hornet-218.convex.cloud")
   throw Error("QA_ONLY_MUST_USE_ISOLATED_AUTHORIZED_STAGING_URL");
}else{
 // Never ship a hosted development token or URL in the committed static release-candidate.
 delete env.VITE_CONVEX_URL;
}
const command=process.platform==="win32"?"cmd.exe":"npm";
const args=process.platform==="win32"?["/d","/s","/c","npm.cmd run build"]:["run","build"];
const result=spawnSync(command,args,{cwd:appDir,env,encoding:"utf8",timeout:90_000});
const output=[result.stdout||"",result.stderr||""].join("\n").slice(-5500);
if(result.status!==0)throw Error("VITE_BUILD_FAILED "+output);
const dist=path.join(appDir,"dist");
const srcHtml=fs.readFileSync(path.join(dist,"index.html"),"utf8");
if(!srcHtml.includes('./assets/') || srcHtml.includes('src/main.tsx'))throw Error("INVALID_VITE_STATIC_INDEX");
const files=fs.readdirSync(path.join(dist,"assets"));
if(!files.some(x=>x.endsWith(".js"))||!files.some(x=>x.endsWith(".css")))throw Error("MISSING_BUILT_ASSETS");
const scriptFiles=files.filter(x=>x.endsWith(".js")).map(x=>path.join(dist,"assets",x));
const scripts=scriptFiles.map(x=>fs.readFileSync(x,"utf8")).join("\n");
if(staging && !scripts.includes("https://scintillating-hornet-218.convex.cloud"))
 throw Error("STAGING_BUILD_MISSING_ENDPOINT");
if(!staging && [...scripts.matchAll(/https:\/\/[a-z0-9-]+\.convex\.cloud/gi)].some(x=>x[0]!=="https://happy-otter-123.convex.cloud"))
 throw Error("BLOCKED_DEV_OR_PROD_ENDPOINT_IN_RELEASE_CANDIDATE");
if(staging && scripts.includes("convex admin"))
 throw Error("SENSITIVE_STAGING_CONTENT");
if(!staging && srcHtml.includes("scintillating-hornet"))
 throw Error("STAGING_URL_LEAKED");
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.rmSync(target,{recursive:true,force:true});
fs.cpSync(dist,target,{recursive:true});
const htmlOutput=path.join(target,"index.html");fs.writeFileSync(htmlOutput,fs.readFileSync(htmlOutput,"utf8").replace(/\r+\n/g,"\n"),"utf8");
const readHash=(file)=>crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const manifest={
 source:"cloud-free React/Vite original build",
 mode:staging?"QA_STAGING_LOCAL_ONLY":"INERT_NO_ENDPOINT_PENDING_PRODUCTION_GATE",
 files:["index.html",...files.map(f=>"assets/"+f)].map(f=>({file:f,sha256:readHash(path.join(target,f))})),
};
const manifestDir=staging?qaRoot:path.join(root,"cloud-vault");
fs.writeFileSync(path.join(manifestDir,staging?"staging-bundle-manifest.json":"build-manifest.json"),JSON.stringify(manifest,null,2)+"\n","utf8");
console.log("CLOUD_VAULT_BUILD=PASS");
console.log("MODE="+manifest.mode);
console.log("OUTPUT="+target);
console.log("ASSETS="+manifest.files.length);
