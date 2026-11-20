// Publish only static assets from the D&D 5R project. No backend, tests or private data.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const out=path.resolve(process.argv[2]||"");
if(!["dnd5r-pages-site","site-package"].includes(path.basename(out)))throw Error("UNAUTHORIZED_OUTPUT_PATH");
if(out===root||out.startsWith(root+path.sep))throw Error("OUTPUT_MUST_BE_OUTSIDE_REPOSITORY");
const dirs=["assets","cloud-vault"];
// Keep HTML byte-identical on Windows and Ubuntu, regardless of checkout EOLs.
const canonicalManifestBytes=(name,bytes)=>name==="index.html"
  ?Buffer.from(bytes.toString("utf8").replace(/\r\n/g,"\n"),"utf8"):bytes;
const roots=fs.readdirSync(root,{withFileTypes:true}).filter(x=>x.isFile()&&(x.name.endsWith(".html")||["robots.txt",".nojekyll"].includes(x.name))).map(x=>x.name);
for(const dir of dirs)if(!fs.existsSync(path.join(root,dir)))throw Error("MISSING_SITE_DIR_"+dir);
for(const file of ["index.html","home.html",".nojekyll"])if(!roots.includes(file))throw Error("MISSING_SITE_ENTRY_"+file);
const bundleDir=path.join(root,"cloud-vault");
const jsFiles=fs.readdirSync(path.join(bundleDir,"assets")).filter(x=>x.endsWith(".js"));
if(!jsFiles.length)throw Error("NO_CLOUD_JS");
// Manifest is generated before Git checkout; verify actual files, not just URLs.
const declared=JSON.parse(fs.readFileSync(path.join(bundleDir,"build-manifest.json"),"utf8"));
if(declared.mode!=="PRODUCTION_RELEASE_CANDIDATE_NOT_DEPLOYED"||!Array.isArray(declared.files)||declared.files.length<3)throw Error("MISSING_RELEASE_MANIFEST");
for(const asset of declared.files){
 if(typeof asset.file!=="string"||!/^([A-Za-z0-9._-]+|assets\/[A-Za-z0-9._-]+)$/.test(asset.file)||!(/^[a-f0-9]{64}$/.test(asset.sha256)))throw Error("INVALID_MANIFEST_ITEM");
 const full=path.resolve(bundleDir,asset.file);
 if(!full.startsWith(bundleDir+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile())throw Error("MISSING_MANIFEST_ASSET");
 const actual=crypto.createHash("sha256").update(canonicalManifestBytes(asset.file,fs.readFileSync(full))).digest("hex");
 if(actual!==asset.sha256)throw Error("RELEASE_MANIFEST_SHA_MISMATCH:"+asset.file);
}
for(const file of jsFiles) {
 const text=fs.readFileSync(path.join(bundleDir,"assets",file),"utf8");
 if(text.includes("scintillating-hornet-218.convex.cloud"))throw Error("DEV_DATABASE_URL_MUST_NOT_SHIP");
 if([...text.matchAll(/https:\/\/[a-z0-9-]+\.convex\.cloud/gi)].some(x=>!["https://happy-otter-123.convex.cloud","https://canny-chickadee-40.convex.cloud"].includes(x[0])))throw Error("UNAPPROVED_DATABASE_URL_MUST_NOT_SHIP");
 if(!text.includes("https://canny-chickadee-40.convex.cloud"))throw Error("PRODUCTION_ENDPOINT_MISSING");
}
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const file of roots)fs.copyFileSync(path.join(root,file),path.join(out,file));
for(const dir of dirs)fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true,filter:src=>!fs.lstatSync(src).isSymbolicLink()});
fs.writeFileSync(path.join(out,"cloud-vault/index.html"),canonicalManifestBytes("index.html",fs.readFileSync(path.join(bundleDir,"index.html"))));
const list=(dir,prefix="")=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?list(path.join(dir,e.name),prefix+e.name+"/"):[prefix+e.name]);
const all=list(out);
for(const file of all)if(file.startsWith("cloud-free/")||file.startsWith("tests/")||file.startsWith("scripts/")||file.startsWith(".github/")||file.includes("node_modules/")||file.endsWith(".env.local")||file.endsWith(".key"))throw Error("EXCLUDED_SOURCE_EXPOSED:"+file);
for(const file of ["cloud-vault/index.html","cloud-vault/build-manifest.json","index.html","home.html"])if(!all.includes(file))throw Error("MISSING_DELIVERY_FILE_"+file);
for(const file of ["assets/character-sheet-export.js","assets/vendor/pdf-lib.min.js"])if(fs.existsSync(path.join(root,file))) {
 const sha=p=>crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
 if(sha(path.join(root,file))!==sha(path.join(out,file)))throw Error("ASSET_HASH_MISMATCH_"+file);
}
const audit={sourceRoot:"isolated RC",artifactRoot:out,files:all.length,bytes:all.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0),excluded:["cloud-free/","tests/","scripts/",".github/","node_modules/","*.env.local"],siteEntry:["index.html","home.html","cloud-vault/index.html"],stagingBackendAbsent:true,productionEndpointVerified:true,status:"STATIC_PACKAGE_PASS__PROD_CANDIDATE_NOT_DEPLOYED"};
// Keep the audit beside the output directory, outside the publicly uploaded site.
// This works on both Windows worktrees and GitHub Actions Ubuntu runners.
const qa=path.join(path.dirname(out),"pages-artifact-audit.json");
fs.writeFileSync(qa,JSON.stringify(audit,null,2)+"\n","utf8");
console.log("PAGES_ARTIFACT="+audit.status+" files="+audit.files+" bytes="+audit.bytes);
