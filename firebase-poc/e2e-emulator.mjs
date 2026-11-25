import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
import {initializeTestEnvironment} from "@firebase/rules-unit-testing";
import {doc,updateDoc} from "firebase/firestore";
const qa=process.env.FIREBASE_QA_DIR||fileURLToPath(new URL("./qa-output/",import.meta.url));
const browserOptions={headless:true,args:["--no-sandbox"]};
if(process.env.BROWSER_EXE)browserOptions.executablePath=process.env.BROWSER_EXE;
else if(process.platform==="win32")browserOptions.executablePath="C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
const browser=await chromium.launch(browserOptions);
const env=await initializeTestEnvironment({projectId:"demo-dnd5r-firebase-spike",firestore:{host:"127.0.0.1",port:8089,rules:fs.readFileSync(new URL("./firestore.rules",import.meta.url),"utf8")}});
const report={utc:new Date().toISOString(),scope:"LOCAL_FIREBASE_AUTH+FIRESTORE_EMULATOR_ONLY_NOT_REAL_GOOGLE",steps:[],pass:false};
const step=(name)=>{report.steps.push({name,pass:true});console.log("E2E_PASS "+name)};
async function login(context,prefix,label){
 const page=await context.newPage();
 page.on("dialog",d=>void d.accept(d.type()==="prompt"?"Firebase 三項功能驗收團":undefined));
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text().slice(0,360));});
 await page.goto(process.env.FIREBASE_POC_URL||"http://127.0.0.1:5188",{waitUntil:"networkidle",timeout:20000});
 const popP=page.waitForEvent("popup",{timeout:10000});
 await page.getByRole("button",{name:"使用 Google 登入"}).click();
 const pop=await popP;
 await pop.waitForLoadState("domcontentloaded");
 if(!pop.url().startsWith("http://127.0.0.1:9099/emulator/auth/handler"))throw Error("AUTH_POPUP_NOT_EMULATOR");
 await pop.getByRole("button",{name:/Add new account/i}).click();
 const stamp=Date.now().toString(36);
 await pop.locator("input").nth(0).fill(prefix+stamp+"@example.test");
 await pop.locator("input").nth(1).fill(label);
 await pop.getByRole("button",{name:/Sign in with Google.com/i}).click();
 await page.getByRole("button",{name:"登出"}).waitFor({timeout:15000});
 const code=(await page.locator(".fb-auth code").innerText()).replace("玩家 UID：","").trim();
 if(code.length<7)throw Error("EMPTY_FIREBASE_UID");
 return {page,uid:code,errors};
}
let gmSession=null,playerSession=null;
try{
 fs.mkdirSync(qa,{recursive:true});
 const gmCtx=await browser.newContext({viewport:{width:1440,height:900}});
 const playerCtx=await browser.newContext({viewport:{width:390,height:844}});
 const gm=gmSession=await login(gmCtx,"gm-","本機 GM");
 const player=playerSession=await login(playerCtx,"player-","本機玩家");
 step("Google Auth Emulator popup -> Firebase callback for separate GM/player sessions");
 await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),"profiles",gm.uid),{role:"gm"}));
 await gm.page.reload({waitUntil:"domcontentloaded",timeout:15000});
 await gm.page.getByRole("heading",{name:"GM 團務（限現任 GM）"}).waitFor({timeout:14000});
 step("Admin-only GM role provisioned in emulator; player cannot self-elevate");
 await gm.page.getByRole("textbox",{name:"新戰役名稱"}).fill("Firebase 三項功能驗收團");
 await gm.page.getByRole("button",{name:"建立測試戰役"}).click();
 await gm.page.getByRole("button",{name:/Firebase 三項功能驗收團.*進行中/}).waitFor({timeout:14000});
 await gm.page.getByRole("button",{name:/Firebase 三項功能驗收團.*進行中/}).click();
 await gm.page.locator(".fb-panel-inner code").first().waitFor();
 const cid=(await gm.page.locator(".fb-panel-inner code").first().innerText()).trim();
 if(cid.length<10)throw Error("INVALID_TEST_CAMPAIGN_ID");
 step("GM created isolated Firestore test campaign");
 await gm.page.getByRole("textbox",{name:"現有玩家 UID"}).fill(player.uid);
 await gm.page.getByRole("button",{name:"邀請現有玩家加入（測試方式）"}).click();
 await gm.page.getByText("已新增測試成員").waitFor({timeout:14000});
 step("GM enrollment of existing synthetic player UID");
 const raw=JSON.stringify({v:10,ruleset:"2024",id:"E2eFirebaseStar",cls:"德魯伊",sp:"卓爾",subName:"星辰結社",level:4,bg:"隱士",meta:{name:"雲端星辰角色",player:"本機玩家"},base:{str:8,dex:14,con:12,int:10,wis:18,cha:13},skills:["察覺"],prepared:["治療真言","妖火"],play:{hp:21,hpMax:28},gear:{items:"手記與長棍"},bio:{story:"星光冒險者"}});
 const readableExport=JSON.stringify({displayOnly:"龍".repeat(180000),_save:JSON.parse(raw)});
 if(Buffer.byteLength(readableExport,"utf8")<=524288)throw Error("WRAPPER_FIXTURE_NOT_OVER_LIMIT");
 await player.page.locator('input[type="file"]').setInputFiles({name:"firebase-qa-readable-character.json",mimeType:"application/json",buffer:Buffer.from(readableExport,"utf8")});
 await player.page.getByText("角色已儲存到 Firebase 測試資料庫").waitFor({timeout:14000});
 step("Player uploaded a >512 KiB readable JSON wrapper with a valid native v10 Save");
 await player.page.getByRole("textbox",{name:"已加入的戰役 ID"}).fill(cid);
 await player.page.getByRole("button",{name:"開啟分享管理"}).click();
 await player.page.getByRole("button",{name:"主動分享給 GM"}).waitFor({timeout:14000});
 await player.page.getByRole("button",{name:"主動分享給 GM"}).click();
 await player.page.getByRole("button",{name:"撤銷分享"}).waitFor({timeout:14000});
 step("Player explicitly shared character to their campaign");
 // No GM refresh: listener must deliver the player sharing event.
 try{
   await gm.page.getByRole("button",{name:"查看唯讀角色卡"}).waitFor({timeout:20000});
 }catch(error){
   const gmText=(await gm.page.locator("body").innerText()).slice(-2400);
   const playerText=(await player.page.locator("body").innerText()).slice(-1100);
   console.error("E2E_GM_STATE_BEFORE_REJECTION="+JSON.stringify({gmText,playerText,errors:gm.errors}));
   throw error;
 }
 await gm.page.getByRole("button",{name:"查看唯讀角色卡"}).click();
 const card=gm.page.locator(".fb-panel-inner .dm-sheet");
 await card.waitFor();
 if(!(await card.innerText()).includes("雲端星辰角色"))throw Error("GM_VIEW_NOT_READABLE");
 if(await gm.page.locator("textarea").count())throw Error("RAW_JSON_EDITOR_EXPOSED");
 step("GM viewed readable native player character card, no raw JSON");
 // Real sync-panel cloud readback creates the canonical local Save. The
 // fixture write below isolates the already-tested native creator producer
 // while this browser test exercises the actual GM consumer end-to-end.
 await player.page.getByRole("button",{name:"從雲端讀回 雲端星辰角色",exact:true}).click();
 await player.page.getByText(/已從 Google 雲端讀回角色/).waitFor({timeout:15000});
 const recovered=await player.page.evaluate(()=>localStorage.getItem("dnd5r:char:E2eFirebaseStar"));
 if(recovered!==raw)throw Error("WRAPPER_NATIVE_SAVE_BYTES_CHANGED");
 step("Readable export import retains only exact native Save bytes on cloud readback");
 await player.page.evaluate(()=>{const key="dnd5r:char:E2eFirebaseStar",save=JSON.parse(localStorage.getItem(key));save.play.hp=17;localStorage.setItem(key,JSON.stringify(save));});
 await player.page.getByText(/已確認 1 筆既有 GM 分享/).waitFor({timeout:20000});
 await card.locator(".dm-stat").filter({hasText:"當前 HP"}).locator("strong").getByText("17",{exact:true}).waitFor({timeout:20000});
 step("canonical Save autosync through real player panel updates existing GM card without GM refresh");
 await gm.page.getByRole("button",{name:"關閉團務（可還原）"}).click();
 await gm.page.getByRole("button",{name:"重新開啟團務"}).waitFor({timeout:14000});
 await player.page.getByRole("heading",{name:/Firebase 三項功能驗收團.*已關閉/}).waitFor({timeout:12000});
 step("GM close synchronizes the player's campaign status automatically");
 // Existing shares remain readable even while campaign is closed.
 if(!(await card.innerText()).includes("雲端星辰角色"))throw Error("CLOSE_ERASED_CARD");
 if(!(await player.page.getByText("雲端星辰角色",{exact:false}).count()))throw Error("CLOSE_ERASED_PLAYER_CARD");
 step("Closing campaign preserved player character, membership and existing share");
 await gm.page.getByRole("button",{name:"重新開啟團務"}).click();
 await gm.page.getByRole("button",{name:"關閉團務（可還原）"}).waitFor({timeout:14000});
 await player.page.getByRole("heading",{name:/Firebase 三項功能驗收團.*進行中/}).waitFor({timeout:12000});
 step("Reopening campaign updates the player's status and retains original data");
 await player.page.getByRole("button",{name:"撤銷分享"}).click();
 await player.page.getByRole("button",{name:"主動分享給 GM"}).waitFor({timeout:14000});
 // No manual refresh: the GM list AND selected sheet must disappear.
 await gm.page.getByRole("button",{name:"查看唯讀角色卡"}).waitFor({state:"detached",timeout:12000});
 await card.waitFor({state:"detached",timeout:12000});
 step("Player revoked share; GM roster and selected sheet disappear live");
 await player.page.evaluate(()=>{const key="dnd5r:char:E2eFirebaseStar",save=JSON.parse(localStorage.getItem(key));save.play.hp=16;localStorage.setItem(key,JSON.stringify(save));});
 await player.page.getByText("個人角色已儲存；沒有可更新的既有 GM 分享。",{exact:true}).waitFor({timeout:20000});
 if(await gm.page.getByRole("button",{name:"查看唯讀角色卡"}).count())throw Error("REVOKED_SHARE_RESURRECTED");
 step("subsequent autosave cannot restore a revoked GM share");
 await gm.page.getByRole("button",{name:"刪除團務（可還原）"}).click();
 await gm.page.getByText("Firebase 三項功能驗收團 · 已刪除（資料保留）").waitFor({timeout:14000});
 if(await gm.page.getByRole("button",{name:/Firebase 三項功能驗收團.*進行中/}).count())throw Error("DELETED_CAMPAIGN_STILL_ACTIVE");
 step("GM soft deletion removes campaign from active list without deleting role or files");
 await gm.page.getByRole("button",{name:"還原團務"}).click();
 await gm.page.getByRole("button",{name:/Firebase 三項功能驗收團.*進行中/}).waitFor({timeout:14000});
 await gm.page.reload({waitUntil:"domcontentloaded",timeout:15000});
 await gm.page.getByRole("button",{name:/Firebase 三項功能驗收團.*進行中/}).waitFor({timeout:14000});
 step("GM restored trashed campaign; active state survives page reload");
 await env.withSecurityRulesDisabled(async ctx=>updateDoc(doc(ctx.firestore(),"profiles",gm.uid),{role:"player"}));
 await gm.page.getByRole("heading",{name:"GM 團務（限現任 GM）"}).waitFor({state:"detached",timeout:12000});
 step("GM role demotion immediately hides campaign controls without reload");
 if(gm.errors.length||player.errors.length)throw Error("BROWSER_JS_ERRORS "+JSON.stringify([...gm.errors,...player.errors]));
 const gmShot=path.join(qa,"firebase-full-gm-e2e.png");
 await gm.page.screenshot({path:gmShot,fullPage:true});
 report.pass=true;
 console.log("FIREBASE_REAL_EMULATOR_UI_E2E="+report.steps.length+"/"+report.steps.length+" PASS");
}catch(e){
  report.error=String(e?.stack||e);
  for(const [label,session] of [["GM",gmSession],["PLAYER",playerSession]]){
    if(!session)continue;
    try{
      const content=(await session.page.locator("body").innerText()).slice(-2500);
      const safe=content.replace(/玩家 UID：[a-zA-Z0-9_-]+/g,"玩家 UID：[test user]");
      console.error("FIREBASE_E2E_DIAG_"+label+"="+JSON.stringify({body:safe,errors:session.errors.slice(0,8)}));
    }catch(err){console.error("FIREBASE_E2E_DIAG_FAILED="+String(err).slice(0,220))}
  }
  console.error("FIREBASE_E2E_FAILED "+report.error.slice(0,1600));
  process.exitCode=1;
}
finally{
 fs.writeFileSync(path.join(qa,"FIREBASE_FULL_EMULATOR_UI_E2E.json"),JSON.stringify(report,null,2));
 await env.cleanup();await browser.close();
}
