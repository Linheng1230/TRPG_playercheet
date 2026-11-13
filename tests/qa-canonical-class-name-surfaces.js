"use strict";
const {chromium}=require("playwright"),assert=require("assert");
const url=process.env.QA_URL||"http://127.0.0.1:18963/index.html";
(async()=>{const browser=await chromium.launch({headless:true,channel:"chrome"});try{
for(const rule of ["2014","2024"])for(const width of [390,1440]){
const p=await browser.newPage({viewport:{width,height:844}});const errors=[];p.on("pageerror",e=>errors.push(e.message));
await p.goto(url,{waitUntil:"networkidle"});await p.evaluate(r=>{document.querySelector("#rulesetModal")?.classList.remove("open");resetState();S.ruleset=r;syncRulesetUI();go(0)},rule);
const cards=await p.locator("#classGrid .name").allInnerTexts();assert.equal(cards.length,12);
assert(cards.some(x=>x.includes("聖騎士")),JSON.stringify(cards));assert(cards.some(x=>x.includes("契術師")),JSON.stringify(cards));
assert(cards.every(x=>!x.includes("聖武士")&&!x.includes("邪術師")),JSON.stringify(cards));
const filterNames=await p.locator('.spell-filter-chip[data-sf-group="cls"][data-sf-value="P"], .spell-filter-chip[data-sf-group="cls"][data-sf-value="K"]').allInnerTexts();
assert.deepStrictEqual(filterNames,["聖騎士","契術師"],"spell filter terminology");
for(const [oldName,newName] of [["聖武士","聖騎士"],["邪術師","契術師"]]){
await p.locator('[data-class-name="'+oldName+'"]').click();
let preview=await p.locator("#classDetail").innerText();assert(preview.includes(newName),preview);
let confirmText=await p.locator("#classGrid + .class-confirm-controls").innerText();assert(confirmText.includes(newName)&&!confirmText.includes(oldName),confirmText);
p.once("dialog",d=>{assert(d.message().includes(newName));return d.accept()});
await p.locator("#classGrid + .class-confirm-controls button").click();
let saved=await p.evaluate(()=>JSON.parse(JSON.stringify(serialize())));
assert.equal(saved.cls,oldName,"legacy stable identity retained");
confirmText=await p.locator("#classGrid + .class-confirm-controls").innerText();assert(confirmText.includes(newName)&&!confirmText.includes(oldName));
await p.evaluate(x=>{deserialize(x);renderClasses()},saved);
assert((await p.locator("#classGrid + .class-confirm-controls").innerText()).includes(newName),"read back display");
await p.evaluate(()=>{resetState();go(0)});
}
for(const [legacy,canonical] of [["聖武士","聖騎士"],["邪術師","契術師"]]){
  const visible=await p.evaluate(({legacy})=>{S.cls=CLASSES.find(c=>c.n===legacy);S.classLevels={[legacy]:4};S.level=4;S.sub=0;S.classConfirmed=true;S.base={str:15,dex:14,con:13,int:12,wis:10,cha:16};go(5);const level=document.querySelector(".step-panel.active").innerText;go(7);const sheet=document.querySelector(".step-panel.active").innerText;return{level,sheet,key:serialize().cls,readable:displayName5R("classes",S.cls.n),hasPdfExporter:typeof window.exportOfficialCharacterSheet==="function"}}, {legacy});
  assert.equal(visible.key,legacy,"internal identity stays legacy");
  assert(visible.readable===canonical&&visible.hasPdfExporter,"readable canonical class and PDF exporter available");
  for(const str of [visible.level,visible.sheet]){
    assert(!str.includes(legacy),"outdated class name leaked into visible class UI: "+legacy+" "+str.slice(0,250));
    assert(str.includes(canonical)||str===visible.sheet,"canonical name expected");
  }
}
assert.deepStrictEqual(errors,[]);
console.log("PASS canonical class names "+rule+" "+width);
await p.close();
}
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
