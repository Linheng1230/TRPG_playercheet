import {describe,it,expect} from "vitest";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {lookupSpellReference,SpellReference} from "./spell-reference";
import {DmCharacterSheet} from "../../cloud-free/src/dm-character-sheet";
import {projectDmSheet} from "../../cloud-free/src/dm-sheet-projection";

describe("Firebase read-only spell references use existing 2014/2024 canonical data",()=>{
 it("2024 legacy spell name resolves to canonical details",()=>{
  const sp=lookupSpellReference("治療真言","2024");
  expect(sp?.name).toBe("療傷術");
  expect(sp?.level).toBe(1);
  expect(sp?.rules.length).toBeGreaterThan(20);
  expect(sp?.time).toBeTruthy();
 });
 it("2014 stays in 2014 dataset and keeps rule text",()=>{
  const sp=lookupSpellReference("Aid","2014");
  expect(sp?.english).toBe("Aid");
  expect(sp?.level).toBe(2);
  expect(sp?.rules.length).toBeGreaterThan(20);
 });
 it("unmatched custom name never silently receives another spell's rules",()=>{
  expect(lookupSpellReference("完全自創的法術","2024")).toBeNull();
  expect(renderToStaticMarkup(<SpellReference ruleset="2024" name="完全自創的法術"/>)).toContain("無速查資料");
 });
 it("click-to-open details are read-only and reuse the actual sheet spell selection",()=>{
  const raw=JSON.stringify({v:10,ruleset:"2024",id:"spellTestABC123",level:4,
   cls:"德魯伊",meta:{name:"測試角色"},cantrips:["指引術","酸液潑濺"],prepared:["治療真言"]});
  const sheet=projectDmSheet(raw);
  const html=renderToStaticMarkup(<DmCharacterSheet sheet={sheet} renderSpell={name=><SpellReference name={name} ruleset={sheet.ruleset}/>}/>);
  expect(html).toContain("<details");
  expect(html).toContain("點擊速查");
  expect(html).toContain("療傷術");
  expect(html).toContain("施法時間");
  expect(html).toContain("fb-semantic-ability");
  expect(html).toContain("fb-semantic-check");
  expect(html).toContain("fb-semantic-dice");
  expect(html).toContain("damage-semantic");
  expect(html).not.toContain("<textarea");
 });
 it("semantic styling changes markup, not pinned spell rules text or permissions",()=>{
  const original=lookupSpellReference("酸液潑濺","2024");
  expect(original).not.toBeNull();
  const html=renderToStaticMarkup(<SpellReference name="酸液潑濺" ruleset="2024"/>);
  const source=html.match(/<div class="fb-spell-rules">([\s\S]*?)<\/div>/)?.[1]||"";
  const text=source.replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
  expect(text).toBe(original!.rules);
  expect(html).toContain("fb-semantic-range");
  expect(html).toContain("fb-semantic-check");
  expect(html).toContain("fb-semantic-ability");
  expect(html).toContain("fb-semantic-dice");
  expect(html).toContain("damage-semantic");
  expect(html).not.toContain("<input");
 });
});
