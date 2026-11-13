/* Player-sheet quick facts only. Sources: pinned 5RTools PHB2024 tuples and full rules.
 * Not authoritative for mechanics; full spell card remains the canonical detail.
 * Do not reuse this 2024 formatter in the 2014 ruleset.
 */
(function(){
"use strict";
const rows=new Map((globalThis.SPELLS_2024_TUPLES||[]).map(r=>[r[0],r]));
const cache=new Map();
const DICE=/\b\d+d\d+(?:\s*[+＋]\s*\d+)?\b/g;
const SAVE=/(\u529b\u91cf|\u654f\u6377|\u9ad4\u8cea|\u667a\u529b|\u611f\u77e5|\u9b45\u529b)\s*\u8c41\u514d/g;
const ELEMENT=/\u9178\u8755|\u5bd2\u51b7|\u706b\u7130|\u9583\u96fb|\u6bd2\u7d20|\u96f7\u9cf4|\u9eef\u8755|\u5149\u8000|\u529b\u5834|\u7a7f\u523a|\u920d\u64ca|\u63ee\u780d|\u5fc3\u9748|\u4efb\u9078\u5143\u7d20/;
function damageDice(str){
 const s=String(str||"");
 if(!/\u50b7\u5bb3|\u5410\u606f\u653b\u64ca|\u9583\u96fb\u64ca\u4e2d/.test(s))return [];
 if(/\u50b7\u5bb3\u5177\u6709\u6297\u6027|\u514d\u75ab.{0,10}\u50b7\u5bb3|\u6e1b\u514d\u7b49\u91cf\u50b7\u5bb3|\u5171\u4eab\u50b7\u5bb3/.test(s))return [];
 const list=[];
 for(const m of s.matchAll(DICE)){
  const before=s.slice(Math.max(0,m.index-22),m.index),after=s.slice(m.index+m[0].length,m.index+m[0].length+26);
  if(/(?:\u6e1b\u53bb|\u52a0\u4e0a|\u6e1b\u514d)\s*$/.test(before)&&/\u8c41\u514d|\u6aa2\u5b9a|\u50b7\u5bb3/.test(before))continue;
  if(/\u6062\u5fa9|\u56de\u5fa9|\u6cbb\u7642|\u81e8\u6642\u751f\u547d/.test(before.slice(-14))&&!/\u50b7\u5bb3/.test(after))continue;
  if(!ELEMENT.test(after.slice(0,18))&&!/\u50b7\u5bb3|\u5410\u606f\u653b\u64ca|\u9583\u96fb\u64ca\u4e2d/.test(after.slice(0,22))&&!/(?:\u50b7\u5bb3|\u9020\u6210|\u53d7|\u8ffd\u52a0|\u9644\u52a0|\u6539\u70ba|\u518d\u9020\u6210|\u518d\u53d7)\s*$/.test(before))continue;
  const type=(after.match(ELEMENT)||[])[0]||"";
  const die=m[0].replace(/\s+/g,"");
  const display=die+(type?" "+type:"");
  if(!list.includes(display))list.push(display);
 }
 return list;
}
function saves(short,full){
 const early=String(short||"");
 const found=[];
 function add(ability,tail){
  if(/^\s*(?:\u6aa2\u5b9a)?\s*(?:\u5177\u6709|\u7372\u5f97|\u5e36\u6709|\u6642\u5177\u6709|\u4e0a\u5177\u6709)\u512a\u52e2/.test(tail)||/^\s*(?:\u4e2d)?\u5177\u6709\u512a\u52e2/.test(tail))return;
  if(!found.includes(ability))found.push(ability);
 }
 for(const m of early.matchAll(SAVE)){
  const before=early.slice(Math.max(0,m.index-30),m.index);
  const tail=early.slice(m.index+m[0].length,m.index+m[0].length+15);
  if(/\u8c41\u514d\u5177\u6709\u512a\u52e2|\u8c41\u514d\u52a0\u4e0a/.test(early))continue;
  if(/\u8c41\u514d|\u6aa2\u5b9a/.test(before)&&/\u52a0\u4e0a|\u6e1b\u53bb|\u512a\u52e2/.test(tail))continue;
  add(m[1],tail);
 }
 if(found.length)return found.join("\uff0f");
 // Positive trigger near the saving throw; ignore saves granted as buffs.
 const re=/(?:\u5fc5\u9808|\u8feb\u4f7f|\u9808|\u900f\u904e|\u9032\u884c|\u901a\u904e|\u4f5c\u51fa|\u505a\u51fa)[^。\uff1b\uff0c\n]{0,48}?(\u529b\u91cf|\u654f\u6377|\u9ad4\u8cea|\u667a\u529b|\u611f\u77e5|\u9b45\u529b)\s*\u8c41\u514d/g;
 for(const m of String(full||"").matchAll(re)){
  const tail=String(full).slice(m.index+m[0].length,m.index+m[0].length+24);
  if(/\u5177\u6709\u512a\u52e2|\u7372\u5f97\u512a\u52e2/.test(tail)&&!/\u8c41\u514d(?:\u5931\u6557|\u6210\u529f)/.test(tail))continue;
  if(!found.includes(m[1]))found.push(m[1]);
 }
 return found.join("\uff0f");
}
function quickFacts(sp,characterLevel=1){
 const id=String(sp?.identifier||""),level=Math.max(1,Math.min(20,Number(characterLevel)||1));
 if(!id||!rows.has(id))return {damage:"",save:"",attack:""};
 const key=id+"@"+level;if(cache.has(key))return cache.get(key);
 const row=rows.get(id),short=String(row[13]||""),
       full=String(globalThis.SPELLS_2024_FULL_RULES?.[id]||""),
       source=full.split(/\u6232\u6cd5\u5f37\u5316|\u5347\u74b0\u65bd\u6cd5|\u9ad8\u74b0\u65bd\u6cd5/)[0];
 let dmg=damageDice(short);
 if(!dmg.length&&/\u50b7\u5bb3|\u5410\u606f\u653b\u64ca/.test(short))dmg=damageDice(source).slice(0,2);
 if(!dmg.length&&/\u9583\u96fb\u64ca\u4e2d/.test(short))dmg=(short.match(DICE)||[]).slice(0,1).map(x=>x+" \u9583\u96fb");
 let text=dmg.slice(0,3).join("\uff0b");
 if(dmg.length===2&&/\u6539\u70ba/.test(short))text=dmg.join("\uff0f");
 const extra=/\u984d\u5916|\u9644\u52a0|\u8ffd\u52a0|\u50b7\u5bb3\u589e\u52a0/.test(short)&&!!text;
 if(id==="eldritch-blast")text="\u6bcf\u675f 1d10 \u529b\u5834 \u00d7"+(level>=17?4:level>=11?3:level>=5?2:1)+"\u675f";
 if(id==="toll-the-dead")text=(level>=17?4:level>=11?3:level>=5?2:1)+"d8\uff0f"+(level>=17?4:level>=11?3:level>=5?2:1)+"d12 \u9eef\u8755";
 if(id==="shillelagh"){
   const die=level>=17?"2d6":level>=11?"1d12":level>=5?"1d10":"1d8";
   text=die+"＋施法屬性調整值（鈍擊／力場）";
 }
 if(id==="true-strike"){
   const bonus=level>=17?"3d6":level>=11?"2d6":level>=5?"1d6":"";
   text="\u6b66\u5668\u50b7\u5bb3"+(bonus?"\uff0b"+bonus+" \u5149\u8000":"");
 }
 if(Number(row[4])===0&&level>=5&&!["eldritch-blast","toll-the-dead","true-strike"].includes(id)&&/\u6232\u6cd5\u5f37\u5316/.test(full)&&text){
   const step=level>=17?17:level>=11?11:5;
   const match=full.match(new RegExp(step+"\u7d1a[（(]\\s*(\\d+d\\d+)[）)]"));
   if(match&&dmg.length===1)text=text.replace(/\d+d\d+/,match[1]);
 }
 if(!text&&/\u50b7\u5bb3/.test(short)){
   const m=source.match(/(?:\u53d7(?:\u5230)?|\u9020\u6210|\u9644\u52a0)\s*(\d+)\s*(?:\u9ede)?\s*([^\s。，]{2,4})\u50b7\u5bb3/);
   if(m&&ELEMENT.test(m[2]))text=m[1]+" "+m[2];
 }
 if(id==="spirit-guardians"&&text&&/\u5149\u8000\u6216\u9eef\u8755/.test(short))text=text.replace("\u5149\u8000","\u5149\u8000\uff0f\u9eef\u8755");
 if(id==="magic-missile"&&text)text="\u6bcf\u679a "+text+" \u00d73\u679a";
 if(id==="scorching-ray"&&text)text="\u6bcf\u9053 "+text+" \u00d73\u9053";
 if(id==="witch-bolt"&&dmg.length>=2)text=dmg[0]+"\uff1b\u5f8c\u7e8c "+dmg[1];
 if(/\u653b\u64ca\u547d\u4e2d\u9644\u52a0|\u547d\u4e2d(?:\u5f8c)?\u9644\u52a0/.test(short)&&text)text="\u547d\u4e2d\u984d\u5916 "+text;
 else if(extra&&text&&!/^\u547d\u4e2d\u984d\u5916/.test(text))text="\u984d\u5916 "+text;
 const save=saves(short,full);
 const attack=/\u6cd5\u8853\u653b\u64ca/.test(short)||/^\u5c0d\u76ee\u6a19\u9032\u884c\u4e00\u6b21(?:\u8fd1\u6230|\u9060\u7aef)\u6cd5\u8853\u653b\u64ca/.test(full.slice(0,160));
 const result=Object.freeze({damage:text,save,attack:attack?"\u6cd5\u8853\u653b\u64ca":""});
 cache.set(key,result);return result;
}
globalThis.ZIZI_5R_SPELL_QUICK_FACTS_2024=quickFacts;
})();
