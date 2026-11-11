"use strict";
const fs=require("fs"),path=require("path"),assert=require("assert");
const {chromium}=require("playwright");
const URL=process.env.QA_URL||"http://127.0.0.1:18766/index.html";
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,"fixtures","legacy-wizard.json"),"utf8")).save;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function makeContext(browser,seedRows,viewport){
  const ctx=await browser.newContext({viewport});
  await ctx.addInitScript(({rows})=>{
    window.ZIZI_ACCOUNT_CONFIG={
      enabled:true,
      supabaseUrl:"mock://local",
      supabasePublishableKey:"mock",
      syncDebounceMs:40
    };
    const cloud=(rows||[]).map(x=>JSON.parse(JSON.stringify(x)));
    let session=null,listeners=[];
    const notify=event=>listeners.forEach(fn=>fn(session,event));
    window.__ZIZI_ACCOUNT_PROVIDER_FACTORY__=async()=>({
      async getSession(){return session;},
      onAuthStateChange(cb){
        listeners.push(cb);
        return()=>{listeners=listeners.filter(x=>x!==cb);};
      },
      async signUp(email){return {user:{id:"u-a",email},session:null};},
      async signIn(email){
        const id=email.startsWith("b@")?"u-b":"u-a";
        session={user:{id,email}};
        notify("SIGNED_IN");
        return {user:session.user,session};
      },
      async signOut(){session=null;notify("SIGNED_OUT");},
      async sendPasswordReset(email){window.__mockResetEmail=email;return {};},
      async updatePassword(password){window.__mockNewPassword=password;return {user:session&&session.user};},
      async listCharacters(owner){
        return cloud.filter(r=>r.owner_user_id===owner).map(r=>JSON.parse(JSON.stringify(r)));
      },
      async getCharacter(owner,id){
        const r=cloud.find(x=>x.owner_user_id===owner&&x.client_character_id===id);
        return r?JSON.parse(JSON.stringify(r)):null;
      },
      async createCharacter(owner,snapshot){
        if(cloud.some(x=>x.owner_user_id===owner&&x.client_character_id===snapshot.id))throw new Error("duplicate");
        const r={
          owner_user_id:owner,
          client_character_id:snapshot.id,
          snapshot:JSON.parse(JSON.stringify(snapshot)),
          schema_version:+snapshot.v||0,
          revision:1,
          updated_at:new Date().toISOString()
        };
        cloud.push(r);
        return JSON.parse(JSON.stringify(r));
      },
      async updateCharacterCas(owner,snapshot,expected){
        if(window.__mockFailUpdates)throw new Error("offline");
        const r=cloud.find(x=>x.owner_user_id===owner&&x.client_character_id===snapshot.id&&x.revision===expected);
        if(!r)return null;
        r.snapshot=JSON.parse(JSON.stringify(snapshot));
        r.schema_version=+snapshot.v||0;
        r.revision++;
        r.updated_at=new Date().toISOString();
        return JSON.parse(JSON.stringify(r));
      },
      async deleteCharacter(owner,id){
        const i=cloud.findIndex(x=>x.owner_user_id===owner&&x.client_character_id===id);
        if(i>=0)cloud.splice(i,1);
        return [];
      }
    });
    window.__mockCloudRows=cloud;
    window.__mockFailUpdates=false;
    window.__mockRecover=()=>{
      if(!session)session={user:{id:"u-a",email:"a@example.test"}};
      notify("PASSWORD_RECOVERY");
    };
  },{rows:seedRows||[]});
  return ctx;
}
async function closeRuleset(page){
  if(await page.locator("#closeRuleset").isVisible())await page.locator("#closeRuleset").click();
}
(async()=>{
  let browser,tmp;
  try{
    browser=await chromium.launch({headless:true,channel:"chrome"});
    const errors=[];

    // Guest mode must remain independent of account configuration/provider.
    const guest=await browser.newContext({viewport:{width:390,height:844}});
    const gp=await guest.newPage();
    gp.on("pageerror",e=>errors.push("guest:"+String(e)));
    await gp.goto(URL+"?account-guest=1",{waitUntil:"networkidle"});
    await closeRuleset(gp);
    await gp.evaluate(save=>{
      deserialize(save);
      S.id=newId();
      document.querySelector("#fName").value="Guest QA";
      go(7);renderFinal();saveCurrent(true);
    },fixture);
    assert(await gp.evaluate(()=>getRoster().length===1),"guest local save failed");
    await gp.locator("#btnRoster").click();
    assert.equal((await gp.locator("#accountSyncMount").innerText()).trim(),"","disabled provider must stay invisible to guests");
    assert.equal(await gp.locator('script[data-zizi-supabase="1"]').count(),0,"disabled provider loaded Supabase runtime");
    await guest.close();

    // Pinned vendored Supabase browser client must load locally when account mode is configured.
    const vendorCtx=await browser.newContext({viewport:{width:390,height:844}});
    await vendorCtx.addInitScript(()=>{
      window.ZIZI_ACCOUNT_CONFIG={
        enabled:true,
        supabaseUrl:"https://example.supabase.co",
        supabasePublishableKey:"sb_publishable_account_sync_qa",
        syncDebounceMs:40
      };
    });
    const vp=await vendorCtx.newPage();
    vp.on("pageerror",e=>errors.push("vendor:"+String(e)));
    await vp.goto(URL+"?account-vendor=1",{waitUntil:"networkidle"});
    await closeRuleset(vp);
    await vp.locator("#btnRoster").click();
    await vp.locator("#accountSignIn").waitFor({state:"visible"});
    assert.equal(await vp.evaluate(()=>typeof window.supabase?.createClient),"function","vendored Supabase client did not expose createClient");
    const vendorSrc=await vp.locator('script[data-zizi-supabase="1"]').getAttribute("src");
    assert(vendorSrc&&vendorSrc.includes("assets/vendor/supabase-2.119.0.js"),"account mode did not load pinned local Supabase runtime");
    await vendorCtx.close();

    // Account integration with deterministic in-browser provider.
    const ctx=await makeContext(browser,[],{width:1440,height:900});
    const page=await ctx.newPage();
    page.on("pageerror",e=>errors.push("account:"+String(e)));
    await page.goto(URL+"?account-sync=1",{waitUntil:"networkidle"});
    await closeRuleset(page);

    tmp=path.join(__dirname,".tmp-account-save.json");
    fs.writeFileSync(tmp,JSON.stringify(fixture));
    await page.locator("#btnRoster").click();
    await page.locator("#fileInput").setInputFiles(tmp);
    await sleep(120);
    const localId=await page.evaluate(()=>getRoster()[0]&&getRoster()[0].id);
    assert(localId,"import did not create a local character");

    await page.locator("#btnRoster").click();
    await page.locator("#accountEmail").fill("a@example.test");
    await page.locator("#accountForgot").click();
    await sleep(80);
    assert((await page.locator("#accountSyncMount").innerText()).includes("如果此 Email 有帳號"),"password reset request did not use non-enumerating message");
    assert.equal(await page.evaluate(()=>window.__mockResetEmail),"a@example.test","password reset email was not sent to requested address");

    await page.locator("#accountEmail").fill("a@example.test");
    await page.locator("#accountPassword").fill("abcdefgh");
    await page.locator("#accountUploadAfterSignup").uncheck();
    await page.locator("#accountSignUp").click();
    await sleep(80);
    assert((await page.locator("#accountSyncMount").innerText()).includes("Email 確認"),"signup without session did not explain email confirmation");

    await page.locator("#accountEmail").fill("a@example.test");
    await page.locator("#accountPassword").fill("abcdefgh");
    await page.locator("#accountSignIn").click();
    await sleep(140);
    assert((await page.locator("#accountSyncMount").innerText()).includes("a@example.test"),"sign-in state missing");

    await page.evaluate(()=>window.__mockRecover());
    await sleep(80);
    assert.equal(await page.locator("#accountNewPassword").count(),1,"password recovery event did not expose update UI");
    await page.locator("#accountNewPassword").fill("newpassword123");
    await page.locator("#accountUpdatePassword").click();
    await sleep(80);
    assert.equal(await page.evaluate(()=>window.__mockNewPassword),"newpassword123","password update was not sent to provider");

    page.once("dialog",d=>d.accept());
    await page.locator("#accountUploadLocal").click();
    await sleep(160);
    let uploaded=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__mockCloudRows)));
    assert.equal(uploaded.length,1,"explicit local upload failed");
    assert.equal(uploaded[0].owner_user_id,"u-a","wrong cloud owner");
    assert.equal(uploaded[0].client_character_id,localId,"client character id changed during upload");
    assert((await page.locator("#accountSyncMount").innerText()).includes("上傳完成"),"upload result was erased before the user could see it");

    await page.locator("#closeRoster").click();
    await page.evaluate(()=>{go(7);renderFinal();});
    await page.locator("#hpAmt").fill("2");
    await page.locator('[data-hp="dmg"]').click();
    await sleep(1450);
    let synced=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__mockCloudRows[0])));
    assert(synced.revision>=2,"linked autosave did not advance revision");

    const remoteHpBeforeOffline=synced.snapshot.play.hp;
    await page.evaluate(()=>{window.__mockFailUpdates=true;});
    await page.locator("#hpAmt").fill("1");
    await page.locator('[data-hp="dmg"]').click();
    await sleep(1450);
    const localHpAfterOffline=await page.evaluate(id=>JSON.parse(localStorage.getItem(SK.char(id))).play.hp,localId);
    assert.equal(localHpAfterOffline,remoteHpBeforeOffline-1,"cloud failure prevented local save");
    assert.equal(await page.evaluate(()=>window.__mockCloudRows[0].snapshot.play.hp),remoteHpBeforeOffline,"failed cloud update unexpectedly changed remote data");
    await page.locator("#btnRoster").click();
    assert((await page.locator("#accountSyncMount").innerText()).includes("本機已儲存，但雲端同步失敗"),"cloud failure was not surfaced as local-safe");
    await page.locator("#closeRoster").click();
    await page.evaluate(()=>{
      window.__mockFailUpdates=false;
      window.__mockCloudRows[0].revision+=1;
      window.__mockCloudRows[0].snapshot.meta.name="REMOTE NEWER";
    });
    await page.locator("#hpAmt").fill("1");
    await page.locator('[data-hp="dmg"]').click();
    await sleep(1450);
    await page.locator("#btnRoster").click();
    assert((await page.locator("#accountSyncMount").innerText()).includes("停止自動覆蓋"),"CAS conflict was not surfaced");
    assert.equal(await page.evaluate(()=>window.__mockCloudRows[0].snapshot.meta.name),"REMOTE NEWER","CAS conflict overwrote remote data");

    const seed=await page.evaluate(()=>JSON.parse(JSON.stringify(window.__mockCloudRows)));
    await page.locator("#accountSignOut").click();
    await sleep(80);
    assert((await page.locator("#accountSyncMount").innerText()).includes("訪客模式"),"sign-out failed");
    await ctx.close();

    const ctx2=await makeContext(browser,seed,{width:390,height:844});
    const p2=await ctx2.newPage();
    p2.on("pageerror",e=>errors.push("clean:"+String(e)));
    await p2.goto(URL+"?account-clean-device=1",{waitUntil:"networkidle"});
    await closeRuleset(p2);
    await p2.locator("#btnRoster").click();
    await p2.locator("#accountEmail").fill("a@example.test");
    await p2.locator("#accountPassword").fill("abcdefgh");
    await p2.locator("#accountSignIn").click();
    await sleep(140);
    assert.equal(await p2.locator("[data-cloud-download]").count(),1,"clean device did not list cloud character");
    await p2.evaluate(({id,save})=>{
      const local=JSON.parse(JSON.stringify(save));
      local.id=id;local.meta=Object.assign({},local.meta,{name:"LOCAL DIFFERENT"});local.ts=Date.now();
      localStorage.setItem(SK.char(id),JSON.stringify(local));setRoster([rosterEntry(local)]);renderRoster();
    },{id:seed[0].client_character_id,save:fixture});
    p2.once("dialog",d=>d.accept());
    await p2.locator("[data-cloud-download]").click();
    await sleep(100);
    assert.equal(await p2.evaluate(()=>getRoster().length),2,"conflicting cloud download did not preserve a local backup");
    assert(await p2.evaluate(()=>getRoster().some(x=>x.name.includes("雲端下載前備份"))),"backup copy is not visible in local roster");
    const overflow=await p2.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    assert(overflow<=1,"account UI has mobile horizontal overflow");
    await ctx2.close();

    const ctx3=await makeContext(browser,seed,{width:390,height:844});
    const p3=await ctx3.newPage();
    p3.on("pageerror",e=>errors.push("tenant:"+String(e)));
    await p3.goto(URL+"?account-tenant=1",{waitUntil:"networkidle"});
    await closeRuleset(p3);
    await p3.locator("#btnRoster").click();
    await p3.locator("#accountEmail").fill("b@example.test");
    await p3.locator("#accountPassword").fill("abcdefgh");
    await p3.locator("#accountSignIn").click();
    await sleep(120);
    assert.equal(await p3.locator("[data-cloud-download]").count(),0,"mock tenant adapter exposed another user's row");
    await ctx3.close();

    assert.equal(errors.length,0,"page errors: "+errors.join(" | "));
    console.log(JSON.stringify({
      guestLocal:true,
      signupConfirmation:true,
      passwordRecovery:true,
      explicitUpload:true,
      conflictBackup:true,
      offlineLocalSave:true,
      casConflict:true,
      vendoredClient:true,
      cleanDeviceDownload:true,
      tenantAdapter:true,
      mobileOverflow:overflow,
      failureCount:0
    },null,2));
  }finally{
    if(tmp)fs.rmSync(tmp,{force:true});
    if(browser)await browser.close();
  }
})().catch(e=>{console.error(e);process.exit(1);});
