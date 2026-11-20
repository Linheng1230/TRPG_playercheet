'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const js=fs.readFileSync(path.join(root,'assets/data/feature-5r-full-rules.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(js,ctx);
const db=ctx.window.ZIZI_5R_FULL_FEATURE_RULES;
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/feature-nested-labels-2024.json'),'utf8'));
let checked=0;
for(const [key,labels] of Object.entries(fixture.expected)){
 const full=db[key];
 assert(full,'missing feature '+key);
 for(const label of labels){
  assert(full.includes(label),'missing canonical nested label '+key+' > '+label);
  checked++;
 }
}
const checks={
 '術士||魔源之泉|2':['1環法術位：消耗2術法點','2環法術位：消耗3術法點','3環法術位：消耗5術法點','4環法術位：消耗6術法點','5環法術位：消耗7術法點'],
 '德魯伊||荒野變身|2':['德魯伊2級：已知4種形態','最大挑戰等級1/4','德魯伊4級：已知6種形態','德魯伊8級：已知8種形態'],
 '德魯伊|大地結社|自然守護|10':['荒漠：火焰傷害抗性','極地：寒冷傷害抗性','溫帶：閃電傷害抗性','熱帶：毒素傷害抗性'],
 '德魯伊|星辰結社|星圖|3':['骰值1：','骰值2：','骰值3：','骰值4：','骰值5：','骰值6：'],
 '戰士|靈能武士|靈能力量|3':['戰士3級：靈能骰d6','戰士5級：靈能骰d8','戰士9級：靈能骰d8','戰士11級：靈能骰d10','戰士13級：靈能骰d10','戰士17級：靈能骰d12'],
 '遊蕩者|靈魂之刃|靈能力量|3':['遊蕩者3級：靈能骰d6','遊蕩者5級：靈能骰d8','遊蕩者9級：靈能骰d8','遊蕩者11級：靈能骰d10','遊蕩者13級：靈能骰d10','遊蕩者17級：靈能骰d12'],
 '遊俠|精類浪遊者|流派法術|3':['精野之賜 d6','骰值1：','骰值6：'],
 '術士|時鐘靈魂|起源法術|3':['秩序顯跡 d6','骰值1：','骰值6：'],
 '遊俠|獸王|原初夥伴|3':['大地野獸：','海洋野獸：','天空野獸：','AC 13+你的感知調整值','HP 5+你遊俠等級的五倍','HP 4+你遊俠等級的四倍','屬性值：','野獸打擊：','原初聯結：','飛掠：']
};
let tableChecks=0;
for(const [key,fragments] of Object.entries(checks)){
 const full=db[key];assert(full,'missing table feature '+key);
 for(const phrase of fragments){
  assert(full.includes(phrase),'missing table row '+key+' > '+phrase);
  tableChecks++;
 }
}
console.log(JSON.stringify({pass:true,nestedFeatures:Object.keys(fixture.expected).length,nestedLabels:checked,tableFeatures:Object.keys(checks).length,tableChecks},null,2));
