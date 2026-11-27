import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@convex-dev/auth/server",()=>({
  getAuthUserId:vi.fn(async()=> "u_test"),
}));
import { getForCampaign, removeForCampaign, upsertForCampaign } from "../convex/wowRules";

const sha="a".repeat(64);
function manifest(extra:Record<string,unknown>={}) {
  return JSON.stringify({
    schemaVersion:1,dlcId:"wow-2026",sourceSnapshotSha:sha,levels:[1,2,3],
    classes:Array.from({length:13},(_,i)=>({id:"c"+i})),
    specializations:Array.from({length:40},(_,i)=>({id:"s"+i})),
    progressionRows:Array.from({length:120},(_,i)=>({i})),
    records:{},...extra,
  });
}
function fakeDb({owner=true,member=false}:{owner?:boolean;member?:boolean}={}) {
  let seq=0;
  const state:{
    owner:boolean;member:boolean;manifest:any|null;writes:{op:string;value?:unknown}[];
  }={owner,member,manifest:null,writes:[]};
  const db={
    get:async(id:string)=>{
      if(id==="u_test") return {role:"user"};
      if(id==="campaign_a") return {_id:"campaign_a",ownerId:state.owner?"u_test":"owner_admin",name:"WoW"};
      if(state.manifest?._id===id) return state.manifest;
      return null;
    },
    query:(table:string)=>({
      withIndex:(_name:string,_fn:unknown)=>({
        unique:async()=>{
          if(table==="memberships") return state.member
            ? {_id:"member_a",campaignId:"campaign_a",userId:"u_test"} : null;
          if(table==="wowRuleManifests") return state.manifest;
          return null;
        },
      }),
    }),
    insert:async(table:string,value:Record<string,unknown>)=>{
      const id="new_"+(++seq);state.writes.push({op:"insert:"+table,value});
      if(table==="wowRuleManifests") state.manifest={_id:id,...value};
      return id;
    },
    patch:async(id:string,value:Record<string,unknown>)=>{
      state.writes.push({op:"patch:"+id,value});
      if(state.manifest?._id===id)Object.assign(state.manifest,value);
    },
    delete:async(id:string)=>{
      state.writes.push({op:"delete:"+id});
      if(state.manifest?._id===id)state.manifest=null;
    },
  };
  return {ctx:{db} as any,state};
}
beforeEach(()=>vi.useRealTimers());
describe("campaign-scoped WoW private rules provider",()=>{
  it("allows campaign owner to create/update with revision checks",async()=>{
    const {ctx,state}=fakeDb({owner:true});
    const first=await (upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:manifest(),expectedRevision:null,
    });
    expect(first).toMatchObject({revision:1,sourceSnapshotSha:sha});
    await expect((upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:manifest(),expectedRevision:null,
    })).rejects.toThrow("REVISION_CONFLICT");
    const second=await (upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:manifest(),expectedRevision:1,
    });
    expect(second.revision).toBe(2);
    expect(state.manifest.revision).toBe(2);
  });
  it("lets a joined member read but blocks an outsider",async()=>{
    const member=fakeDb({owner:false,member:true});
    member.state.manifest={_id:"rules_a",campaignId:"campaign_a",manifestJson:manifest(),
      sourceSnapshotSha:sha,revision:1,updatedAt:100};
    await expect((getForCampaign as any)._handler(member.ctx,{campaignId:"campaign_a"}))
      .resolves.toMatchObject({revision:1,sourceSnapshotSha:sha});
    const outsider=fakeDb({owner:false,member:false});
    outsider.state.manifest=member.state.manifest;
    await expect((getForCampaign as any)._handler(outsider.ctx,{campaignId:"campaign_a"}))
      .rejects.toThrow("NOT_MEMBER");
  });
  it("blocks a member from uploading or removing the provider manifest",async()=>{
    const {ctx,state}=fakeDb({owner:false,member:true});
    await expect((upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:manifest(),expectedRevision:null,
    })).rejects.toThrow("FORBIDDEN");
    state.manifest={_id:"rules_a",campaignId:"campaign_a",manifestJson:manifest(),
      sourceSnapshotSha:sha,revision:1,updatedAt:100};
    await expect((removeForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",expectedRevision:1,
    })).rejects.toThrow("FORBIDDEN");
  });
  it("rejects prose-bearing or structurally incomplete manifests before writing",async()=>{
    const {ctx,state}=fakeDb({owner:true});
    await expect((upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:manifest({description:"licensed rule prose"}),expectedRevision:null,
    })).rejects.toThrow("PAID_PROSE_NOT_ALLOWED");
    await expect((upsertForCampaign as any)._handler(ctx,{
      campaignId:"campaign_a",manifestJson:JSON.stringify({
        schemaVersion:1,dlcId:"wow-2026",sourceSnapshotSha:sha,levels:[1,2,3],
        classes:[],specializations:[],progressionRows:[],records:{},
      }),expectedRevision:null,
    })).rejects.toThrow("CLASS_COUNT_13_REQUIRED");
    expect(state.writes).toHaveLength(0);
  });
});
