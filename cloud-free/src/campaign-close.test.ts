import {beforeEach,describe,expect,it,vi} from "vitest";

const actor=vi.hoisted(()=>({id:"gm"}));
vi.mock("@convex-dev/auth/server",()=>({getAuthUserId:vi.fn(async()=>actor.id)}));
import * as campaignHandlers from "../convex/campaigns";
import {closeCampaign,reopenCampaign,issueInvite,revokeInvite,listInvites,dmRoster,dmReadShared,share,join} from "../convex/campaigns";

function localDb(){
  const users=[{_id:"gm",role:"admin"},{_id:"player",role:"user"},{_id:"othergm",role:"admin"}];
  const campaigns=[{_id:"c1",ownerId:"gm",name:"北國之旅",createdAt:1,closedAt:0},{_id:"c2",ownerId:"othergm",name:"另一團",createdAt:2,closedAt:0}];
  const memberships=[{_id:"m1",campaignId:"c1",userId:"player"}];
  const characterShares=[{_id:"s1",campaignId:"c1",characterId:"ch1",ownerId:"player"}];
  const campaignInvites=[{_id:"i1",campaignId:"c1",codeHash:"a".repeat(64),expiresAt:Date.now()+86400000,createdBy:"gm"}];
  const characters=[{_id:"ch1",ownerId:"player",originalJson:'{"v":10}',characterId:"cSave"}];
  const inviteJoinAttempts:Record<string,unknown>[]=[];
  const tables:Record<string,Record<string,unknown>[]>={users,campaigns,memberships,characterShares,campaignInvites,characters,inviteJoinAttempts};
  const writes:string[]=[];
  const db={
    get:async(id:string)=>Object.values(tables).flat().find(x=>x._id===id)??null,
    query:(table:string)=>({
      withIndex:(_name:string,filter:(q:{eq:(k:string,v:unknown)=>unknown})=>unknown)=>{
        const params:Record<string,unknown>={};const q={eq(k:string,v:unknown){params[k]=v;return q;}};
        filter(q);
        const found=()=>tables[table].filter(x=>Object.entries(params).every(([k,v])=>x[k]===v));
        return {unique:async()=>found()[0]??null,first:async()=>found()[0]??null,collect:async()=>found()};
      }
    }),
    insert:async(table:string,value:Record<string,unknown>)=>{
      const row={_id:"new"+writes.length,...value};tables[table].push(row);writes.push("insert:"+table);return row._id;
    },
    patch:async(id:string,value:Record<string,unknown>)=>{
      const doc=Object.values(tables).flat().find(x=>x._id===id);if(!doc)throw Error("NO_ROW");
      Object.assign(doc,value);writes.push("patch:"+id);
    },
    delete:async(id:string)=>{for(const [name,rows] of Object.entries(tables)){
      const i=rows.findIndex(x=>x._id===id);if(i>=0){rows.splice(i,1);writes.push("delete:"+name);return;}
    }throw Error("NO_ROW");},
  };
  return{ctx:{db} as never,tables,writes};
}
const close=(ctx:never,name="北國之旅")=>(closeCampaign as any)._handler(ctx,{campaignId:"c1",expectedName:name});
const reopen=(ctx:never,name="北國之旅")=>(reopenCampaign as any)._handler(ctx,{campaignId:"c1",expectedName:name});
beforeEach(()=>{actor.id="gm"});
describe("non-destructive campaign closure: real Convex registered handlers",()=>{
  it("does not register an irreversible removeCampaign handler",()=>{
    expect(Object.prototype.hasOwnProperty.call(campaignHandlers,"removeCampaign")).toBe(false);
  });
  it("only current GM owner can close; wrong name or demoted admin cannot",async()=>{
    const {ctx,writes,tables}=localDb();
    await expect(close(ctx,"其他名字")).rejects.toThrow("CAMPAIGN_NAME_MISMATCH");
    actor.id="player";await expect(close(ctx)).rejects.toThrow("GM_ONLY");
    actor.id="othergm";await expect(close(ctx)).rejects.toThrow("FORBIDDEN");
    actor.id="gm";tables.users[0].role="user";
    await expect(close(ctx)).rejects.toThrow("GM_ONLY");
    expect(writes).toHaveLength(0);
  });
  it("closes and reopens without deleting any campaign, user, invite, member or character",async()=>{
    const {ctx,tables,writes}=localDb();
    const originalUserData=JSON.stringify({memberships:tables.memberships,characterShares:tables.characterShares,characters:tables.characters});
    expect(await close(ctx)).toEqual({status:"closed"});
    const closedAt=tables.campaigns[0].closedAt as number;
    expect(closedAt).toBeGreaterThan(0);
    expect(await close(ctx)).toEqual({status:"already_closed"});
    expect(writes).toEqual(["patch:i1","patch:c1"]);
    expect(tables.campaignInvites[0].revokedAt).toBe(closedAt);
    for(const key of ["campaigns","users","memberships","characterShares","campaignInvites","characters"])
      expect(tables[key].length).toBeGreaterThan(0);
    expect(await reopen(ctx)).toEqual({status:"reopened"});
    expect(tables.campaigns[0].closedAt).toBe(0);
    expect(await reopen(ctx)).toEqual({status:"already_active"});
    expect(writes).toEqual(["patch:i1","patch:c1","patch:c1"]);
    expect(JSON.stringify({memberships:tables.memberships,characterShares:tables.characterShares,characters:tables.characters})).toBe(originalUserData);
  });
  it("accepts pre-upgrade campaigns without closedAt and preserves all linked player data",async()=>{
    const {ctx,tables,writes}=localDb();
    delete tables.campaigns[0].closedAt;
    const original=JSON.stringify({memberships:tables.memberships,characterShares:tables.characterShares,characters:tables.characters});
    expect(await close(ctx)).toEqual({status:"closed"});
    expect(tables.campaigns[0].closedAt).toBeGreaterThan(0);
    expect(await reopen(ctx)).toEqual({status:"reopened"});
    expect(tables.campaigns[0].closedAt).toBe(0);
    expect(JSON.stringify({memberships:tables.memberships,characterShares:tables.characterShares,characters:tables.characters})).toBe(original);
    expect(writes).toEqual(["patch:i1","patch:c1","patch:c1"]);
  });
  it("blocks invites, joining and new shares while closed but leaves revocation paths separate",async()=>{
    const {ctx,tables,writes}=localDb();
    await close(ctx);
    await expect((issueInvite as any)._handler(ctx,{campaignId:"c1",codeHash:"b".repeat(64),expiresAt:Date.now()+3600000})).rejects.toThrow("CAMPAIGN_CLOSED");
    actor.id="player";
    await expect((share as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"})).rejects.toThrow("CAMPAIGN_CLOSED");
    const answer=await (join as any)._handler(ctx,{codeHash:"a".repeat(64),clientProtocol:"v2"});
    expect(answer.status).toBe("invalid");
    expect(tables.memberships).toHaveLength(1);
    expect(tables.characterShares).toHaveLength(1);
    expect(writes.some(x=>x==="insert:memberships"||x==="insert:characterShares")).toBe(false);
  });

});

describe("GM active-role enforcement on shared-character reads and invite ownership",()=>{
  it("can read an actively shared character only while GM role and ownership remain valid",async()=>{
    const {ctx,tables,writes}=localDb();
    const active=(await (dmRoster as any)._handler(ctx,{campaignId:"c1"})) as {id:string}[];
    expect(active).toHaveLength(1);
    const readable=await (dmReadShared as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"});
    expect(readable.originalJson).toContain('"v":10');
    expect(writes).toHaveLength(0);
    // A GM can be demoted without changing the historic campaign ownerId.
    tables.users[0].role="user";
    await expect((dmRoster as any)._handler(ctx,{campaignId:"c1"})).rejects.toThrow("GM_ONLY");
    await expect((dmReadShared as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"})).rejects.toThrow("GM_ONLY");
    await expect((listInvites as any)._handler(ctx,{campaignId:"c1"})).rejects.toThrow("GM_ONLY");
    await expect((issueInvite as any)._handler(ctx,{campaignId:"c1",codeHash:"b".repeat(64),expiresAt:Date.now()+3600000})).rejects.toThrow("GM_ONLY");
    await expect((revokeInvite as any)._handler(ctx,{campaignId:"c1",inviteId:"i1"})).rejects.toThrow("GM_ONLY");
    expect(writes).toHaveLength(0);
  });
  it("does not let a different current GM view, invite or read another owner's campaign",async()=>{
    const {ctx,writes}=localDb();
    actor.id="othergm";
    await expect((dmRoster as any)._handler(ctx,{campaignId:"c1"})).rejects.toThrow("FORBIDDEN");
    await expect((dmReadShared as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"})).rejects.toThrow("FORBIDDEN");
    await expect((listInvites as any)._handler(ctx,{campaignId:"c1"})).rejects.toThrow("FORBIDDEN");
    expect(writes).toHaveLength(0);
  });
  it("revoking share or leaving the campaign prevents a fresh GM character read",async()=>{
    const {ctx,tables,writes}=localDb();
    tables.characterShares.splice(0,1);
    await expect((dmReadShared as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"})).rejects.toThrow("SHARE_REVOKED");
    expect(await (dmRoster as any)._handler(ctx,{campaignId:"c1"})).toEqual([]);
    // Stale orphaned share also cannot bypass missing membership.
    tables.characterShares.push({_id:"s1",campaignId:"c1",characterId:"ch1",ownerId:"player"});
    tables.memberships.splice(0,1);
    await expect((dmReadShared as any)._handler(ctx,{campaignId:"c1",characterId:"ch1"})).rejects.toThrow("SHARE_REVOKED");
    expect(await (dmRoster as any)._handler(ctx,{campaignId:"c1"})).toEqual([]);
    expect(writes).toHaveLength(0);
  });
});
