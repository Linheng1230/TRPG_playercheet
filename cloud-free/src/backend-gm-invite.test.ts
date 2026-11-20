import {afterEach,describe,expect,it,vi} from "vitest";
vi.mock("@convex-dev/auth/server",()=>({
  getAuthUserId:vi.fn(async()=>"u_test"),
}));
import {create,join} from "../convex/campaigns";

/** Deterministic in-memory transaction stub; exercises the actual exported handlers. */
function fakeCampaignDb(role:"admin"|"user"="user"){
  let seq=0;
  const state:{
    role:"admin"|"user";
    attempts:null|{_id:string,userId:string,windowStartedAt:number,attempts:number};
    invites:Record<string,unknown>|null;
    membership:Record<string,unknown>|null;
    writes:{table:string;value:unknown}[];
  }={role,attempts:null,invites:null,membership:null,writes:[]};
  const db={
    get:async(id:string)=>{
      if(id==="u_test")return {role:state.role};
      if(id==="campaign_a")return {_id:"campaign_a",ownerId:"owner_admin",name:"Test"};
      return null;
    },
    query:(table:string)=>({
      withIndex:(_name:string,_fn:unknown)=>({
        unique:async()=>{
          if(table==="inviteJoinAttempts")return state.attempts;
          if(table==="campaignInvites")return state.invites;
          if(table==="memberships")return state.membership;
          return null;
        },
      }),
    }),
    insert:async(table:string,value:Record<string,unknown>)=>{
      state.writes.push({table,value});
      const id="new_"+(++seq);
      if(table==="inviteJoinAttempts")state.attempts={_id:id,userId:"u_test",windowStartedAt:Number(value.windowStartedAt),attempts:Number(value.attempts)};
      if(table==="memberships")state.membership={_id:id,...value};
      return id;
    },
    patch:async(id:string,value:Record<string,unknown>)=>{
      state.writes.push({table:"patch:"+id,value});
      if(state.attempts?._id===id)Object.assign(state.attempts,value);
      if(state.invites?._id===id)Object.assign(state.invites,value);
    },
  };
  return {ctx:{db} as {db:typeof db},state};
}
afterEach(()=>vi.useRealTimers());
describe("actual Convex GM creation handler",()=>{
  it("rejects normal authenticated players before any campaign write",async()=>{
    const {ctx,state}=fakeCampaignDb("user");
    await expect((create as any)._handler(ctx,{name:"玩家擅自建立團務"})).rejects.toThrow("GM_ONLY");
    expect(state.writes).toHaveLength(0);
  });
  it("admits authenticated, pre-provisioned admin without public role self-grant",async()=>{
    const {ctx,state}=fakeCampaignDb("admin");
    await expect((create as any)._handler(ctx,{name:"GM 戰役"})).resolves.toMatch(/^new_/);
    expect(state.writes).toHaveLength(1);
    expect(state.writes[0].table).toBe("campaigns");
  });
});
describe("actual Convex invite join handler",()=>{
  it("rejects stale pre-release Pages clients before writing any state",async()=>{
    const {ctx,state}=fakeCampaignDb();
    await expect((join as any)._handler(ctx,{codeHash:"a".repeat(64)}))
      .rejects.toThrow("CLIENT_UPDATE_REQUIRED");
    expect(state.writes).toHaveLength(0);
  });
  it("commits failed attempts and returns invalid status instead of throwing",async()=>{
    vi.useFakeTimers();vi.setSystemTime(1000000);
    const {ctx,state}=fakeCampaignDb();
    for(let i=0;i<5;i++)expect(await (join as any)._handler(ctx,{codeHash:"a".repeat(64),clientProtocol:"v2"}))
      .toEqual({status:"invalid"});
    expect(state.attempts?.attempts).toBe(5);
    const before=state.writes.length;
    expect(await (join as any)._handler(ctx,{codeHash:"a".repeat(64),clientProtocol:"v2"}))
      .toEqual({status:"rate_limited"});
    expect(state.writes.length).toBe(before);
    vi.advanceTimersByTime(10*60*1000);
    expect(await (join as any)._handler(ctx,{codeHash:"a".repeat(64),clientProtocol:"v2"}))
      .toEqual({status:"invalid"});
    expect(state.attempts?.attempts).toBe(1);
  });
  it("joins a valid invitation atomically and does not auto-share any character",async()=>{
    vi.useFakeTimers();vi.setSystemTime(2000000);
    const {ctx,state}=fakeCampaignDb("user");
    state.invites={_id:"invite_a",campaignId:"campaign_a",expiresAt:Date.now()+80000};
    expect(await (join as any)._handler(ctx,{codeHash:"b".repeat(64),clientProtocol:"v2"}))
      .toEqual({status:"joined",campaignId:"campaign_a"});
    expect(state.writes.some(x=>x.table==="memberships")).toBe(true);
    expect(state.writes.some(x=>x.table==="patch:invite_a")).toBe(true);
    expect(state.writes.some(x=>x.table==="characterShares")).toBe(false);
  });
  it("returns owner status and does not consume an invite or share",async()=>{
    vi.useFakeTimers();vi.setSystemTime(2000000);
    const {ctx,state}=fakeCampaignDb();
    state.invites={_id:"invite_a",campaignId:"campaign_a",expiresAt:Date.now()+80000};
    const originalGet=ctx.db.get;
    ctx.db.get=async(id:string)=>{
      if(id==="campaign_a")return {_id:"campaign_a",ownerId:"u_test"} as never;
      return originalGet(id as never);
    };
    expect(await (join as any)._handler(ctx,{codeHash:"b".repeat(64),clientProtocol:"v2"})).toEqual({status:"owner"});
    expect(state.writes.some(x=>x.table==="patch:invite_a")).toBe(false);
  });
});
