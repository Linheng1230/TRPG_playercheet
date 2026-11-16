/* Shared 2024 cantrip and first-level spell presentation. Canonical 5RTools rules stay unchanged. */
(function(){
  "use strict";
  if(typeof spellTipHTML!=="function" || typeof spellDb!=="function")return;
  const original=spellTipHTML;
  const escape=s=>String(s??"").replace(/[&<>"]/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));
  const saveNames={strength:"力量",dexterity:"敏捷",constitution:"體質",intelligence:"智力",wisdom:"感知",charisma:"魅力"};
  const source=globalThis.CANTRIP_TOOLTIP_META_2024||{};
  const css=document.createElement("style");
  css.id="cantrip-tooltip-style";
  css.textContent=[
    "#spellTip.cantrip-compact{width:min(360px,calc(100vw - 16px));max-height:min(490px,calc(100dvh - 16px));padding:10px 12px;border-radius:9px;line-height:1.45;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain}",
    "#spellTip.cantrip-compact .ct-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;border-bottom:1px solid #645039;padding:0 30px 7px 0}",
    "#spellTip.cantrip-compact .ct-name{font-size:16px;font-weight:750;color:#f0c76a;line-height:1.3}",
    "#spellTip.cantrip-compact .ct-sub{color:#d0bda0;font-size:12px;margin-top:2px}",
    "#spellTip.cantrip-compact .ct-switch{display:flex;gap:5px;flex-shrink:0}",
    "#spellTip.cantrip-compact .ct-switch button{min-height:30px;padding:5px 8px;background:#413125;color:#f7e5c8;border:1px solid #987c4d;border-radius:6px;font-size:12px;cursor:pointer}",
    "#spellTip.cantrip-compact .ct-switch button[aria-pressed=true]{background:#e0bb76;color:#251a11;font-weight:750}",
    "#spellTip.cantrip-compact .ct-facts{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:5px;margin-top:8px}",
    "#spellTip.cantrip-compact .ct-fact{min-width:0;background:#342920;border:1px solid #544436;border-radius:5px;padding:5px 7px}",
    "#spellTip.cantrip-compact .ct-label{font-size:12px;color:#bda987;display:block;margin-bottom:2px}",
    "#spellTip.cantrip-compact .ct-value{font-size:13px;color:#fff0d5;overflow-wrap:anywhere}",
    "#spellTip.cantrip-compact .ct-row{margin-top:7px;padding:6px 8px;border-radius:5px;background:#342920;border:1px solid #544436;font-size:14px;line-height:1.6;color:#f9ebd5;overflow-wrap:anywhere}",
    "#spellTip.cantrip-compact .ct-row strong{color:#e6be78;display:block;font-size:12px;margin-bottom:3px}",
    "#spellTip.cantrip-compact .ct-note{color:#c6b596;font-size:12px;line-height:1.6;margin-top:6px}",
    "#spellTip.cantrip-compact .ct-full .tip-d{border-top:0;padding-top:2px;font-size:13px;line-height:1.6}",
    "#spellTip.cantrip-compact .ct-full .tip-d .sr-rule-block{margin-bottom:7px}",
    "#spellTip.cantrip-compact [hidden]{display:none!important}",
    "@media(max-width:390px){#spellTip.cantrip-compact{padding:9px 10px}#spellTip.cantrip-compact .ct-head{gap:5px}#spellTip.cantrip-compact .ct-name{font-size:15px}#spellTip.cantrip-compact .ct-switch button{padding:5px 7px}}"
  ].join("\n");
  /* Phase 0: enhance presentation only. Never rewrite canonical 5RTools spell text. */
  css.textContent += `
#spellTip.cantrip-compact{z-index:110}
#spellTip.spell-level1-readable{z-index:110;width:min(420px,calc(100vw - 16px));overflow-x:hidden}
#spellTip.spell-level1-readable .tip-d{font:400 14px/1.78 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;color:#fff3df}
#spellTip.spell-level1-readable .tip-d .sr-rule-block{padding:0;margin:0 0 12px;background:none;border:0;border-radius:0}
#spellTip.spell-level1-readable .tip-d .sr-rule-block.important{border:0}
#spellTip.spell-level1-readable .tip-d .sr-rule-label{display:block;font-size:13px;line-height:1.5;font-weight:800;margin-bottom:5px;color:#f0cf8d}
#spellTip.spell-level1-readable .tip-d .sr-rule-text{font-size:14px;line-height:1.78;color:#fff2df;overflow-wrap:anywhere}
.sref-entry .sr-rule-block.sr-readable{border:0;padding:0;margin:0 0 13px;background:none}
.sref-entry .sr-rule-block.sr-readable.important{border:0}
.sref-entry .sr-rule-block.sr-readable .sr-rule-label{font-size:15px;font-weight:800}
.sref-entry .sr-rule-block.sr-readable .sr-rule-text{font-size:clamp(15px,.2vw + 15px,16px);line-height:1.85;overflow-wrap:anywhere}
#spellTip.cantrip-compact .ct-full .tip-d{font:400 13.5px/1.75 "PingFang TC","Noto Sans CJK TC","Microsoft JhengHei",system-ui,sans-serif;color:#fff3df}
#spellTip.cantrip-compact .ct-full .sr-rule-block{padding:0;margin:0 0 11px;background:none;border:0;border-radius:0}
#spellTip.cantrip-compact .ct-full .sr-rule-block.important{border:0}
#spellTip.cantrip-compact .ct-full .sr-rule-label{display:block;color:#f2ce88;font-size:13px;line-height:1.5;margin-bottom:5px}
#spellTip.cantrip-compact .ct-note{font-style:italic}
#spellTip.cantrip-compact .ct-full .sr-rule-text{color:#fff2db;overflow-wrap:anywhere;white-space:normal}
.sr-readable .sr-save{font-weight:800;color:#185c76;background:#e1f2f6;border-radius:3px;padding:0 2px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.sr-readable .sr-outcome-fail{color:#852c28;background:#f9dfda}
.sr-readable .sr-outcome-success{color:#23653f;background:#e2f1e4}
.sr-readable .sr-damage{font-weight:800;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.sr-readable .sr-dice{font-weight:800;color:#775c0c;background:#f7edd1;border-radius:3px;padding:0 2px}
#spellTip .sr-readable .sr-dice{color:#f5d98e;background:#5b482c}
#spellTip .sr-readable .sr-save{color:#b8efff;background:#234457}
#spellTip .sr-readable .sr-outcome-fail{color:#ffc8bc;background:#61352f}
#spellTip .sr-readable .sr-outcome-success{color:#b4efc3;background:#2f4b38}

#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-damage{display:inline;font-size:inherit;line-height:inherit;color:var(--damage-semantic-color)}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-dice{display:inline;font-size:inherit;line-height:inherit;color:#f5d98e}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-save{display:inline;font-size:inherit;line-height:inherit;color:#b8efff}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-outcome-fail{color:#ffc8bc}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-outcome-success{color:#b4efc3}
.ss-entry-rule .sr-readable .sr-save,.sref-entry .sr-readable .sr-save{font-weight:800}
/* Flat, typography-led cantrip and first-level presentation: no nested effect cards. */
#spellTip.cantrip-compact .ct-facts{gap:5px 11px;margin:8px 0 6px}
#spellTip.cantrip-compact .ct-fact{background:transparent;border:0;border-radius:0;padding:0}
#spellTip.cantrip-compact .ct-label{font-size:11px;line-height:1.4;margin-bottom:1px}
#spellTip.cantrip-compact .ct-value{font-size:12.5px;line-height:1.45}
#spellTip.cantrip-compact .ct-row{background:transparent;border:0;border-radius:0;padding:0;margin:7px 0 0}
#spellTip.cantrip-compact .ct-row>strong{font-size:12px;color:#e6c68b}
#spellTip.cantrip-compact .ct-full{margin-top:8px;padding-top:8px;border-top:1px solid #62513c}
#spellTip.cantrip-compact .ct-full>.ct-row{margin:0}
#spellTip.cantrip-compact .ct-full>.ct-row>strong{display:block;margin-bottom:6px}
#spellTip.cantrip-compact .ct-full .tip-d{border:0;padding:0}
#spellTip.cantrip-compact .ct-full .tip-d .sr-rule-block{margin-bottom:11px;padding:0;border:0;background:none}
.sr-readable .sr-advantage{font-weight:850;color:#1c7150;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:2px}
.sr-readable .sr-disadvantage{font-weight:850;color:#a12d2a;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:2px}
#spellTip .sr-readable .sr-advantage{color:#a8f2c7}
#spellTip .sr-readable .sr-disadvantage{color:#ffb3ab}
.sr-readable .sr-action{font-weight:850;color:#765114;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px}
#spellTip .sr-readable .sr-action{color:#ffd685}
/* Elementalism option leads: emphasize the rule's first actionable clause, not its explanation. */
.sr-readable .sr-option-lead{display:inline;font-weight:800;color:#735019;background:transparent}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-option-lead{display:inline;font-size:inherit;line-height:inherit;font-weight:800;margin:0;color:#fff2cd;background:transparent}
#spellTip.spell-level1-readable .sr-readable strong.sr-option-lead{display:inline;font-size:inherit;line-height:inherit;font-weight:800;color:#fff2cd;background:transparent}
#spellTip .sr-readable ::selection{background:#e2b979;color:#24170e}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-advantage{display:inline;font-size:inherit;line-height:inherit;color:#a8f2c7}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-disadvantage{display:inline;font-size:inherit;line-height:inherit;color:#ffb3ab}
#spellTip.cantrip-compact .ct-full .ct-row .sr-readable strong.sr-action{display:inline;font-size:inherit;line-height:inherit;color:#ffd685}
@media(max-width:480px){#spellTip.cantrip-compact .ct-full .sr-rule-block{padding:0}}
`;
  document.head.appendChild(css);
  const originalRuleFormat=formatSpellRuleHTML;
  const cantripRules=new Set(SPELLS.filter(sp=>sp.lv===0).map(sp=>String(sp.d||"").replace(/\s+/g," ").trim()));
  const firstLevelRules=new Set(SPELLS.filter(sp=>sp.lv===1).map(sp=>String(sp.d||"").replace(/\s+/g," ").trim()));
  // Display-only semantic sentence breaks. Indices refer to canonical full-stop-delimited sentences.
  // These 98 entries are deliberately audited individually; the canonical spell body is never copied or changed.
  const semanticBreaksByEnglish=Object.freeze({
    "Acid Splash":[2], "Blade Ward":[], "Chill Touch":[2],
    "Dancing Lights":[3,4], "Druidcraft":[1,4,5,7], "Eldritch Blast":[2],
    "Elementalism":[1,3,4,7,9], "Fire Bolt":[3], "Friends":[1,3],
    "Guidance":[], "Light":[4], "Mage Hand":[4,5,7], "Mending":[2],
    "Message":[2], "Mind Sliver":[3], "Minor Illusion":[2,4,7],
    "Poison Spray":[3], "Prestidigitation":[3,4,5,6,7,8], "Produce Flame":[2,4,6],
    "Ray of Frost":[3], "Resistance":[1], "Sacred Flame":[3],
    "Shillelagh":[1,3,4], "Shocking Grasp":[3], "Sorcerous Burst":[3,5],
    "Spare the Dying":[1], "Starry Wisp":[3], "Thaumaturgy":[3,4,6,7,8,9],
    "Thorn Whip":[2], "Thunderclap":[2], "Toll the Dead":[3],
    "True Strike":[3], "Vicious Mockery":[2], "Word of Radiance":[2],
    "Animal Friendship":[3], "Armor of Agathys":[2,4], "Arms of Hadar":[2,4],
    "Bane":[1,2], "Bless":[2], "Burning Hands":[1,3,4],
    "Charm Person":[1,3,4], "Chromatic Orb":[1,3,6], "Color Spray":[],
    "Command":[2,7], "Compelled Duel":[1,2], "Comprehend Languages":[1,3],
    "Create or Destroy Water":[2,4], "Cure Wounds":[1],
    "Detect Evil and Good":[2], "Detect Magic":[1,2], "Detect Poison and Disease":[2],
    "Disguise Self":[2,5,7], "Dissonant Whispers":[2,4], "Divine Favor":[],
    "Divine Smite":[2], "Ensnaring Strike":[1,3,4,6],
    "Entangle":[1,3,4], "Expeditious Retreat":[], "Faerie Fire":[1,2],
    "False Life":[1], "Feather Fall":[], "Find Familiar":[1,3,6,8,11,13,17],
    "Fog Cloud":[2,3], "Goodberry":[2,4], "Grease":[3],
    "Guiding Bolt":[1,3,4], "Hail of Thorns":[1,2], "Healing Word":[1],
    "Hellish Rebuke":[1,2], "Heroism":[1,2], "Hex":[1,3,4],
    "Hunter's Mark":[1,2,3], "Ice Knife":[1,3,5], "Identify":[1,3,5],
    "Illusory Script":[2,5], "Inflict Wounds":[1], "Jump":[1,2],
    "Longstrider":[1], "Mage Armor":[], "Magic Missile":[1,3],
    "Protection from Evil and Good":[2,4], "Purify Food and Drink":[],
    "Ray of Sickness":[1,3], "Sanctuary":[1,2,3], "Searing Smite":[1,3],
    "Shield":[], "Shield of Faith":[], "Silent Image":[2,3,6,7],
    "Sleep":[1,3,4], "Speak with Animals":[1], "Tasha's Hideous Laughter":[1,3,6],
    "Tenser's Floating Disk":[1,3,4,6,8], "Thunderous Smite":[1,2],
    "Thunderwave":[1,4,6], "Unseen Servant":[2,5,7,8],
    "Witch Bolt":[1,3,4,5], "Wrathful Smite":[1,2], "Alarm":[1,3,4,6]
  });
  // Display-only core clauses for multi-choice effects. Markers must match the current
  // canonical body; failure to find a marker leaves text unaltered and fails the QA gate.
  // Spell text is NOT duplicated in these short end-markers.
  const otherChoiceLeads=Object.freeze({
    "Druidcraft":{
      "感知天氣":"天氣狀況。","盛放":"發芽。","感官效應":"無害的感官效應","玩火":"小篝火。"
    },
    "Minor Illusion":{
      "聲響":"高聲尖叫。","影像":"物件的影像"
    },
    "Prestidigitation":{
      "感官效應":"無害的感官效應","玩火":"小篝火。","清潔或弄髒":"物件。",
      "次級感覺":"對其調味","魔法印記":"一個徽記","次級造物":"一張虛幻影象"
    },
    "Thaumaturgy":{
      "改變眼睛":"眼睛的外觀","擴音":"三倍大","玩火":"變色",
      "看不見的手":"關上。","幻音":"短暫的聲音","震動":"無害的震動"
    },
    "Command":{
      "過來":"向你移動","放下":"持握的任何東西","走開":"遠離你。",
      "趴下":"倒地狀態","立定":"附贈動作。"
    },
    "Create or Destroy Water":{
      "造水術":"乾淨的水。","枯水術":"枯竭不見。"
    },
    "Find Familiar":{
      "心靈連線":"心靈交流。","戰鬥":{start:"戰鬥時",end:"行動。"},
      "魔寵的消失":"它會消失。","獨一無二":"多於一隻魔寵。"
    }
  });
  const nestedChoiceLabels=Object.freeze({
    "Command":"過來","Create or Destroy Water":"造水術"
  });
  const normalizedRule=(raw)=>String(raw||"").replace(/\s+/g," ").trim();
  const spellMetaByText=new Map(
    SPELLS.filter(sp=>sp.lv===0||sp.lv===1).map(sp=>[normalizedRule(sp.d),sp])
  );
  // Read-only QA visibility. Never expose or reserialize the canonical body from this structure.
  globalThis.spellSemanticAudit2024={
    phase:"zero-one",breaks:semanticBreaksByEnglish,
    total:Object.keys(semanticBreaksByEnglish).length
  };

  // Reuse the site's canonical 13 damage types and centralized damage-semantic palette.
  const damageTypes=typeof CLASS_DAMAGE_TYPES_2024!=="undefined"?CLASS_DAMAGE_TYPES_2024:[];
  const damagePattern=damageTypes.join("|");
  const emphasisRe=new RegExp("(?:\\d+\\s*[dD]\\s*\\d+(?:\\s*[+＋]\\s*\\d+)?\\s*(?:點)?)?\\s*(?:"+damagePattern+")傷害|法術\\s*豁免\\s*DC|豁免\\s*DC|DC\\s*\\d+|(?:力量|敏捷|體質|智力|感知|魅力)\\s*豁免(?:檢定)?|豁免(?:檢定)?(?:失敗|成功)?|魔法動作|優勢|劣勢|成功|失敗|(?<![A-Za-z])(?:\\d+\\s*)?[dD]\\s*\\d+(?:\\s*[+＋]\\s*\\d+)?","gu");
  function highlightRule(raw){
    const source=String(raw||"");let result="",last=0;
    for(const match of source.matchAll(emphasisRe)){
      const token=match[0],at=match.index;
      result+=escape(source.slice(last,at));
      const kind=damageTypes.find(x=>token.includes(x+"傷害"));
      if(kind){
        const type=globalThis.ZIZI_DAMAGE_SEMANTICS_5R?.types?.[kind];
        result+=type?'<strong class="damage-semantic sr-damage" data-damage-type="'+escape(type)+'">'+escape(token)+'</strong>':'<strong class="sr-damage">'+escape(token)+'</strong>';
      }else if(/^(?:\d+\s*)?[dD]\s*\d+(?:\s*[+＋]\s*\d+)?$/u.test(token)){
        result+='<strong class="sr-dice">'+escape(token)+'</strong>';
      }else if(token==="優勢"||token==="劣勢"){
        result+='<strong class="'+(token==="優勢"?"sr-advantage":"sr-disadvantage")+'">'+escape(token)+'</strong>';
      }else if(token==="魔法動作"){
        result+='<strong class="sr-action">'+escape(token)+'</strong>';
      }else{
        const outcome=/失敗/.test(token)?" sr-outcome-fail":/成功/.test(token)?" sr-outcome-success":"";
        result+='<strong class="sr-save'+outcome+'">'+escape(token)+'</strong>';
      }
      last=at+token.length;
    }
    return result+escape(source.slice(last));
  }
  function readableCantrip(raw){
    const text=normalizedRule(raw);
    const sentences=text.match(/[^。！？]+[。！？]?/gu)||[text];
    const spell=spellMetaByText.get(text);
    const semanticBreaks=semanticBreaksByEnglish[spell?.eng]||[];
    const breaks=new Set(semanticBreaks);
    const blocks=[];let pending={label:"",body:""};
    const flush=()=>{
      if(pending.label||pending.body)blocks.push(pending);
      pending={label:"",body:""};
    };
    for(let i=0;i<sentences.length;i++){
      const sentence=sentences[i];
      // Use each spell's audited action/condition/outcome boundaries, never a character-count splitter.
      if(breaks.has(i))flush();
      const label=/^([^：。！？]{1,12})：([\s\S]*)$/u.exec(sentence);
      if(label&&!/[，、]/u.test(label[1])){
        flush();
        // Command and Create/Destroy Water have an intro and first named choice in
        // the same source sentence. Split their headings for display, not their text.
        const inner=/^(\s*)([^：。！？]{1,12})：([\s\S]*)$/u.exec(label[2]);
        if(inner&&inner[2].trim()===nestedChoiceLabels[spell?.eng]){
          blocks.push({label:"",body:label[1]+"："+inner[1]});
          pending={label:inner[2],body:inner[3]};
        }else{
          pending={label:label[1],body:label[2]};
        }
        // Following sentences belong to the option or scaling paragraph until a planned break.
        continue;
      }
      pending.body+=sentence;
    }
    flush();
    if(blocks.map(x=>x.label?x.label+"："+x.body:x.body).join("")!==text)return originalRuleFormat(raw);
    // Highlight only the first meaningful action/result clause of each Elementalism choice.
    // The matching strings mark punctuation already present in canonical text; never rewrite its words.
    const elementalismEndMarks={"召氣":"，","召土":"，","召火":"。","召水":"霧氣。","塑形元素":"，"};
    return blocks.map(({label,body})=>{
      const important=/^(戲法強化|升環施法|成功|失敗|豁免成功|豁免失敗|限制|特殊)$/u.test(label);
      let formatted=highlightRule(body);
      const optionLabel=label.trim();
      if(spell?.eng==="Elementalism"&&Object.prototype.hasOwnProperty.call(elementalismEndMarks,optionLabel)){
        const mark=elementalismEndMarks[optionLabel];
        const leading=body.match(/^\s*/u)?.[0]||"";
        const at=body.indexOf(mark,leading.length);
        if(at>leading.length){
          const end=at+(mark.endsWith("。")?mark.length:0);
          formatted=highlightRule(leading)+'<strong class="sr-option-lead">'+highlightRule(body.slice(leading.length,end))+'</strong>'+highlightRule(body.slice(end));
        }
      }else{
        // Different options have different meaningful clauses; never bold their whole
        // explanation. Embedded action phrases (Find Familiar / 戰鬥) may start later.
        const spec=otherChoiceLeads[spell?.eng]?.[optionLabel];
        if(spec){
          const startMark=typeof spec==="string"?null:spec.start;
          const endMark=typeof spec==="string"?spec:spec.end;
          const start=startMark?body.indexOf(startMark):(body.match(/^\s*/u)?.[0].length||0);
          const at=start>=0?body.indexOf(endMark,start):-1;
          if(start>=0&&at>=start){
            const end=at+endMark.length;
            formatted=highlightRule(body.slice(0,start))+
              '<strong class="sr-option-lead">'+highlightRule(body.slice(start,end))+'</strong>'+
              highlightRule(body.slice(end));
          }
        }
      }
      return '<div class="sr-rule-block sr-readable'+(important?' important':'')+'">'+
        (label?'<div class="sr-rule-label">'+escape(label+'：')+'</div>':'')+
        '<div class="sr-rule-text">'+formatted+'</div></div>';
    }).join("");
  }
  formatSpellRuleHTML=function(raw){
    const text=String(raw||"").replace(/\s+/g," ").trim();
    return S.ruleset==="2024"&&(cantripRules.has(text)||firstLevelRules.has(text))?readableCantrip(raw):originalRuleFormat(raw);
  };
  globalThis.cantripReadableRules2024={phase:0,count:cantripRules.size,format:readableCantrip};
  globalThis.spellReadableRules2024={phase:1,count:firstLevelRules.size,cantripCount:cantripRules.size,format:readableCantrip};
  const fact=(name,value)=>'<div class="ct-fact"><span class="ct-label">'+escape(name)+'</span><div class="ct-value">'+escape(value)+'</div></div>';
  const row=(title,value)=>'<div class="ct-row"><strong>'+escape(title)+'</strong>'+escape(value)+'</div>';
  function materialText(raw,hasMaterial){
    if(!hasMaterial)return "無";
    if(typeof raw==="string"&&raw.trim())return raw.trim();
    if(raw && typeof raw==="object"){
      if(typeof raw.text==="string")return raw.text;
      if(typeof raw.m==="string")return raw.m;
    }
    return "有材料成分，請查閱完整法術資料";
  }
  function compactHTML(name){
    const lookup=normalizeSpellName2024(name);
    const sp=SPELLS.find(x=>x.n===lookup);
    if(!sp || sp.lv!==0)return null;
    const m=spellMetaDb()[sp.n]||{};
    const info=source[String(sp.eng||"").toLowerCase()];
    const material=materialText(info?.material,!!sp.signature?.c?.[2]);
    const saves=(info?.save||[]).map(x=>saveNames[x]||x);
    const atk=/近戰法術攻擊|遠端法術攻擊|法術攻擊檢定|攻擊檢定/.test(sp.d);
    const check=saves.length?saves.join("、")+"豁免":atk?"法術攻擊檢定":"依效果，無指定豁免";
    const rangeText=sp.d.match(/(?:半徑\s*\d+\s*呎|\d+\s*呎(?:半徑)?(?:球狀|錐狀|立方|直線|範圍|光環))/u)?.[0];
    const full=original.call(this,sp.n);
    const fullBody=full.match(/<div class="tip-d">([\s\S]*)<\/div>\s*$/)?.[1]||formatSpellRuleHTML(sp.d);
    const title='<div class="ct-head"><div><div class="ct-name">'+spellNameHTML(sp)+'</div><div class="ct-sub">戲法 · '+escape(m.school)+' · '+(sp.con?"專注":"非專注")+' · '+(sp.rit?"儀式":"非儀式")+'</div></div></div>';
    const facts='<div class="ct-facts">'+fact("施法時間",m.time||"—")+fact("施法距離",m.range||"—")+fact("影響範圍",rangeText||"見法術效果")+fact("持續時間",m.dur||"—")+fact("施法成分",displaySpellComponents2024(m.comp)||"—")+fact("攻擊／豁免",check)+'</div>';
    const details='<div class="ct-full"><div class="ct-row"><strong>完整規則</strong><div class="tip-d">'+fullBody+'</div></div></div>';
    return title+facts+row("材料需求",material)+details;
  }
  spellTipHTML=function(name){
    const spell=S.ruleset==="2024"?SPELLS.find(sp=>sp.n===normalizeSpellName2024(name)):null;
    const supported=spell?.lv===0;
    spellTip.classList.toggle("cantrip-compact",supported);
    spellTip.classList.toggle("spell-level1-readable",spell?.lv===1);
    return supported?compactHTML(name):original.call(this,name);
  };
  globalThis.cantripTooltip2024Ready=true;
})();
