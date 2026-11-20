import {beforeEach,describe,expect,it,vi} from "vitest";

const actor=vi.hoisted(()=>({id:"gm"}));
vi.mock("@convex-dev/auth/server",()=>({getAuthUserId:vi.fn(async()=>actor.id)}));
import {closeCampaign,reopenCampaign,issueInvite,share,join,removeCampaign} from "../convex/campaigns";

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
beforeEach(()=>{actor.id="gm";vi.stubEnv("DND5R_CAMPAIGN_DELETE_ALLOWED","")});
describe("non-destructive campaign closure: real Convex registered handlers",()=>{
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
  it("does not bypass permanent deletion flag after closure",async()=>{
    const {ctx,writes}=localDb();await close(ctx);
    await expect((removeCampaign as any)._handler(ctx,{campaignId:"c1",expectedName:"北國之旅"})).rejects.toThrow("CAMPAIGN_DELETE_DISABLED");
    expect(writes.every(x=>x.startsWith("patch:"))).toBe(true);
  });
});
