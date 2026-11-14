/* Canonical 2024 class progression projection: pure values shared by the player reference and play-status resource maxima.
 * The existing SLOTS_FULL / SLOTS_HALF / PACT / CASTER / SLOTS_THIRD / THIRD_PREP and MAST_COUNT
 * remain the sole sources for spell, prepared-spell, and weapon-mastery progressions.
 * Class choices and character ability scores are intentionally NOT assumed in encyclopedia mode.
 */
(function(){
"use strict";
function level20(level){const n=Number(level);return Number.isInteger(n)&&n>=1&&n<=20?n:0;}
function cap(cls,level,key,mods){
 const lv=level20(level);if(!lv)return null;
 const mod=mods||{};
 const ability=k=>Number.isFinite(mod[k])?Math.max(1,Math.floor(mod[k])):null;
 switch(key){
  case "rage":return cls==="野蠻人"?(lv>=17?6:lv>=12?5:lv>=6?4:lv>=3?3:2):null;
  case "bi":return cls==="吟遊詩人"?ability("cha"):null;
  case "cd":return cls==="牧師"?(lv>=18?4:lv>=6?3:lv>=2?2:0):cls==="聖武士"?(lv>=11?3:lv>=3?2:0):null;
  case "ws":return cls==="德魯伊"?(lv>=17?4:lv>=6?3:lv>=2?2:0):null;
  case "sw":return cls==="戰士"?(lv>=10?4:lv>=4?3:2):null;
  case "ai":return cls==="戰士"?(lv>=17?2:lv>=2?1:0):null;
  case "ind":return cls==="戰士"?(lv>=17?3:lv>=13?2:lv>=9?1:0):null;
  case "ki":return cls==="武僧"?(lv>=2?lv:0):null;
  case "ld":return cls==="聖武士"?5*lv:null;
  case "hm":return cls==="遊俠"?(lv>=17?6:lv>=13?5:lv>=9?4:lv>=5?3:2):null;
  case "sp":return cls==="術士"?(lv>=2?lv:0):null;
  case "is":return cls==="術士"?2:null;
  case "ar":return cls==="法師"?1:null;
  case "invocations":return cls==="邪術師"?(lv>=18?10:lv>=15?9:lv>=12?8:lv>=9?7:lv>=7?6:lv>=5?5:lv>=2?3:1):null;
  case "stars-guiding-bolt":return cls==="德魯伊"&&lv>=3?ability("wis"):null;
  case "stars-cosmic-omen":return cls==="德魯伊"&&lv>=6?ability("wis"):null;
 }
 return null;
}
const PICKS={
 "野蠻人":[["rage","狂暴次數"]],
 "吟遊詩人":[["bi","吟遊激勵次數"]],
 "牧師":[["cd","引導神力次數"]],
 "德魯伊":[["ws","荒野變身次數"]],
 "戰士":[["sw","回氣次數"],["ai","動作如潮次數"],["ind","不屈次數"]],
 "武僧":[["ki","專注點"]],
 "聖武士":[["ld","聖療池"],["cd","引導神力次數"]],
 "遊俠":[["hm","宿敵獵殺免費次數"]],
 "術士":[["sp","魔源點"],["is","天生魔源次數"]],
 "邪術師":[["invocations","魔能祈喚選項"]],
 "法師":[["ar","奧術恢復次數"]]
};
function pickKnownTableValue(t,lv){
 let value=0;for(const [at,v] of Object.entries(t||{}))if(lv>=Number(at))value=v;return value;
}
function describe(cls,sub,level,tables){
 const lv=level20(level);if(!lv)return [];
 const src=tables||{},out=[];
 const add=(key,label,value,detail)=>{
  if(value===null||value===undefined||value===0||value==="")return;
  out.push({key,label,value:String(value),detail:detail||""});
 };
 for(const [key,label] of PICKS[cls]||[]){
  const value=cap(cls,lv,key);
  if(key==="bi"){add(key,label,"魅力調整值（至少 1 次）","實際次數依角色的魅力調整值計算；此處不假設角色屬性。");continue;}
  add(key,label,value);
 }
 if(cls==="野蠻人")add("rage-bonus","狂暴傷害加值","+"+(lv>=16?4:lv>=9?3:2));
 if(cls==="吟遊詩人")add("bardic-die","吟遊激勵骰","d"+(lv>=15?12:lv>=10?10:lv>=5?8:6));
 if(cls==="武僧")add("monk-die","武術骰","d"+(lv>=17?12:lv>=11?10:lv>=5?8:6));
 if(cls==="遊蕩者")add("sneak","偷襲傷害",Math.ceil(lv/2)+"d6");
 if(cls==="德魯伊"&&lv>=2){
  add("wild-known","荒野變身已知形態",lv>=8?8:lv>=4?6:4);
  if(sub==="星辰結社"&&lv>=3){
   add("stars-guiding-bolt","星圖免費施法","感知調整值（至少 1 次）","不消耗法術位；長休恢復。");
   if(lv>=6)add("stars-cosmic-omen","宇宙徵兆次數","感知調整值（至少 1 次）","長休恢復。");
  }
 }
 const mastery=pickKnownTableValue(src.masteries?.[cls],lv);
 if(mastery)add("mastery","可選武器精通",mastery+" 種");
 let slots=null,caster=src.caster?.[cls],third=false;
 if((cls==="戰士"&&sub==="魔能騎士")||(cls==="遊蕩者"&&sub==="奧術騙徒")){
  if(lv>=3){slots=src.thirdSlots?.[lv]||[];third=true;}
 }else if(cls==="邪術師"){
  const pact=src.pact?.[lv]||[0,0];
  add("pact-slots","契約魔法位",pact[0]+" 格（"+pact[1]+" 環）","短休或長休恢復；秘傳奧法不計入契約魔法位。");
 }else if(caster){
  slots=(src.progression?.[cls]?.caster==="full"?src.fullSlots:src.halfSlots)?.[lv]||[];
 }
 if(third){
  add("cantrips","魔法伎倆",sub==="奧術騙徒"?3:lv>=10?3:2);
  add("prepared","準備法術",src.thirdPrepared?.[lv]||0,"不含額外授予或恆定準備法術。");
 }else if(caster){
  if(caster.cant)add("cantrips","魔法伎倆",pickKnownTableValue(caster.cant,lv),"不含職業選項、物種、專長額外授予。");
  add("prepared","準備法術",caster.prep?.[lv-1],"不含額外授予或恆定準備法術。");
  if(cls==="法師")add("spellbook","法術書基礎法術",6+2*(lv-1),"只計算升級自動加入的法術，不包含抄錄取得的法術。");
 }
 if(slots&&slots.length)add("spell-slots","法術位",slots.map((n,i)=>(i+1)+" 環×"+n).join("、"),"完成長休恢復；第三施法子職業按自身子職業表。");
 return out;
}
window.ClassResourceMetrics5R=Object.freeze({cap,describe});
})();