import {beforeAll,afterAll,beforeEach,describe,expect,it} from "vitest";
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from "@firebase/rules-unit-testing";
import {collection,deleteDoc,doc,getDoc,getDocs,onSnapshot,setDoc,updateDoc} from "firebase/firestore";
import {readFileSync} from "node:fs";
const projectId="demo-dnd5r-firebase-spike";
const gm="gm_testing_123456",player="player_testing_123456",other="other_testing_123456";
const campaignId="campaign_testing_123456",charId="charStars2024";
let env:RulesTestEnvironment;
const db=(id:string)=>env.authenticatedContext(id).firestore();
const gmDb=()=>db(gm),playerDb=()=>db(player),otherDb=()=>db(other);
const camp=(who:string)=>doc(db(who),"campaigns",campaignId);
const member=(who:string,uid=player)=>doc(db(who),"campaigns",campaignId,"members",uid);
const profile=(who:string,uid=who)=>doc(db(who),"profiles",uid);
const char=(who:string)=>doc(db(who),"users",player,"characters",charId);
const share=(who:string)=>doc(db(who),"campaigns",campaignId,"members",player,"shares",charId);
const raw=JSON.stringify({v:10,ruleset:"2024",id:charId,cls:"德魯伊",level:4,subName:"星辰結社",sp:"卓爾",bg:"隱士",meta:{name:"星辰冒險者"},base:{wis:18},play:{hp:21,hpMax:28}});
const save={ownerUid:player,saveId:charId,originalJson:raw,revision:1,saveVersion:10,ruleset:"2024",displayName:"星辰冒險者",updatedAt:1000};
const shared={ownerUid:player,saveId:charId,originalJson:raw,revision:1,saveVersion:10,ruleset:"2024",displayName:"星辰冒險者",sharedAt:1000};
beforeAll(async()=>{
  env=await initializeTestEnvironment({
    projectId,firestore:{
      host:"127.0.0.1",port:8089,
      rules:readFileSync(new URL("../firestore.rules",import.meta.url),"utf8")
    }
  });
},25000);
afterAll(async()=>{if(env)await env.cleanup();});
beforeEach(async()=>{
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{
    const admin=context.firestore();
    await setDoc(doc(admin,"profiles",gm),{role:"gm",displayName:"測試 GM",createdAt:1});
    await setDoc(doc(admin,"profiles",player),{role:"player",displayName:"測試玩家",createdAt:1});
    await setDoc(doc(admin,"profiles",other),{role:"player",displayName:"其他玩家",createdAt:1});
    await setDoc(doc(admin,"campaigns",campaignId),{ownerUid:gm,name:"保留資料測試戰役",createdAt:1,closedAt:0});
  });
},25000);
describe("Firestore Rules Emulator: role/ownership and data retention",()=>{
  it("unauthenticated users cannot read campaign or player saves",async()=>{
    const anon=env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon,"campaigns",campaignId)));
    await assertFails(getDoc(doc(anon,"users",player,"characters",charId)));
  });
  it("players cannot elevate their own role to GM",async()=>{
    const freshUid="new_player_uid_123456";
    const ref=doc(db(freshUid),"profiles",freshUid);
    await assertFails(setDoc(ref,{role:"gm",displayName:"不合法 GM",createdAt:2}));
    await assertSucceeds(setDoc(ref,{role:"player",displayName:"正常玩家",createdAt:2}));
    await assertFails(updateDoc(ref,{role:"gm"}));
  });
  it("only current campaign GM owner may close/reopen without data deletion",async()=>{
    await assertFails(updateDoc(camp(player),{closedAt:100}));
    await assertFails(updateDoc(camp(other),{closedAt:100}));
    await assertSucceeds(updateDoc(camp(gm),{closedAt:100}));
    expect((await getDoc(camp(gm))).data()?.closedAt).toBe(100);
    await assertSucceeds(updateDoc(camp(gm),{closedAt:0}));
    expect((await getDoc(camp(gm))).data()?.closedAt).toBe(0);
    await assertFails(deleteDoc(camp(gm)));
  });
  it("GM may enroll a signed-in member; player may only write their own Save/share",async()=>{
    await assertFails(setDoc(member(player),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(char(player),save));
    await assertFails(getDoc(char(other)));
    await assertFails(setDoc(share(other),shared));
    await assertSucceeds(setDoc(share(player),shared));
    const result=await assertSucceeds(getDoc(share(gm)));
    expect(result.data()?.displayName).toBe("星辰冒險者");
    await assertFails(getDoc(share(other)));
    await assertFails(deleteDoc(char(player)));
  });
  it("revoked shares are immediately inaccessible, including if campaign remains open",async()=>{
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(char(player),save));
    await assertSucceeds(setDoc(share(player),shared));
    await assertSucceeds(deleteDoc(share(player)));
    const revoked=await assertSucceeds(getDoc(share(gm)));
    expect(revoked.exists()).toBe(false); // Authorized request, zero disclosed data.
    expect((await assertSucceeds(getDoc(char(player)))).data()?.originalJson).toBe(raw);
  });
  it("close preserves member, character and existing share; rejects new member/share",async()=>{
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(char(player),save));
    await assertSucceeds(setDoc(share(player),shared));
    await assertSucceeds(updateDoc(camp(gm),{closedAt:100}));
    expect((await assertSucceeds(getDoc(member(gm)))).exists()).toBe(true);
    expect((await assertSucceeds(getDoc(char(player)))).exists()).toBe(true);
    expect((await assertSucceeds(getDoc(share(gm)))).exists()).toBe(true);
    await assertFails(setDoc(member(gm,other),{uid:other,joinedAt:200}));
    const otherSave={...save,saveId:"charSecond",originalJson:raw,revision:1};
    await assertSucceeds(setDoc(doc(playerDb(),"users",player,"characters","charSecond"),otherSave));
    await assertFails(setDoc(doc(playerDb(),"campaigns",campaignId,"members",player,"shares","charSecond"),{...shared,saveId:"charSecond"}));
    await assertFails(deleteDoc(member(gm)));
    await assertSucceeds(updateDoc(camp(gm),{closedAt:0}));
    expect((await assertSucceeds(getDoc(share(gm)))).exists()).toBe(true);
  });
  it("a demoted GM immediately loses rights to read existing shares and update campaign",async()=>{
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(char(player),save));
    await assertSucceeds(setDoc(share(player),shared));
    await env.withSecurityRulesDisabled(async ctx=>{
      await updateDoc(doc(ctx.firestore(),"profiles",gm),{role:"player"});
    });
    await assertFails(getDoc(share(gm)));
    await assertFails(updateDoc(camp(gm),{closedAt:100}));
  });
  it("a different GM cannot read another GM's roster or private shares",async()=>{
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    await assertSucceeds(setDoc(char(player),save));
    await assertSucceeds(setDoc(share(player),shared));
    await env.withSecurityRulesDisabled(async ctx=>{
      await updateDoc(doc(ctx.firestore(),"profiles",other),{role:"gm"});
    });
    await assertFails(getDoc(share(other)));
    await assertFails(getDocs(collection(otherDb(),"campaigns",campaignId,"members")));
  });
});

// Regression: GM can safely attach a share listener as soon as the roster
// changes, even before that member has created their first share document.
describe("GM empty-share live subscription",()=>{
  it("allows current owner to subscribe, but not a different player",async()=>{
    await assertSucceeds(setDoc(member(gm),{uid:player,joinedAt:100}));
    const gmResult=await new Promise<number>((resolve,reject)=>{
      let stop=()=>{};
      stop=onSnapshot(collection(gmDb(),"campaigns",campaignId,"members",player,"shares"),
        snap=>{stop();resolve(snap.size);},
        err=>{stop();reject(err);});
    });
    expect(gmResult).toBe(0);
    const otherResult=new Promise<void>((resolve,reject)=>{
      let stop=()=>{};
      stop=onSnapshot(collection(otherDb(),"campaigns",campaignId,"members",player,"shares"),
        ()=>{stop();reject(Error("Other user unexpectedly read GM shares"));},
        ()=>{stop();resolve();});
    });
    await expect(otherResult).resolves.toBeUndefined();
  },12000);
});
