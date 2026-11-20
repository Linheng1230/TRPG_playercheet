import { describe, expect, it } from "vitest";
import { mergeLocalIntoCloud, shouldAutoMergeAfterAuth, type CloudCharacterRef, type MergeOperations } from "./signup-local-merge";
import { ROSTER_KEY, characterStorageKey, type RosterStorage } from "./local-roster";

class TestStorage implements RosterStorage {
  readonly data = new Map<string, string>();
  getItem(key:string){return this.data.get(key)??null}
  setItem(key:string, value:string){this.data.set(key,value)}
  removeItem(key:string){this.data.delete(key)}
}
const save=(id:string, ruleset:"2014"|"2024"="2024")=>JSON.stringify({
  v:ruleset==="2014"?9:10,id,ruleset,level:1,cls:"戰士",
  meta:{name:"本機角色-"+id},custom:{arbitrary:"preserved"},
});
function setup(...inputs:string[]){
  const storage=new TestStorage();
  const rows=inputs.map(raw=>{
    const o=JSON.parse(raw) as { id:string;ruleset:string;cls:string;meta:{name:string} };
    storage.setItem(characterStorageKey(o.id),raw);
    return {id:o.id,name:o.meta.name,ruleset:o.ruleset,cls:o.cls,sub:null,level:1,ts:1,thumb:""};
  });
  storage.setItem(ROSTER_KEY,JSON.stringify(rows));
  const cloud=new Map<string,{id:string,raw:string}>();
  let counter=0;
  const mutations:string[]=[];
  const api:MergeOperations={
    listMine:async()=>[...cloud.entries()].map(([characterId,r])=>({_id:r.id,characterId,revision:1})),
    getJson:async(id)=>{
      const r=[...cloud.values()].find(x=>x.id===id);
      if(!r)throw Error("NOT_FOUND");
      return r.raw;
    },
    createOnly:async(raw)=>{
      const o=JSON.parse(raw) as {id:string};
      mutations.push(raw);
      if(cloud.has(o.id))throw Error("REVISION_CONFLICT");
      const id="remote_"+(++counter);
      cloud.set(o.id,{id,raw});
      return {id};
    },
  };
  return {storage,cloud,mutations,api};
}
describe("signup-only upload consent boundary",()=>{
  it("queues automatic merge only after successful registration with opt-in",()=>{
    expect(shouldAutoMergeAfterAuth("signup","complete",true)).toBe(true);
    expect(shouldAutoMergeAfterAuth("signup","complete",false)).toBe(false);
    expect(shouldAutoMergeAfterAuth("signup","error",true)).toBe(false);
    expect(shouldAutoMergeAfterAuth("signin","complete",true)).toBe(false);
    expect(shouldAutoMergeAfterAuth("signin","complete",false)).toBe(false);
  });
});
describe("one-time new account local->cloud additive merge",()=>{
  it("adds 2024 and 2014 saves without modifying local bytes or metadata",async()=>{
    const a=save("cNew2024"),b=save("cNew2014","2014");
    const x=setup(a,b);const localBefore=[...x.storage.data.entries()];
    const result=await mergeLocalIntoCloud(x.storage,x.api);
    expect(result).toEqual({eligible:2,added:2,identical:0,conflicts:[],failed:[],unsupported:0});
    expect(x.mutations).toEqual([a,b]);expect([...x.storage.data.entries()]).toEqual(localBefore);
    expect(x.cloud.get("cNew2014")?.raw).toBe(b);
  });
  it("is idempotent: a second merge skips identical bytes",async()=>{
    const x=setup(save("cSame"));
    await mergeLocalIntoCloud(x.storage,x.api);
    const again=await mergeLocalIntoCloud(x.storage,x.api);
    expect(again.added).toBe(0);expect(again.identical).toBe(1);expect(x.mutations).toHaveLength(1);
  });
  it("keeps both versions when same ID differs; no overwrite, no new duplicate",async()=>{
    const local=save("cConflict");
    const x=setup(local);const server=JSON.stringify({...JSON.parse(local),level:15});
    x.cloud.set("cConflict",{id:"remote_1",raw:server});
    const before=[...x.storage.data.entries()];
    const result=await mergeLocalIntoCloud(x.storage,x.api);
    expect(result.conflicts).toEqual([{id:"cConflict",name:"本機角色-cConflict"}]);
    expect(result.added).toBe(0);expect(x.mutations).toHaveLength(0);
    expect(x.cloud.get("cConflict")?.raw).toBe(server);
    expect([...x.storage.data.entries()]).toEqual(before);
  });
  it("continues after one upload failure without ever deleting local data",async()=>{
    const raw1=save("cFails"),raw2=save("cWorks");const x=setup(raw1,raw2);
    const api={...x.api,createOnly:async(raw:string)=>{
      if(raw===raw1)throw Error("NETWORK");
      return x.api.createOnly(raw);
    }};
    const before=[...x.storage.data.entries()];
    const result=await mergeLocalIntoCloud(x.storage,api);
    expect(result.failed).toEqual([{id:"cFails",name:"本機角色-cFails"}]);
    expect(result.added).toBe(1);
    expect([...x.storage.data.entries()]).toEqual(before);
  });
  it("fails evidence check if backend mutation returned success but raw readback differs",async()=>{
    const raw=save("cMismatch");const x=setup(raw);
    const api={...x.api,getJson:async()=>"{incorrect}"};
    const result=await mergeLocalIntoCloud(x.storage,api);
    expect(result.added).toBe(0);expect(result.failed).toHaveLength(1);
    expect(x.storage.getItem(characterStorageKey("cMismatch"))).toBe(raw);
  });
  it("does not call backend at all when no eligible characters exist",async()=>{
    const x=setup();let called=false;
    const api={...x.api,listMine:async()=>{called=true;return []}};
    const result=await mergeLocalIntoCloud(x.storage,api);
    expect(result.eligible).toBe(0);expect(called).toBe(false);
  });
  it("preserves unsupported legacy v8 while uploading v10",async()=>{
    const legacy=JSON.stringify({v:8,id:"cOld",ruleset:"2024",meta:{name:"old"}});
    const current=save("cCurrent");const x=setup(legacy,current);
    const before=[...x.storage.data.entries()];
    const result=await mergeLocalIntoCloud(x.storage,x.api);
    expect(result).toMatchObject({eligible:1,added:1,unsupported:1});
    expect([...x.storage.data.entries()]).toEqual(before);
  });
  it("refuses corrupt roster before any network or local write",async()=>{
    const x=setup(save("cSafe"));x.storage.setItem(ROSTER_KEY,"[broken");
    const before=[...x.storage.data.entries()];
    await expect(mergeLocalIntoCloud(x.storage,x.api)).rejects.toThrow("同步未開始");
    expect(x.mutations).toHaveLength(0);expect([...x.storage.data.entries()]).toEqual(before);
  });
  it("refuses duplicate remote IDs before uploading anything",async()=>{
    const x=setup(save("cA"));
    const api={...x.api,listMine:async():Promise<CloudCharacterRef[]>=>[
      {_id:"a",characterId:"cA",revision:1},{_id:"b",characterId:"cA",revision:2},
    ]};
    await expect(mergeLocalIntoCloud(x.storage,api)).rejects.toThrow("重複角色");
    expect(x.mutations).toHaveLength(0);
  });
  it("does not mistake an unrelated account's cloud record for a new local save",async()=>{
    const x=setup(save("cOwn"));x.cloud.set("cDifferent",{id:"server_other",raw:save("cDifferent")});
    const result=await mergeLocalIntoCloud(x.storage,x.api);
    expect(result.added).toBe(1);expect(x.cloud.size).toBe(2);
    expect(x.cloud.get("cDifferent")?.raw).toBe(save("cDifferent"));
  });
});
