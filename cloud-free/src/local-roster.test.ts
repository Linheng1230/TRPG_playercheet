import { describe, expect, it } from "vitest";
import {ROSTER_KEY, characterStorageKey, readLocalCharacters, readLocalRaw, importCloudSaveToLocal, extractNativeSave, type RosterStorage} from "./local-roster";

class FakeStorage implements RosterStorage {
  data=new Map<string,string>();
  rejectKey:string|null=null;
  getItem(k:string){return this.data.get(k)??null}
  setItem(k:string,v:string){if(k===this.rejectKey)throw Error("STORAGE_QUOTA");this.data.set(k,v)}
  removeItem(k:string){this.data.delete(k)}
}
const save=(id:string, ruleset:"2014"|"2024"="2024",v:9|10=10)=>
  JSON.stringify({v,id,ruleset,ts:122,meta:{name:"奈瑟琳"},cls:"德魯伊",level:4,spells:["x"],custom:{unknown:"must-preserve"}});
const init=(...saves:string[])=>{
 const storage=new FakeStorage();
 const rows=saves.map(raw=>{const c=JSON.parse(raw); storage.setItem(characterStorageKey(c.id),raw);return {id:c.id,name:c.meta.name,ruleset:c.ruleset,cls:c.cls,sub:null,level:c.level,ts:c.ts,thumb:""}});
 storage.setItem(ROSTER_KEY,JSON.stringify(rows));
 return storage;
};
describe("canonical localStorage adapter, no auto-sync",()=>{
  it("reads original 2024 and 2014 roster without changing bytes",()=>{
    const a=save("cOne");const b=save("cTwo","2014",9);const storage=init(a,b);
    const before=[...storage.data.entries()];
    expect(readLocalCharacters(storage).map(x=>[x.id,x.ruleset,x.saveVersion])).toEqual([["cOne","2024",10],["cTwo","2014",9]]);
    expect(readLocalRaw(storage,"cOne")).toBe(a);
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("rejects a mismatched row/id without losing the original local value",()=>{
    const storage=init(save("cActual"));
    storage.setItem(ROSTER_KEY,JSON.stringify([{id:"cDifferent",name:"stale"}]));
    expect(readLocalCharacters(storage)).toEqual([]);
    expect(storage.getItem(characterStorageKey("cActual"))).toBeTruthy();
  });
  it("imports a new cloud save to local roster without modifying original data",()=>{
    const storage=new FakeStorage();const raw=save("cCloud","2014",9);
    expect(importCloudSaveToLocal(storage,raw)).toEqual({status:"created",id:"cCloud"});
    expect(storage.getItem(characterStorageKey("cCloud"))).toBe(raw);
    expect(JSON.parse(storage.getItem(ROSTER_KEY)??"[]")[0]).toMatchObject({id:"cCloud",ruleset:"2014",name:"奈瑟琳"});
  });
  it("re-import of identical raw is idempotent and does not duplicate roster",()=>{
    const raw=save("cRepeat");const storage=init(raw);const before=[...storage.data.entries()];
    expect(importCloudSaveToLocal(storage,raw)).toEqual({status:"identical",id:"cRepeat"});
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("different cloud content of same ID never overwrites local save by default",()=>{
    const local=save("cSame");const remote=JSON.stringify({...JSON.parse(local),level:11});
    const storage=init(local);const before=[...storage.data.entries()];
    expect(importCloudSaveToLocal(storage,remote)).toEqual({status:"conflict",id:"cSame"});
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("explicit copy mode creates a different ID, keeps old save intact and preserves unknown fields",()=>{
    const local=save("cSame");const remote=JSON.stringify({...JSON.parse(local),level:9});
    const storage=init(local);
    expect(importCloudSaveToLocal(storage,remote,"copy",()=> "cSafeCopy")).toEqual({status:"copied",id:"cSafeCopy"});
    expect(storage.getItem(characterStorageKey("cSame"))).toBe(local);
    const copy=JSON.parse(storage.getItem(characterStorageKey("cSafeCopy"))??"{}");
    expect(copy).toMatchObject({id:"cSafeCopy",level:9,custom:{unknown:"must-preserve"}});
    expect(JSON.parse(storage.getItem(ROSTER_KEY)??"[]").map((x:{id:string})=>x.id)).toEqual(["cSafeCopy","cSame"]);
  });
  it("rejects a copy ID collision without editing either existing save",()=>{
    const storage=init(save("cOriginal"),save("cCopy"));
    const before=[...storage.data.entries()];
    const remote=JSON.stringify({...JSON.parse(save("cOriginal")),level:6});
    expect(()=>importCloudSaveToLocal(storage,remote,"copy",()=>"cCopy")).toThrow("COPY_ID_COLLISION");
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("rolls back character if writing the roster index hits a quota error",()=>{
    const storage=new FakeStorage();storage.rejectKey=ROSTER_KEY;
    expect(()=>importCloudSaveToLocal(storage,save("cRollback"))).toThrow("STORAGE_QUOTA");
    expect(storage.getItem(characterStorageKey("cRollback"))).toBe(null);
  });
  it("refuses import when existing roster is corrupt, preserving all keys",()=>{
    const storage=new FakeStorage();storage.setItem(ROSTER_KEY,"{broken");
    const before=[...storage.data.entries()];
    expect(()=>importCloudSaveToLocal(storage,save("cNew"))).toThrow("ROSTER_CORRUPT");
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("unwraps the genuine character-sheet JSON _save wrapper but not arbitrary readable data",()=>{
    const raw=save("cExport");
    expect(extractNativeSave(JSON.stringify({姓名:"奈瑟琳",_save:JSON.parse(raw)}))).toBe(raw);
    expect(()=>extractNativeSave(JSON.stringify({姓名:"某角色",版本:"5R"}))).toThrow("UNSUPPORTED_SAVE_VERSION");
    expect(extractNativeSave(raw)).toBe(raw);
  });
  it("rejects malformed cloud JSON and keeps local roster untouched",()=>{
    const storage=init(save("cExisting"));const before=[...storage.data.entries()];
    expect(()=>importCloudSaveToLocal(storage,'{"v":10,"id":"cBad","ruleset":"2025"}')).toThrow("UNSUPPORTED_RULESET");
    expect([...storage.data.entries()]).toEqual(before);
  });
  it("legacy v8 saves remain local but are excluded from the cloud uploader",()=>{
    const old=JSON.stringify({v:8,id:"cLegacy",ruleset:"2024",meta:{name:"old"}});
    const storage=init(old);
    expect(readLocalCharacters(storage)).toEqual([]);
    expect(storage.getItem(characterStorageKey("cLegacy"))).toBe(old);
  });
});

describe("legacy roster HTML safety of imported cloud metadata",()=>{
  it("entity-escapes unsafe name and class strings and never interpolates portrait URL into HTML",()=>{
    const storage=new FakeStorage();
    const raw=JSON.stringify({
      v:10,id:"cUnsafe",ruleset:"2024",level:4,
      meta:{name:'<img src=x onerror="alert(1)">'},cls:'"><script>alert(2)</script>',
      subName:'" onmouseover="alert(3)',portrait:'javascript:" onerror="alert(4)',
    });
    expect(importCloudSaveToLocal(storage,raw)).toEqual({status:"created",id:"cUnsafe"});
    const row=JSON.parse(storage.getItem(ROSTER_KEY)??"[]")[0];
    expect(row.name).toContain("&lt;img");
    expect(row.cls).toContain("&lt;script&gt;");
    expect(row.sub).toContain("&quot;");
    expect(row.thumb).toBe("");
    expect(row.name).not.toContain("<");
    expect(row.cls).not.toContain("<");
    expect(storage.getItem(characterStorageKey("cUnsafe"))).toBe(raw);
  });
});
