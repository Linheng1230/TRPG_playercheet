const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs'),path=require('path');
const src=JSON.parse(fs.readFileSync('D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024/data__backgrounds.json','utf8').replace(/^\uFEFF/,''));
const nameMap={Acolyte:'侍僧',Artisan:'工匠',Charlatan:'江湖騙子',Criminal:'罪犯',Entertainer:'藝人',Farmer:'農夫',Guard:'衛士',Guide:'嚮導',Hermit:'隱士',Merchant:'商人',Noble:'貴族',Sage:'賢者',Sailor:'水手',Scribe:'抄寫員',Soldier:'士兵',Wayfarer:'流浪兒'};
const abMap={力量:'str',敏捷:'dex',体质:'con',智力:'int',感知:'wis',魅力:'cha'};
const skillMap={洞悉:'洞悉',宗教:'宗教',调查:'調查',游说:'說服',欺瞒:'欺瞞',巧手:'巧手',特技:'雜技',表演:'表演',驯兽:'動物馴養',自然:'自然',运动:'運動',察觉:'察覺',隐匿:'隱匿',求生:'求生',医药:'醫藥',历史:'歷史',奥秘:'奧秘',威吓:'威嚇'};
const featMap={'魔法学徒（牧师）':'法術新手(牧師)','魔法学徒（德鲁伊）':'法術新手(德魯伊)','魔法学徒（法师）':'法術新手(法師)','巧匠':'匠人','熟习':'多才多藝','警觉':'警覺','音乐家':'樂師','健壮':'堅韌','医疗师':'治療者','幸运':'幸運','酒馆斗殴者':'酒館鬥士','凶蛮打手':'蠻力攻擊者'};
const toolRules=[['选择一种','工匠工具','一種工匠工具'],['书法工具',null,'書法用具'],['伪造工具',null,'偽造工具'],['盗贼工具',null,'盜賊工具'],['乐器',null,'一種樂器'],['木工工具',null,'木匠工具'],['赌具',null,'一種賭具'],['制图工具',null,'製圖工具'],['草药工具',null,'草藥工具'],['领航工具',null,'領航工具']];
function listItems(x){const l=(x.entries||[]).find(e=>e&&e.type==='list');return Object.fromEntries((l?.items||[]).map(i=>[i.name,i.entry]))}
function tags(s,kind){return [...String(s||'').matchAll(new RegExp('\\{@'+kind+'\\s+([^}|]+)(?:\\|[^}]*)?\\}','g'))].map(m=>m[1])}
function featOf(s){let t=tags(s,'feat')[0]||'';const par=String(s).match(/（([^）]+)）/);if(par)t+=`（${par[1]}）`;return featMap[t]}
function toolOf(s){for(const [a,b,v] of toolRules)if(String(s).includes(a)&&(!b||String(s).includes(b)))return v;return null}
function sourceWeapons(eq){const out=[];if(eq.includes('匕首（2把）'))out.push('匕首','匕首');else if(eq.includes('匕首'))out.push('匕首');if(eq.includes('镰刀'))out.push('鐮刀');if(eq.includes('矛'))out.push('矛');if(eq.includes('轻弩'))out.push('輕弩');if(eq.includes('短弓'))out.push('短弓');if(eq.includes('长棍'))out.push('木杖');return out}
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'}),p=await b.newPage();await p.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});
 const rt=await p.evaluate(()=>({bg:BACKGROUNDS_2024,gear:BG_GEAR_2024,toolChoiceNames:Object.keys(BG_TOOL_CHOICES_2024)}));
 const by=Object.fromEntries(rt.bg.map(x=>[x.n,x]));const rows=src.background.filter(x=>x.source==='PHB2024');assert.equal(rows.length,16);assert.equal(rt.bg.length,16);
 for(const x of rows){const n=nameMap[x.ENG_name],g=by[n];assert(g,`missing ${x.ENG_name}`);const it=listItems(x);
   const abs=it['属性值'].split('、').map(v=>abMap[v]).sort();assert.deepEqual([...g.ab].sort(),abs,n+' abilities');
   const skills=tags(it['技能熟练'],'skill').map(v=>skillMap[v]).sort();assert.deepEqual([...g.sk].sort(),skills,n+' skills');
   assert.equal(g.feat,featOf(it['专长']),n+' feat');assert.equal(g.tool,toolOf(it['工具熟练']),n+' tool');
   const eq=it['装备'];const gp=+(eq.match(/、(\d+)GP；/)||[])[1];assert.equal(rt.gear[n].gp,gp,n+' A gp');
   assert.deepEqual([...(rt.gear[n].weapons||[])].sort(),sourceWeapons(eq).sort(),n+' A weapons');
 }
 for(const n of ['工匠','藝人','衛士','貴族','士兵'])assert(rt.toolChoiceNames.includes(n),n+' selectable tool');
 for(const n of ['衛士','貴族','士兵'])assert(rt.gear[n].items.includes('一種賭具'),n+' gear must use selected gaming set');
 assert(rt.gear['流浪兒'].items.includes('一種賭具'),'Wayfarer gear gaming set must be selectable');
 console.log(JSON.stringify({backgrounds:'16/16 PASS',toolChoices:'PASS',gearA:'PASS',gearB:'50gp supported'}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});