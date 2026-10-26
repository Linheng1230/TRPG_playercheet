"use strict";
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const assert=(ok,msg)=>{if(!ok)throw new Error(msg)};
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:"chrome"});
  const page=await browser.newPage();const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.goto(URL,{waitUntil:"networkidle"});
  const d=await page.evaluate(()=>{
    const dwarf=SPECIES_2024.find(x=>x.n==="矮人");
    const rogue=PROG_2024["遊蕩者"];
    const soul=rogue.subs.find(x=>x.n==="靈魂之刃");
    return {
      dwarf:dwarf?.traits||[],
      soulProgression:soul?.f||{},
      psi:SUBD["魂刃靈能力量"],
      blade:SUBD["念刃"],
      bladeLegacy:SUBD["心靈之刃"],
      soulBlade:SUBD["靈魂之刃"],
      veil:SUBD["靈能面紗"],
      rend:SUBD["撕裂心智"]
    };
  });
  assert(!errors.length,"page errors: "+errors.join(" | "));
  const stone=d.dwarf.find(x=>x.startsWith("石知覺:"))||"";
  for(const token of ["感官沉入","附贈動作","60尺","10分鐘","岩石","熟練加值","長休全恢復"])assert(stone.includes(token),"Dwarf Stonecunning missing: "+token);
  assert(String(d.soulProgression[3]).includes("念刃"),"Soulknife level 3 progression not using 念刃");
  assert(String(d.soulProgression[13]).includes("靈能面紗"),"Soulknife level 13 progression not using 靈能面紗");
  for(const token of ["3級4枚d6","5級6枚d8","9級8枚d8","11級8枚d10","13級10枚d10","17級12枚d12","短休恢復1枚","長休全恢復","靈振訣竅","心靈低語","傳送/接收訊息均無需動作","可無需動作斷線","每長休免費1次"])assert(d.psi.includes(token),"Soulknife Psionic Power missing: "+token);
  for(const token of ["靈能凝成一把閃亮刀刃","攻擊動作","藉機攻擊","簡易武器","1d6心靈+該次攻擊屬性","靈巧","60/120","侵擾","不占武器精通","附贈動作","1d4心靈+該次攻擊屬性"])assert(d.blade.includes(token),"Psychic Blades missing: "+token);
  for(const token of ["只有因此命中才消耗","附贈動作","×10尺"])assert(d.soulBlade.includes(token),"Soul Blades missing: "+token);
  for(const token of ["魔法動作","1小時","造成傷害","豁免","長休","1枚靈能骰"])assert(d.veil.includes(token),"Psychic Veil missing: "+token);
  for(const token of ["偷襲","感知豁免","8+熟練加值+敏捷調整值","1分鐘","目標在自己每回合結束時重複豁免","長休","3枚靈能骰"])assert(d.rend.includes(token),"Rend Mind missing: "+token);
  console.log(JSON.stringify({pass:true,dwarfStonecunning:stone,soulknife:{level3:d.soulProgression[3],level9:d.soulProgression[9],level13:d.soulProgression[13],level17:d.soulProgression[17]}},null,2));
 } finally {if(browser)await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
