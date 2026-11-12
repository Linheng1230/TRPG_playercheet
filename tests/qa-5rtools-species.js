const {chromium}=require('playwright'),assert=require('assert'),fs=require('fs');
const src=JSON.parse(fs.readFileSync('D:/Tools/zizi-ai-runtime/trpg-playercheet-qa/5rtools-2024/data__races.json','utf8').replace(/^\uFEFF/,''));
const nameMap={Human:'人類',Elf:'精靈',Dwarf:'矮人',Halfling:'半身人',Aasimar:'阿斯莫',Dragonborn:'龍裔',Gnome:'侏儒',Goliath:'歌利亞',Orc:'獸人',Tiefling:'提夫林'};
function textOf(x){return JSON.stringify(x.entries||[])}
(async()=>{
 const b=await chromium.launch({headless:true,channel:'chrome'}),p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
 await p.goto(process.env.QA_URL||'http://127.0.0.1:18766/index.html',{waitUntil:'networkidle'});await p.evaluate(()=>document.getElementById('rulesetModal')?.classList.remove('open'));
 const rt=await p.evaluate(()=>({sp:SPECIES_2024,opts:SP_OPTS}));
 const rows=src.race.filter(x=>x.source==='PHB2024');assert.equal(rows.length,10);assert.equal(rt.sp.length,10);
 const by=Object.fromEntries(rt.sp.map(x=>[x.n,x]));
 for(const x of rows){const n=nameMap[x.ENG_name],g=by[n];assert(g,'missing '+x.ENG_name);assert.equal(g.speed,x.speed,n+' speed');
   if(x.darkvision)assert(g.traits.join(' ').includes(String(x.darkvision)+' 呎'),n+' darkvision');
 }
 for(const n of ['人類','阿斯莫','提夫林']){const ch=by[n].ch||[];const s=ch.find(x=>x.k==='sizeChoice');assert(s,n+' size choice');assert.deepEqual(s.opts,['中型','小型'])}
 assert(!(by['阿斯莫'].ch||[]).some(x=>x.k==='aRev'),'Aasimar Revelation must be chosen on use, not permanently');
 for(const [n,k] of [['精靈','eCast'],['侏儒','gCast'],['提夫林','fCast']]){const c=(by[n].ch||[]).find(x=>x.k===k);assert(c&&c.t==='castability',n+' casting ability')}
 assert((by['精靈'].ch||[]).some(x=>x.k==='highElfCantrip'&&x.when?.eLine==='高等精靈'),'High Elf replaceable wizard cantrip');
 assert(by['半身人'].traits.join(' ').includes('至少比你大一級'),'Halfling natural stealth at least one size larger');
 const smoke=await p.evaluate(()=>{
   S.ruleset='2024';syncRulesetUI();S.cls=CLASSES.find(x=>x.n==='戰士');S.level=5;S.classLevels={戰士:5};
   const set=(n,ch)=>{S.sp=SPECIES_2024.find(x=>x.n===n);S.spChoices={...ch};return {ready:speciesChoicesReady(),spells:featGrantedSpells().map(x=>x.n),notes:featGrantedSpells().map(x=>x.note)}};
   return {
    elf:set('精靈',{eSkill:'察覺',eLine:'高等精靈',eCast:'int',highElfCantrip:'變戲法'}),
    gnome:set('侏儒',{gLine:'森林侏儒',gCast:'wis'}),
    tiefling:set('提夫林',{sizeChoice:'小型',fLine:'深淵',fCast:'cha'}),
    aasimar:set('阿斯莫',{sizeChoice:'中型'})
   };
 });
 assert(smoke.elf.ready);['魔法伎倆','偵測魔法','迷蹤步'].forEach(x=>assert(smoke.elf.spells.includes(x),'High Elf '+x));assert(smoke.elf.notes.some(x=>x.includes('智力')));
 assert(smoke.gnome.ready);['次級幻象','動物交談'].forEach(x=>assert(smoke.gnome.spells.includes(x),'Forest Gnome '+x));assert(smoke.gnome.notes.some(x=>x.includes('感知')));
 assert(smoke.tiefling.ready);['奇術','毒氣噴湧','致病射線','定身類人'].forEach(x=>assert(smoke.tiefling.spells.includes(x),'Tiefling '+x));assert(smoke.tiefling.notes.some(x=>x.includes('魅力')));
 assert(smoke.aasimar.ready&&smoke.aasimar.spells.includes('光亮術'),'Aasimar Light');
 assert.deepEqual(errs,[]);
 console.log(JSON.stringify({species:'10/10 PASS',choices:'PASS',grantedSpells:'PASS'}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});