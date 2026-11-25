import React from "react";
import type { DmSheet } from "./dm-sheet-projection";

const absent="未記錄";
const show=(s:string|number|null|undefined)=>s===null||s===undefined||s===""?absent:String(s);
function Labels({values,empty="未選擇"}:{values:string[];empty?:string}){
  return values.length?<ul className="dm-chip-list">{values.map((v,i)=><li key={i}>{v}</li>)}</ul>:<p className="dm-sheet-muted">{empty}</p>;
}
function Stat({label,value}:{label:string;value:string|number|null}){
  return <div className="dm-stat"><span>{label}</span><strong>{show(value)}</strong></div>;
}
/** Pure read-only sheet. The player remains the sole owner and editor.
 * No editable inputs, local-storage writes, JSON textarea or HTML injection. */
export function DmCharacterSheet({sheet,renderSpell}:{sheet:DmSheet;renderSpell?:(name:string)=>React.ReactNode}){
  const equipment=[
    sheet.equip.armor?"護甲："+sheet.equip.armor:"",
    sheet.equip.shield?"持盾":"",
    ...sheet.equip.weapons.map(x=>"武器："+x),
    ...sheet.equip.coins,
  ].filter(Boolean);
  return <article className="dm-sheet" aria-label={"DM 唯讀角色卡："+sheet.name}>
    <div className="dm-sheet-head">
      {sheet.portrait&&<img className="dm-sheet-portrait" alt={sheet.name+"的角色肖像"} src={sheet.portrait}/>}
      <div>
        <p className="dm-sheet-eyebrow">DM 唯讀角色卡 · {sheet.ruleset} 規則</p>
        <h4 className="dm-sheet-name">{sheet.name}</h4>
        <p className="dm-sheet-subtitle">{sheet.className||"職業未記錄"} {sheet.level} 級{sheet.subclass?" · "+sheet.subclass:""}</p>
        <p className="dm-sheet-meta">{[sheet.species,sheet.background,sheet.alignment].filter(Boolean).join(" · ")}</p>
        {sheet.player&&<p className="dm-sheet-meta">玩家：{sheet.player}</p>}
      </div>
    </div>
    <div className="dm-stat-grid">
      <Stat label="當前 HP" value={sheet.hp}/>
      <Stat label="最大 HP" value={sheet.hpMax}/>
      <Stat label="臨時 HP" value={sheet.tempHp}/>
      <Stat label="等級" value={sheet.level}/>
    </div>
    <section aria-labelledby="dm-ability-heading" className="dm-sheet-section">
      <h5 id="dm-ability-heading">六大能力</h5>
      <p className="dm-sheet-muted">以下是玩家存檔的基本能力值。背景、專長等調整後的最終值與 AC 請以玩家原角色卡為準，避免錯算。</p>
      <div className="dm-ability-grid">{sheet.abilities.map(a=><div className="dm-ability" key={a.key}>
        <span>{a.label}</span><strong>{show(a.base)}</strong><small>{a.base===null?"未記錄":"基本值"}</small>
      </div>)}</div>
    </section>
    <section className="dm-sheet-section">
      <h5>熟練技能與專精</h5><Labels values={sheet.skills}/>
      {sheet.expertise.length>0&&<><h6>專精</h6><Labels values={sheet.expertise}/></>}
    </section>
    <section className="dm-sheet-section">
      <h5>戰鬥與跑團狀態</h5>
      <div className="dm-stat-grid">
        <Stat label="生命骰紀錄" value={sheet.hitDice}/>
        <Stat label="英雄激勵" value={sheet.inspiration?"有":"無"}/>
        <Stat label="死亡豁免成功" value={sheet.deathSuccess}/>
        <Stat label="死亡豁免失敗" value={sheet.deathFailure}/>
      </div>
      {!!sheet.resources.length&&<><h6>職業及跑團資源（存檔紀錄）</h6><ul className="dm-data-list">
        {sheet.resources.map((x,i)=><li key={i}><strong>{x.name}</strong>：{show(x.current)}{x.max?"／"+x.max:""}</li>)}
      </ul></>}
    </section>
    <section className="dm-sheet-section">
      <h5>法術</h5>
      <h6>戲法</h6>{renderSpell?<ul className="dm-chip-list">{sheet.cantrips.map((s,i)=><li key={i}>{renderSpell(s)}</li>)}</ul>:<Labels values={sheet.cantrips}/>}
      <h6>已準備法術</h6>{renderSpell?<ul className="dm-chip-list">{sheet.prepared.map((s,i)=><li key={i}>{renderSpell(s)}</li>)}</ul>:<Labels values={sheet.prepared}/>}
      {!!sheet.spellbook.length&&<><h6>法術書</h6>{renderSpell?<ul className="dm-chip-list">{sheet.spellbook.map((s,i)=><li key={i}>{renderSpell(s)}</li>)}</ul>:<Labels values={sheet.spellbook}/>}</>}
      {!!sheet.customSpells.length&&<><h6>自訂法術</h6>{renderSpell?<ul className="dm-chip-list">{sheet.customSpells.map((s,i)=><li key={i}>{renderSpell(s)}</li>)}</ul>:<Labels values={sheet.customSpells}/>}</>}
    </section>
    <section className="dm-sheet-section">
      <h5>職業、專長與選擇</h5>
      {sheet.style&&<p><strong>戰鬥風格：</strong>{sheet.style}</p>}
      {sheet.mastery.length>0&&<><h6>武器精通</h6><Labels values={sheet.mastery}/></>}
      <h6>角色已選擇的特性／專長</h6><Labels values={sheet.originChoices} empty="尚未記錄可顯示的額外選擇"/>
      <p className="dm-sheet-muted">此處呈現原生存檔的已選項目；未在存檔內保存的完整職業能力說明，請以正式 5R 角色卡為準。</p>
    </section>
    <section className="dm-sheet-section">
      <h5>裝備與金錢</h5><Labels values={equipment}/>
      {sheet.equip.items&&<p className="dm-text-block">{sheet.equip.items}</p>}
    </section>
    <section className="dm-sheet-section">
      <h5>人物設定</h5>
      <div className="dm-sheet-meta-grid">
        {sheet.gender&&<p><strong>性別：</strong>{sheet.gender}</p>}
        {sheet.age&&<p><strong>年齡：</strong>{sheet.age}</p>}
        {sheet.faith&&<p><strong>信仰：</strong>{sheet.faith}</p>}
      </div>
      {sheet.bio.length?sheet.bio.map(item=><div className="dm-bio" key={item.label}>
        <h6>{item.label}</h6><p className="dm-text-block">{item.value}</p>
      </div>):<p className="dm-sheet-muted">玩家尚未填寫人物設定。</p>}
    </section>
    <p className="dm-sheet-footer">這是從玩家主動分享的角色存檔產生的唯讀檢視；不會寫入 GM 本機角色庫，也不會更改玩家角色。</p>
  </article>;
}
