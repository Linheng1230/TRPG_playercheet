import {afterEach,describe,expect,it,vi} from "vitest";
vi.mock("@convex-dev/auth/server",()=>({getAuthUserId:vi.fn(async()=> "u_test")}));
import {myCampaigns,removeCampaign} from "../convex/campaigns";

function harness(ownerId="u_test") {
  const deletions:string[]=[];
  const reads:string[]=[];
  const campaigns=[{_id:"campaign_a",ownerId,name:"保存角色的戰役"}];
  const documents=new Map<string,{_id:string;[key:string]:unknown}>([
    ["member_a",{_id:"member_a",campaignId:"campaign_a"}],
    ["share_a",{_id:"share_a",campaignId:"campaign_a"}],
    ["invite_a",{_id:"invite_a",campaignId:"campaign_a"}],
    ["char_a",{_id:"char_a",ownerId:"player_a",originalJson:'{"v":10,"id":"character_a"}'}],
  ]);
  const db={
    get:async(id:string)=>{
      reads.push("get:"+id);
      if(id==="u_test")return {_id:id,role:"admin"};
      if(id==="campaign_a")return campaigns[0];
      return documents.get(id)??null;
    },
    query:(table:string)=>({
      withIndex:(_index:string,_filter:unknown)=>({
        collect:async()=>{
          reads.push("query:"+table);
          if(table==="campaigns")return campaigns.filter(x=>x.ownerId==="u_test");
          if(table==="memberships")return [documents.get("member_a")].filter(Boolean);
          if(table==="characterShares")return [documents.get("share_a")].filter(Boolean);
          if(table==="campaignInvites")return [documents.get("invite_a")].filter(Boolean);
          return [];
        },
      }),
    }),
    delete:async(id:string)=>{deletions.push(id);documents.delete(id);},
  };
  return {ctx:{db} as {db:typeof db},reads,deletions,documents};
}
const gate="DND5R_CAMPAIGN_DELETE_ALLOWED";
const on="ENABLE_CONFIRMED_CAMPAIGN_DELETE_V1";
afterEach(()=>vi.unstubAllEnvs());

describe("destructive campaign deletion release guard (actual Convex handlers)",()=>{
  it("defaults off even for owner/admin; performs zero destructive writes",async()=>{
    vi.stubEnv(gate,"");
    const {ctx,reads,deletions}=harness();
    expect(await (myCampaigns as any)._handler(ctx,{})).toMatchObject({deletionEnabled:false});
    await expect((removeCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedName:"保存角色的戰役"}))
      .rejects.toThrow("CAMPAIGN_DELETE_DISABLED");
    expect(deletions).toEqual([]);
    expect(reads.some(x=>x.startsWith("query:characterShares"))).toBe(false);
  });
  it("rejects similarly named or accidentally set rollout values",async()=>{
    vi.stubEnv(gate,"true");
    const {ctx,deletions}=harness();
    await expect((removeCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedName:"保存角色的戰役"}))
      .rejects.toThrow("CAMPAIGN_DELETE_DISABLED");
    expect(deletions).toHaveLength(0);
  });
  it("does not bypass owner authorization when activation is on",async()=>{
    vi.stubEnv(gate,on);
    const {ctx,deletions}=harness("another_user");
    await expect((removeCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedName:"保存角色的戰役"}))
      .rejects.toThrow("FORBIDDEN");
    expect(deletions).toHaveLength(0);
  });
  it("requires an exact campaign name even with activation and ownership",async()=>{
    vi.stubEnv(gate,on);
    const {ctx,deletions}=harness();
    await expect((removeCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedName:"保存角色的戰役 "}))
      .rejects.toThrow("CAMPAIGN_NAME_MISMATCH");
    expect(deletions).toHaveLength(0);
  });
  it("when explicitly enabled deletes grants/campaign but never characters",async()=>{
    vi.stubEnv(gate,on);
    const {ctx,deletions,documents}=harness();
    expect(await (myCampaigns as any)._handler(ctx,{})).toMatchObject({deletionEnabled:true});
    await (removeCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedName:"保存角色的戰役"});
    expect(new Set(deletions)).toEqual(new Set(["member_a","share_a","invite_a","campaign_a"]));
    expect(documents.get("char_a")?.originalJson).toBe('{"v":10,"id":"character_a"}');
  });
});
