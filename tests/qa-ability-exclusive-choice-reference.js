"use strict";
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
(async()=>{
  const browser=await chromium.launch({headless:true,channel:"chrome"});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on("pageerror",e=>errors.push(String(e)));
    await page.goto(pathToFileURL(path.resolve(__dirname,"../index.html")).href+"?qa-ability-choices=1",{waitUntil:"domcontentloaded"});
    const result=await page.evaluate(()=>{
      resetAll();S.ruleset="2024";syncRulesetUI();
      const before=JSON.stringify(S.classChoices2024||{});
      const rows=abilityRefRows(),problems=[],checks=[];
      const check=(ok,label,detail="")=>{checks.push(label);if(!ok)problems.push({label,detail})};
      const pairs=[
        ["牧師","神聖秩序","衛道者","奇術師",1],
        ["德魯伊","原初秩序","魔法師","守望者",1],
        ["牧師","受祝打擊","神聖打擊","強效施法",7],
        ["德魯伊","元素之怒","強效施法","原初打擊",7]
      ];
      for(const [cls,key,a,b,lv] of pairs){
        const source=cls+"｜"+key;
        const found=rows.filter(x=>x.kind==="choice"&&x.source===source);
        check(found.length===2,source+" two option entries");
        const split=canonicalChoiceSplit5R(cls,"",key,lv);
        for(const [i,n] of [a,b].entries()){
          const shown=displayName5R("classOptions",n),item=found.find(x=>x.name===shown);
          check(!!item,source+" "+shown+" exists");
          check(item?.text===split?.effects?.[i],source+" "+shown+" exact branch",item?.text?.slice(0,150));
          check(item?.text!==split?.effects?.[1-i],source+" "+shown+" not sibling");
        }
      }
      const parent=rows.find(x=>x.kind==="class"&&x.source.includes("德魯伊")&&x.name.includes("原初職能"));
      check(!!parent&&parent.text.includes("不會同時全部獲得")&&parent.text.includes("術師")&&parent.text.includes("衛士"),"parent tells encyclopedia choice not all granted",parent?.text?.slice(0,300));
      const useTime=[
        ["野蠻人","野心之道","荒野之怒",3,3],
        ["野蠻人","野心之道","荒野偉力",14,3],
        ["德魯伊","星辰結社","星辰形態",3,3],
        ["術士","異怪心靈","血肉啟示",14,4]
      ];
      for(const [cls,sub,key,lv,count] of useTime){
        const source=window.resolveFeatureRule2024(cls,sub,key,lv);
        const resolved=abilityReferenceFeatureText5R(cls,sub,key,lv,source);
        check(resolved.includes("不代表同時")||resolved.includes("不會全部自動"),cls+" "+key+" choice caution",resolved.slice(0,240));
        const nested=window.ZIZI_5R_NESTED_CHOICE_RULES?.[[cls,sub,key,lv].join("|")];
        const split=canonicalChoiceSplit5R(cls,sub,key,lv);
        check((nested?.options?.length||split?.effects?.length)===count,cls+" "+key+" complete choice list");
      }
      check(JSON.stringify(S.classChoices2024||{})===before,"ability lookup does not initialize unrelated class choice state");
      check(abilityMeta("射程 30 呎；再移動 10 尺").ranges.join(",")==="30呎,10尺","range tags accept 呎 and legacy 尺");
      S.ruleset="2014";check(abilityRefRows().length===0,"2014 lookup stays unchanged");
      return {checks:checks.length,problems,total:rows.length};
    });
    assert.deepEqual(errors,[],"browser exceptions");
    assert.deepEqual(result.problems,[],"ability reference option regression");
    console.log("PASS ability reference canonical choice split",JSON.stringify(result));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
