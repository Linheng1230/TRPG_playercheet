"use strict";
/* GENERATED selection projection ONLY, from existing index.html canonical Creator data.
 * No hand-maintained classes, rules text or character State. Run: node scripts/build-academy-catalog-2024.js
 * CI parity: node scripts/build-academy-catalog-2024.js --check
 */
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const crypto=require("node:crypto");
const root=path.resolve(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const sources=[];
function pick(name,next,scope={}) {
  const start=html.indexOf("const "+name+"=");
  const end=html.indexOf(next,start);
  if(start<0||end<=start)throw Error("Canonical source boundary changed: "+name);
  const snippet=html.slice(start,end);
  sources.push(snippet);
  const context={...scope};
  vm.runInNewContext(snippet+"\n;this.value="+name+";",context,{timeout:3000});
  return JSON.parse(JSON.stringify(context.value));
}
const classes=pick("CLASSES","/* 2024 背景",{ALL_SKILLS:[]});
const backgrounds=pick("BACKGROUNDS_2024","/* 2024 起源專長");
const species=pick("SPECIES_2024","/* 2014 PHB 核心起源資料");
const progression=pick("PROG_2024","const PHB14_FEATURES");
if(classes.length!==12||species.length!==10||backgrounds.length!==16)
  throw Error("Canonical 2024 catalog cardinality mismatch");
const names=new Set(classes.map(c=>c.n));
const subs=Object.fromEntries(classes.map(c=>{
  const entry=progression[c.n];
  if(!entry||!Array.isArray(entry.subs)||entry.subs.length!==4)throw Error("Missing 2024 subclasses: "+c.n);
  return [c.n,{subs:entry.subs.map(s=>({n:s.n}))}];
}));
if(Object.keys(subs).length!==12||Object.values(subs).reduce((n,v)=>n+v.subs.length,0)!==48)
  throw Error("Expected 48 official subclasses");
const catalog={
  edition:"2024",schema:"academy-catalog-projection-v1",
  sourceSha256:crypto.createHash("sha256").update(sources.join("\n")).digest("hex"),
  classes:classes.map(c=>({n:c.n,pri:c.pri})),
  progression:subs,
  backgrounds:backgrounds.map(b=>({n:b.n,ab:Array.from(b.ab||[]),feat:b.feat})),
  species:species.map(s=>({n:s.n}))
};
if(catalog.backgrounds.some(b=>!b.n||!b.ab.length||!b.feat))
  throw Error("Incomplete canonical background projection");
const dest=path.join(root,"assets","data","academy-catalog-2024.js");
const content="/* AUTO-GENERATED from index.html; do not edit manually. */\n"+
  "(function(root){root.DND5RAcademyCatalog2024=Object.freeze("+
  JSON.stringify(catalog)+");})(typeof globalThis!==\"undefined\"?globalThis:this);\n";
if(process.argv.includes("--check")) {
  // Git may checkout this generated one-line bundle with CRLF on Windows.
  // A line-ending-only difference is not canonical data drift; compare normalized text.
  const expected=content.replace(/\r\n/g,"\n");
  const actual=fs.existsSync(dest)?fs.readFileSync(dest,"utf8").replace(/\r\n/g,"\n"):null;
  if(actual!==expected)
    throw Error("STALE derived catalog. Rerun node scripts/build-academy-catalog-2024.js");
  console.log("PASS academy catalog parity",catalog.sourceSha256);
} else {
  fs.writeFileSync(dest,content,"utf8");
  console.log("GENERATED academy catalog",catalog.sourceSha256,"(12 classes/48 subclasses/16 backgrounds/10 species)");
}
