const {chromium}=require('playwright'); const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});let all=[];
for(const width of [1280,390,320]){
const p=await b.newPage({viewport:{width,height:780},isMobile:width<700,hasTouch:width<700});
const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.QA_URL||'http://127.0.0.1:18919/index.html',{waitUntil:'networkidle'});
if(await p.locator('#closeRuleset').isVisible())await p.locator('#closeRuleset').click();
await p.evaluate(()=>{
S.ruleset='2024';syncRulesetUI();window.__choiceClickCount=0;const button=document.createElement('button');button.id='qa-native-select';button.textContent='選擇';button.style.cssText='position:fixed;top:280px;left:15px;z-index:1000;padding:12px';
const child=document.createElement('span');child.className='ft';child.dataset.tipTitle='精通';child.dataset.tip='對目標進行攻擊檢定，命中後造成傷害。';child.textContent='詳細資料';button.append(child);button.onclick=()=>window.__choiceClickCount++;document.body.append(button);
const other=document.createElement('span');other.id='qa-other';other.className='ft';other.dataset.tipTitle='另一個特性';other.dataset.tip='這是另一個完整特性。';other.textContent='另一個特性';other.style.cssText='position:fixed;top:350px;left:15px;z-index:1000;background:yellow;padding:8px';document.body.append(other);
});
const btn=p.locator('#qa-native-select .ft');if(width<700)await btn.tap();else await btn.click();
const pin1=await p.evaluate(()=>rulePopoverState.pinnedType);
const selection=await p.evaluate(()=>window.__choiceClickCount);
if(width<700)await btn.tap();else await btn.click();const closed=!(await p.locator('#featureTip').isVisible());const secondSelection=await p.evaluate(()=>window.__choiceClickCount);
const other=p.locator('#qa-other');if(width<700)await other.tap();else await other.click();
const swapped=(await p.locator('#featureTip').innerText()).includes('另一個完整特性');
await p.locator('body').click({position:{x:width-3,y:740}});
const outsideClosed=!(await p.locator('#featureTip').isVisible());
all.push({width,pin1,selection,secondSelection,closed,swapped,outsideClosed,errors});await p.close();}
await b.close();console.log(JSON.stringify(all,null,2));assert(all.every(x=>x.pin1==='feature'&&x.selection===1&&x.secondSelection===2&&x.closed&&x.swapped&&x.outsideClosed&&!x.errors.length));})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
