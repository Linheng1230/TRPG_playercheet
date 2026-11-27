import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@convex-dev/auth/server",()=>({
  getAuthUserId:vi.fn(async()=> "u_test"),
}));
import { getForCampaign, removeForCampaign, upsertForCampaign } from "../convex/wowRules";
import {
  WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256,
  WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
} from "../convex/lib/wowPrivateManifest";

const sourceSha="a".repeat(64),translationSha="b".repeat(64);
const recordIds=Array.from({length:47},(_,i)=>"wowrec"+String(i).padStart(10,"0"));
function manifest(extra:Record<string,unknown>={}) {
  const records=Object.fromEntries(recordIds.map((id,i)=>[id,{
    pack:i%5===0?"spells":"classes",sourceSha,translationSha,
    semantic:"PENDING",mechanics:"PASS",nativeMapping:"PASS",liveUAT:"NOT_VERIFIED",
  }]));
  return JSON.stringify({
    schemaVersion:1,dlcId:"wow-2026",
    sourceSnapshotSha:"bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360",
    levels:[1,2,3],
    classes:Array.from({length:13},(_,i)=>({id:"c"+i})),
    specializations:Array.from({length:40},(_,i)=>({id:"s"+i})),
    progressionRows:Array.from({length:120},(_,i)=>({i})),
    records,...extra,
  });
}
function bundle(manifestJson=manifest()) {
  const m=JSON.parse(manifestJson);
  return JSON.stringify({
    schemaVersion:1,dlcId:"wow-2026",scope:"P0_PRIVATE_LV1_3_CONTENT",
    manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
    sourceSnapshotSha:m.sourceSnapshotSha,recordCount:47,
    records:Object.fromEntries(Object.entries(m.records).map(([id,proof]:any)=>[id,{
      id,pack:proof.pack,sourceSha:proof.sourceSha,translationSha:proof.translationSha,
      name:"私人能力 "+id,description:"私人授權內容 "+id,
    }])),
  });
}
function args(campaignId="campaign_a",manifestJson=manifest(),contentBundleJson=bundle(manifestJson)){
  return {campaignId,manifestJson,contentBundleJson,
    manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
    contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256};
}
function fakeDb({owner=true,member=false}:{owner?:boolean;member?:boolean}={}) {
  let seq=0;
  const state:{owner:boolean;member:boolean;manifest:any|null;writes:{op:string;value?:unknown}[]}=
    {owner,member,manifest:null,writes:[]};
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
  it("allows campaign owner to create/update an atomic manifest/content pair",async()=>{
    const {ctx,state}=fakeDb({owner:true});
    const first=await (upsertForCampaign as any)._handler(ctx,{...args(),expectedRevision:null});
    expect(first).toMatchObject({revision:1,manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
      contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256});
    await expect((upsertForCampaign as any)._handler(ctx,{...args(),expectedRevision:null}))
      .rejects.toThrow("REVISION_CONFLICT");
    const second=await (upsertForCampaign as any)._handler(ctx,{...args(),expectedRevision:1});
    expect(second.revision).toBe(2);expect(state.manifest.revision).toBe(2);
  });
  it("lets a joined member read both private payloads but blocks an outsider",async()=>{
    const member=fakeDb({owner:false,member:true});
    member.state.manifest={_id:"rules_a",...args(),sourceSnapshotSha:
      "bf56d84d4887cb9ff97aac82e604be1691c4ad3a927eec7e78dfe142b6218360",
      revision:1,updatedAt:100};
    await expect((getForCampaign as any)._handler(member.ctx,{campaignId:"campaign_a"}))
      .resolves.toMatchObject({revision:1,manifestSha:WOW_PRIVATE_LV1_3_MANIFEST_SHA256,
        contentBundleSha:WOW_PRIVATE_LV1_3_CONTENT_BUNDLE_SHA256});
    const outsider=fakeDb({owner:false,member:false});outsider.state.manifest=member.state.manifest;
    await expect((getForCampaign as any)._handler(outsider.ctx,{campaignId:"campaign_a"}))
      .rejects.toThrow("NOT_MEMBER");
  });
  it("blocks a member from uploading or removing the provider pair",async()=>{
    const {ctx,state}=fakeDb({owner:false,member:true});
    await expect((upsertForCampaign as any)._handler(ctx,{...args(),expectedRevision:null}))
      .rejects.toThrow("FORBIDDEN");
    state.manifest={_id:"rules_a",...args(),revision:1,updatedAt:100};
    await expect((removeForCampaign as any)._handler(ctx,{campaignId:"campaign_a",expectedRevision:1}))
      .rejects.toThrow("FORBIDDEN");
  });
  it("rejects prose in manifest, mismatched bundle records and noncanonical hash pins",async()=>{
    const {ctx,state}=fakeDb({owner:true});
    const prose=manifest({description:"licensed rule prose"});
    await expect((upsertForCampaign as any)._handler(ctx,{...args("campaign_a",prose,bundle(prose)),expectedRevision:null}))
      .rejects.toThrow("PAID_PROSE_NOT_ALLOWED");
    const m=manifest(),badBundle=JSON.stringify({...JSON.parse(bundle(m)),records:{}});
    await expect((upsertForCampaign as any)._handler(ctx,{...args("campaign_a",m,badBundle),expectedRevision:null}))
      .rejects.toThrow("CONTENT_BUNDLE_CONTRACT_MISMATCH");
    await expect((upsertForCampaign as any)._handler(ctx,{...args(),manifestSha:"0".repeat(64),expectedRevision:null}))
      .rejects.toThrow("CANONICAL_PROVIDER_HASH_REQUIRED");
    expect(state.writes).toHaveLength(0);
  });
});
