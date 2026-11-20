import {describe,expect,it} from "vitest";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {readFileSync} from "node:fs";
import {DmCharacterSheet} from "../../cloud-free/src/dm-character-sheet";
import {campaignIsClosed,parseCharacter,viewSharedSave,type Campaign,type SharedCharacter} from "./model";

const sample=(ruleset:"2014"|"2024")=>JSON.stringify({
  v:ruleset==="2014"?9:10,ruleset,id:"cFirebaseSmoke2024",
  cls:"德魯伊",subName:"星辰結社",sp:"卓爾",bg:"隱士",level:4,
  meta:{name:"示範冒險者",player:"測試玩家"},base:{str:8,dex:14,con:12,int:10,wis:18,cha:13},
  play:{hp:22,hpMax:28,thp:0},skills:["察覺","自然"],
  cantrips:["指引術"],prepared:["妖火","治療真言"],
  gear:{armor:"皮甲",weapons:["長棍"],items:"旅行背包"},bio:{story:"尋找墜落的星星"}
});
const share=(raw:string):SharedCharacter=>{
  const v=JSON.parse(raw);
  return {ownerUid:"playerUid_123456",saveId:v.id,originalJson:raw,
    revision:1,saveVersion:v.v,ruleset:v.ruleset,displayName:v.meta.name,sharedAt:1};
};
describe("Firebase PoC preserves native v9/v10 character data",()=>{
  for(const ruleset of ["2014","2024"] as const){
    it(ruleset+" remains a complete readable sheet, not raw JSON",()=>{
      const raw=sample(ruleset),parsed=parseCharacter(raw);
      expect(parsed.sheet.ruleset).toBe(ruleset);
      expect(parsed.sheet.className).toBe("德魯伊");
      expect(parsed.sheet.hp).toBe(22);
      expect(parsed.sheet.cantrips).toEqual(["指引術"]);
      expect(parsed.sheet.abilities).toHaveLength(6);
      const html=renderToStaticMarkup(React.createElement(DmCharacterSheet,{sheet:parsed.sheet}));
      expect(html).toContain("DM 唯讀角色卡");
      expect(html).toContain("治療真言");
      expect(html).not.toContain("textarea");
      expect(html).not.toContain('originalJson');
      expect(viewSharedSave(share(raw)).name).toBe("示範冒險者");
      expect(JSON.parse(raw).v).toBe(ruleset==="2014"?9:10);
    });
  }
  it("does not accept incompatible or fabricated shared snapshots",()=>{
    const raw=sample("2024"),s=share(raw);
    expect(()=>viewSharedSave({...s,revision:0})).toThrow();
    expect(()=>viewSharedSave({...s,saveId:"cOtherId"})).toThrow();
    expect(()=>viewSharedSave({...s,ruleset:"2014"})).toThrow();
    expect(()=>parseCharacter('{"v":999,"ruleset":"2024","id":"cBad"}')).toThrow();
  });
  it("closing and reopening only changes campaign state; doesn't delete members/shares",()=>{
    const before:Campaign={ownerUid:"gmUid_123456",name:"測試戰役",createdAt:1,closedAt:0};
    const members=[{uid:"playerUid_123456"}],shares=[share(sample("2024"))];
    expect(campaignIsClosed(before)).toBe(false);
    const closed={...before,closedAt:Date.now()};
    expect(campaignIsClosed(closed)).toBe(true);
    const reopened={...closed,closedAt:0};
    expect(campaignIsClosed(reopened)).toBe(false);
    expect(members).toHaveLength(1);
    expect(shares).toHaveLength(1);
    expect(before.closedAt).toBe(0);
  });
  it("escapes untrusted player data during sheet rendering",()=>{
    const dangerous=JSON.parse(sample("2024"));
    dangerous.meta.name='<img src=x onerror=alert(1)>';
    const html=renderToStaticMarkup(React.createElement(DmCharacterSheet,{sheet:parseCharacter(JSON.stringify(dangerous)).sheet}));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});
describe("Firestore rules static source safeguards (not emulator authorization tests)",()=>{
  const rules=readFileSync(new URL("../firestore.rules",import.meta.url),"utf8");
  it("defaults to deny and never exposes client-side GM elevation",()=>{
    expect(rules).toContain("match /{document=**} { allow read,write: if false; }");
    expect(rules).toContain("request.resource.data.role == 'player'");
    expect(rules).toContain("allow update,delete: if false;");
    expect(rules).toContain("function gmOwner(cid)");
  });
  it("requires real membership for GM share reads and supports player revocation",()=>{
    expect(rules).toContain("allow get,list: if gmOwner(cid) ||");
    expect(rules).toContain("(mine(memberUid) && isMember(cid,memberUid))");
    expect(rules).toContain("allow delete: if mine(memberUid);");
    expect(rules).toContain("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['closedAt'])");
  });
  it("prevents permanent character, campaign and member deletion",()=>{
    expect((rules.match(/allow delete: if false;/g)||[]).length).toBeGreaterThanOrEqual(2);
    expect(rules).toContain("allow update,delete: if false; // Retain memberships.");
  });
});
