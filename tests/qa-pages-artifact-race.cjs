"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const file=path.resolve(__dirname,"../.github/workflows/pages.yml");
const text=fs.readFileSync(file,"utf8");
function verdict(src){
 const names=["Verify Pages artifact handoff guard","Upload site",
  "Wait for exact Pages artifact visibility","Deploy",
  "Live UAT - 2024 Darkvision tooltip and preview 150ft parity"];
 const positions=names.map(n=>src.indexOf("      - name: "+n));
 if(positions.some(n=>n<0))return false;
 if(!positions.every((n,i)=>i===0||n>positions[i-1]))return false;
 const gate=src.slice(positions[2],positions[3]);
 return (
  /^\s+actions: read\s*$/m.test(src)&&
  gate.includes("GH_TOKEN: ${{ github.token }}")&&
  gate.includes("GITHUB_REPOSITORY")&&gate.includes("GITHUB_RUN_ID")&&
  gate.includes("artifacts?name=github-pages")&&gate.includes("expired == false")&&
  gate.includes("$(seq 1 12)")&&gate.includes('if [ "${count}" -ge 1 ]')&&
  gate.includes("sleep 5")&&gate.includes("exit 1")&&
  src.includes("uses: actions/upload-pages-artifact@v3")&&
  src.includes("uses: actions/deploy-pages@v4")
 );
}
assert.equal(verdict(text),true,"exact Pages handoff guard required");
const bad=[
 text.replace(/^  actions: read\r?\n/m,""),
 text.replace("      - name: Wait for exact Pages artifact visibility","      - name: Skipped asset preflight"),
 text.replace("GITHUB_RUN_ID","GITHUB_RUN_ATTEMPT"),
 text.replace('if [ "${count}" -ge 1 ]','if [ "${count}" = "0" ]'),
 text.replace("      - name: Deploy","      - name: Premature deploy")
];
bad.forEach((variant,i)=>assert.equal(verdict(variant),false,"negative preflight control "+i));
console.log("PASS Pages artifact producer: exact-run visibility & bounded fail-closed 1+5 negative");
