import React from "react";
import {describe,it,expect} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {projectDmSheet,sharedSheetRevisionStatus} from "./dm-sheet-projection";
import {DmCharacterSheet} from "./dm-character-sheet";

const raw=(ruleset:"2014"|"2024")=>JSON.stringify({
  v:ruleset==="2014"?9:10,ruleset,id:"cTestDM123",cls:ruleset==="2014"?"遊蕩者":"德魯伊",
  level:4,subName:ruleset==="2014"?"盜賊":"星辰結社",sp:ruleset==="2014"?"半身人":"卓爾",bg:"隱士",
  meta:{name:"測試冒險者",player:"玩家A",gender:"女",age:"86",align:"混亂善良"},
  base:{str:8,dex:14,con:12,int:10,wis:18,cha:13},
  skills:["察覺","動物馴養"],expertise:["察覺"],
  cantrips:["荊棘之鞭"],prepared:["妖火","治療真言"],spellbook:[],
  customSpells:[{n:"自訂冒險法術",lv:2,note:"測試"}],
  style:"",mastery:["長劍"],
  spChoices:{eLine:"高等精靈"},
  asi:{"4":{t:"feat",feat:"戰鬥施法者"}},
  play:{hp:21,hpMax:28,thp:3,hd:"1d8",ds:{s:1,f:0},insp:true,res:{star:1},resMax:{star:2},notes:"留意北門"},
  gear:{armor:"皮甲",shield:true,weapons:["長棍"],items:"繩索、火把",gold:{gp:10}},
  bio:{traits:"喜歡研究天空",story:"來自幽暗地域"},
  portrait:"data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
  sessionResourceLimits:{classes:{star:{label:"星辰形態",max:2}}},
});
describe("GM shared-save projection is human-readable, in memory and non-mutating",()=>{
  for(const ruleset of ["2014","2024"] as const){
    it("renders "+ruleset+" as a readonly sheet without leaking original JSON",()=>{
      const source=raw(ruleset),before=source;
      const sheet=projectDmSheet(source);
      expect(sheet.ruleset).toBe(ruleset);
      expect(sheet.name).toBe("測試冒險者");
      expect(sheet.hp).toBe(21);
      expect(sheet.abilities.find(a=>a.key==="wis")?.base).toBe(18);
      expect(sheet.resources).toContainEqual({name:"星辰形態",current:"1",max:"2"});
      expect(sheet.originChoices.join(" ")).toContain("戰鬥施法者");
      expect(sheet.portrait).toBe(""); // SVG is excluded; no unsafe data images
      const html=renderToStaticMarkup(React.createElement(DmCharacterSheet,{sheet}));
      expect(html).toContain("DM 唯讀角色卡");
      expect(html).toContain("生命");
      expect(html).toContain("妖火");
      expect(html).toContain("皮甲");
      expect(html).toContain("幽暗地域");
      expect(html).not.toContain("originalJson");
      expect(html).not.toContain("textarea");
      expect(html).not.toContain("data:image/svg");
      expect(source).toBe(before);
    });
  }
  it("escapes user-provided markup and does not render it as HTML",()=>{
    const unsafe=JSON.parse(raw("2024"));
    unsafe.meta.name='<img src=x onerror=alert(1)>';
    unsafe.bio.story='<script>alert("xss")</script>';
    const html=renderToStaticMarkup(React.createElement(DmCharacterSheet,{sheet:projectDmSheet(JSON.stringify(unsafe))}));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
  });
  it("rejects malformed and unsupported saves rather than guessing rules",()=>{
    expect(()=>projectDmSheet("{")).toThrow("無法讀取");
    expect(()=>projectDmSheet('{"v":10,"ruleset":"2024","id":"bad id"}')).toThrow("不支援");
    expect(()=>projectDmSheet(JSON.stringify({...JSON.parse(raw("2024")),v:13}))).toThrow("不支援");
    expect(()=>projectDmSheet("x".repeat(525000))).toThrow("超過");
  });
  it("shows incomplete stats as missing rather than fabricating AC or final ability scores",()=>{
    const o=JSON.parse(raw("2024")); delete o.play.hp;delete o.play.hpMax;delete o.base.wis;
    const sheet=projectDmSheet(JSON.stringify(o));
    expect(sheet.hp).toBe(null);
    expect(sheet.abilities.find(a=>a.key==="wis")?.base).toBe(null);
    const html=renderToStaticMarkup(React.createElement(DmCharacterSheet,{sheet}));
    expect(html).toContain("未記錄");
    expect(html).toContain("最終值與 AC");
  });
});

describe("GM view must track current share and character revision",()=>{
  const rows=[{id:"cA",revision:5},{id:"cB",revision:11}];
  it("allows only the matching shared row and revision",()=>{
    expect(sharedSheetRevisionStatus(rows,"cA",5)).toBe("valid");
    expect(sharedSheetRevisionStatus(rows,"cB",11)).toBe("valid");
  });
  it("invalidates a revoked character or vanished member instead of keeping cached data",()=>{
    expect(sharedSheetRevisionStatus(rows,"cMissing",5)).toBe("revoked");
    expect(sharedSheetRevisionStatus([],"cA",5)).toBe("revoked");
    expect(sharedSheetRevisionStatus(undefined,"cA",5)).toBe("loading");
  });
  it("invalidates the prior view when player uploads an updated revision",()=>{
    expect(sharedSheetRevisionStatus(rows,"cA",4)).toBe("stale");
    expect(sharedSheetRevisionStatus(rows,"cA",6)).toBe("stale");
    expect(sharedSheetRevisionStatus(rows,"cA",Number.NaN)).toBe("stale");
  });
  it("permits an in-flight request to wait for its returned revision",()=>{
    expect(sharedSheetRevisionStatus(rows,"cA",null)).toBe("valid");
  });
});
