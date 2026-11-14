"use strict";
const assert=require("node:assert/strict"),{chromium}=require("playwright"),http=require("node:http"),fs=require("node:fs"),path=require("node:path");
(async()=>{
let server,browser;const root=path.resolve(__dirname,"..");
const url=process.env.QA_URL||await new Promise((resolve,reject)=>{
server=http.createServer((req,res)=>{
const file=path.resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));
if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
fs.readFile(file,(e,b)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{"content-type":({".html":"text/html;charset=utf-8",".js":"text/javascript;charset=utf-8",".json":"application/json",".css":"text/css;charset=utf-8"}[path.extname(file)]||"application/octet-stream")});res.end(b)});
});server.once("error",reject);server.listen(0,"127.0.0.1",()=>resolve("http://127.0.0.1:"+server.address().port+"/index.html"));});
try{browser=await chromium.launch({headless:true,channel:process.env.QA_CHROME_CHANNEL||undefined});
for(const width of [1440,768,390,360]){
const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on("pageerror",e=>errors.push(e.message));
await page.goto(url+"?single="+width,{waitUntil:"networkidle"});
if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
const nav=page.locator("#stepNav"),primary=nav.locator(".nav-primary");
const metrics=await page.evaluate(()=>{const n=document.querySelector("#stepNav"),btns=[...n.querySelectorAll(".nav-primary>button")],pr=n.querySelector(".nav-primary"),strip=n.querySelector(".nav-ux-strip");return {navHeight:n.getBoundingClientRect().height,primaryHeight:pr.getBoundingClientRect().height,childCount:btns.length,rows:new Set(btns.map(b=>Math.round(b.getBoundingClientRect().top))).size,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,secondaryVisible:strip?getComputedStyle(strip).display:"none"}});
assert.equal(metrics.rows,1,"initial rows "+JSON.stringify(metrics));
assert.ok(metrics.navHeight<=61,"height "+JSON.stringify(metrics));assert.equal(metrics.secondaryVisible,"none");assert.ok(metrics.overflow<=2);
assert.equal(await primary.locator("button").count(),9);
const toggle=primary.locator(".nav-ux-steps-toggle");await toggle.click();assert.equal(await toggle.getAttribute("aria-expanded"),"true");await toggle.click();assert.equal(await toggle.getAttribute("aria-expanded"),"false");
for(const [label,step] of [["規則速查",8],["法術圖鑑",9],["商店購物",10],["角色百科",12],["冒險圖鑑",13],["跑團狀態",11]]){await primary.locator("button").filter({hasText:label}).click();assert.equal(await page.locator(".step-panel.active").getAttribute("data-step"),String(step));const after=await page.evaluate(()=>({height:document.querySelector("#stepNav").getBoundingClientRect().height,rows:new Set([...document.querySelectorAll(".nav-primary>button")].map(b=>Math.round(b.getBoundingClientRect().top))).size}));assert.ok(after.height<=61,label+" height "+after.height);assert.equal(after.rows,1,label+" rows "+after.rows)}
assert.ok(await primary.locator(".nav-ux-back").count());assert.deepEqual(errors,[]);
console.log(JSON.stringify({width,pass:true,...metrics}));await page.close();
}}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
