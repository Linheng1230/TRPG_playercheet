const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const SRC_ROOT='D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024';
const itemData=JSON.parse(fs.readFileSync(path.join(SRC_ROOT,'data__items-base.json'),'utf8').replace(/^\uFEFF/,''));
const optData=JSON.parse(fs.readFileSync(path.join(SRC_ROOT,'data__optionalfeatures.json'),'utf8').replace(/^\uFEFF/,''));
const nameMap={"Club":"棍棒","Dagger":"匕首","Greatclub":"巨棒","Handaxe":"手斧","Javelin":"標槍","Light Hammer":"輕錘","Mace":"釘頭錘","Quarterstaff":"木杖","Sickle":"鐮刀","Spear":"矛","Dart":"飛鏢","Light Crossbow":"輕弩","Shortbow":"短弓","Sling":"投石索","Battleaxe":"戰斧","Flail":"連枷","Glaive":"長柄斧","Greataxe":"巨斧","Greatsword":"巨劍","Halberd":"戟","Lance":"騎槍","Longsword":"長劍","Maul":"巨錘","Morningstar":"晨星","Pike":"長槍","Rapier":"刺劍","Scimitar":"彎刀","Shortsword":"短劍","Trident":"三叉戟","Warpick":"戰鎬","Warhammer":"戰錘","Whip":"鞭","Blowgun":"吹箭筒","Hand Crossbow":"手弩","Heavy Crossbow":"重弩","Longbow":"長弓","Musket":"火槍","Pistol":"手槍"};
const masteryMap={"Cleave":"順勢","Graze":"掠傷","Nick":"迅捷","Push":"推撞","Sap":"削弱","Slow":"減速","Topple":"撂倒","Vex":"破綻"};
const dmg={B:"鈍擊",P:"穿刺",S:"揮砍"};
function masteryOf(x){for(const e of x.entries||[]){const m=String(e?.name||'').match(/([A-Za-z]+)\s*$/);if(m&&masteryMap[m[1]])return masteryMap[m[1]]}return null}
function props(x){const out=[];for(const p of x.property||[]){if(p==='F')out.push('靈巧');else if(p==='L')out.push('輕型');else if(p==='T')out.push(`投擲(${x.range})`);else if(p==='V')out.push(`多用(${x.dmg2})`);else if(p==='A')out.push(`彈藥(${x.range})`);else if(p==='LD')out.push('裝填');else if(p==='2H')out.push('雙手');else if(p==='H')out.push('重型');else if(p==='R')out.push('長武器');else out.push('<?> '+p)}return out.sort()}
const masteryNeed={
 "順勢":["5尺","觸及","第二","屬性調整值","每回合一次"],
 "掠傷":["未命中","屬性調整值","傷害類型"],
 "迅捷":["輕型","攻擊動作","附贈動作","每回合一次"],
 "推撞":["大型","10 尺"],
 "削弱":["下一次攻擊檢定","劣勢","下一回合開始"],
 "減速":["造成傷害","10尺","下一回合開始","不會超過10尺"],
 "撂倒":["體質豁免","DC=8","熟練加值","倒地"],
 "破綻":["造成傷害","下一次攻擊檢定","優勢","下一回合結束"]
};
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'}),p=await b.newPage();
 await p.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});
 const rt=await p.evaluate(()=>({weapons:WEAPONS,prices:SHOP_WEAPON_PRICE,mastery:MASTERY}));
 const bySite=Object.fromEntries(rt.weapons.map(x=>[x[1],x]));
 const src=itemData.baseitem.filter(x=>x.source==='PHB2024'&&nameMap[x.ENG_name]);
 assert.equal(src.length,38);assert.equal(rt.weapons.length,38);
 for(const x of src){const n=nameMap[x.ENG_name],g=bySite[n];assert(g,`missing weapon ${n}`);
  assert.equal(g[0],(x.weaponCategory==='simple'?'簡易':'軍用')+(x.type==='M'?'近戰':'遠端'),n+' category');
  assert.equal(g[2],`${x.dmg1} ${dmg[x.dmgType]}`,n+' damage');
  const shownProps=g[3]==='—'?[]:g[3].split('、').map(v=>v==="雙手（騎乘時除外）"?"雙手":v).sort();
  assert.deepEqual(shownProps,props(x),n+' props');
  assert.equal(g[4],masteryOf(x),n+' mastery');assert.equal(rt.prices[n],x.value,n+' price');
 }
 const msrc=optData.optionalfeature.filter(x=>x.source==='PHB2024'&&(x.featureType||[]).includes('MP'));assert.equal(msrc.length,8);
 for(const [n,toks] of Object.entries(masteryNeed)){assert(rt.mastery[n],`missing mastery ${n}`);for(const tok of toks)assert(rt.mastery[n].replace(/\s+/g,'').includes(tok.replace(/\s+/g,'')),`${n} missing ${tok}`)}
 console.log(JSON.stringify({weapons:'38/38 PASS',mastery:'8/8 PASS'}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
