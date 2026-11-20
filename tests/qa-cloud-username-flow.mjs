import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { randomUUID, createHash, webcrypto } from "node:crypto";
import * as helpers from "../supabase/functions/_shared/username-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const edgeSource = await readFile(path.join(root, "supabase/functions/username-auth/index.ts"), "utf8");
const body = edgeSource
  .replace(/import \{ createClient \} from "npm:@supabase\/supabase-js@[^"]+";\s*/,"")
  .replace(/import \{[\s\S]*?\} from "\.\.\/_shared\/username-auth.mjs";\s*/,"");

function harness(overrides = {}) {
  const config = {
    SUPABASE_URL:"https://unit-project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY:"service-test-only",
    SUPABASE_ANON_KEY:"public-test-only",
    TURNSTILE_SECRET_KEY:"test-only-captcha-key",
    RECOVERY_PEPPER:"recovery-test-only-" + "x".repeat(48),
    RATE_LIMIT_PEPPER:"ratelimit-test-only-" + "y".repeat(48),
    AUTH_ALIAS_DOMAIN:"auth.characteraccounts.tw",
    AUTH_ALIAS_DOMAIN_APPROVED:"true",
    DND_PUBLIC_ORIGIN:"https://linheng1230.github.io",
    ...overrides
  };
  const accounts = new Map();
  const authUsers = new Map();
  const buckets = new Map();
  let accountCreates = 0;
  let captchaGood = true;
  let ambiguousCreate = false;
  let handler;
  const hash = value => createHash("sha256").update(value).digest("hex");
  function rpc(name, args) {
    if(name === "cloud_take_auth_rate_limit"){
      const now=Date.now();
      const b=buckets.get(args.p_bucket);
      const count=!b||b.expiry<now?1:b.count+1;
      buckets.set(args.p_bucket,{count,expiry:now+args.p_window_seconds*1000});
      return count<=args.p_max_attempts;
    }
    if(name === "cloud_reserve_username"){
      if(accounts.has(args.p_username))return false;
      accounts.set(args.p_username,{name:args.p_username,email:args.p_internal_email,digest:args.p_recovery_digest,nonce:args.p_nonce,status:"pending",uid:null,recover:null});
      return true;
    }
    if(name === "cloud_finalize_username"){
      const r=accounts.get(args.p_username);
      if(!r||r.nonce!==args.p_nonce||r.status!=="pending")return false;
      r.uid=args.p_user_id;r.status="active";return true;
    }
    if(name === "cloud_claim_recovery"){
      const r=accounts.get(args.p_username);
      if(!r||r.status!=="active"||r.digest!==args.p_old_digest||r.recover)return [];
      r.recover={nonce:args.p_nonce,next:args.p_new_digest};
      return [{claimed_user_id:r.uid}];
    }
    if(name === "cloud_complete_recovery"){
      const r=accounts.get(args.p_username);
      if(!r||r.recover?.nonce!==args.p_nonce)return false;
      r.digest=r.recover.next;r.recover=null;return true;
    }
    if(name === "cloud_abort_recovery"){
      const r=accounts.get(args.p_username);
      if(!r||r.recover?.nonce!==args.p_nonce)return false;
      r.recover=null;return true;
    }
    throw Error("Unexpected RPC "+name);
  }
  const service = {
    rpc: async(name,args)=>({data:rpc(name,args),error:null}),
    from(table){
      assert.equal(table,"cloud_login_accounts");
      let name=null,status=null;
      return {
        select(){
          return {
            eq(column,value){
              if(column==="username")name=value;
              else if(column==="status")status=value;
              return this;
            },
            async maybeSingle(){
              const r=accounts.get(name);
              return {data:r?.status===status?{internal_email:r.email}:null,error:null};
            }
          };
        }
      };
    },
    auth:{admin:{
      async createUser({email,password,email_confirm}){
        assert.equal(email_confirm,true);
        assert.equal(typeof password,"string");
        if([...authUsers.values()].some(u=>u.email===email)) return {error:Error("collision")};
        const id=randomUUID();
        authUsers.set(id,{id,email,pwd:hash(password)});
        accountCreates++;
        if(ambiguousCreate)return {data:null,error:Error("write completed but response failed")};
        return {data:{user:{id}},error:null};
      },
      async updateUserById(uid,{password}){
        const user=authUsers.get(uid);
        if(!user)return {error:Error("not found")};
        user.pwd=hash(password);
        return {data:{user:{id:uid}},error:null};
      }
    }}
  };
  const publicClient={
    auth:{
      async signInWithPassword({email,password}){
        const user=[...authUsers.values()].find(u=>u.email===email && u.pwd===hash(password));
        return user?{data:{session:{access_token:"access-"+user.id,refresh_token:"refresh-"+user.id}},error:null}:{data:null,error:Error("invalid")};
      }
    }
  };
  const makeClient=(url,key)=>key===config.SUPABASE_SERVICE_ROLE_KEY?service:publicClient;
  const fakeFetch=async url => {
    assert.equal(url,"https://challenges.cloudflare.com/turnstile/v0/siteverify");
    return {ok:true,json:async()=>({success:captchaGood,hostname:"linheng1230.github.io"})};
  };
  const Deno={env:{get:k=>config[k]},serve:fn=>{handler=fn;}};
  const factory=new Function("createClient","normalizeUsername","validUsername","validPassword","validateAliasDomain","makeRecoveryCode","validRecoveryCode","createInternalAlias","hmacHex","Deno","fetch","crypto","Response","Request","AbortSignal","TextDecoder",body);
  factory(makeClient,...["normalizeUsername","validUsername","validPassword","validateAliasDomain","makeRecoveryCode","validRecoveryCode","createInternalAlias","hmacHex"].map(name=>helpers[name]),Deno,fakeFetch,webcrypto,Response,Request,AbortSignal,TextDecoder);
  function request(action,params={},origin="https://linheng1230.github.io"){
    const headers={"Content-Type":"application/json","Origin":origin};
    return handler(new Request("https://unit-project.supabase.co/functions/v1/username-auth",{
      method:"POST",headers,body:JSON.stringify({action,username:"adventurer",turnstileToken:"valid-turnstile-test-token-123",...params})
    }));
  }
  return {request,handler,accounts,authUsers,buckets,config,
    get accountCreates(){return accountCreates;},
    setCaptchaGood(v){captchaGood=v;},
    setAmbiguousCreate(v){ambiguousCreate=v;}};
}

test("register emits real Supabase session and one-time recovery code, without exposing alias",async()=>{
 const h=harness();
 const response=await h.request("register",{username:"  Adventurer ",password:"longpassphrase#1"});
 assert.equal(response.status,201);
 const result=await response.json();
 assert.equal(result.account_created,true);
 assert.match(result.recovery_code,/^R1-[A-Za-z0-9_-]{43}$/);
 assert.match(result.access_token,/^access-/);
 assert.equal(JSON.stringify(result).includes("@"),false);
 const record=h.accounts.get("adventurer");
 assert.equal(record.status,"active");
 assert.equal(record.userId,undefined);
 assert.equal(h.accountCreates,1);
 const duplicate=await h.request("register",{username:"ADVENTURER",password:"different-longpass123"});
 assert.equal(duplicate.status,409);
 assert.equal(h.accountCreates,1);
});

test("ambiguous Supabase Auth failure retains pending username and blocks takeover",async()=>{
 const h=harness();
 h.setAmbiguousCreate(true);
 const response=await h.request("register",{username:"alice3",password:"correct-horse-battery"});
 assert.equal(response.status,503);
 assert.equal(h.accounts.get("alice3")?.status,"pending");
 assert.equal(h.authUsers.size,1,"mock Auth user was created before its error response");
 h.setAmbiguousCreate(false);
 const retry=await h.request("register",{username:"alice3",password:"attacker-password123"});
 assert.equal(retry.status,409,"another user must not claim an ambiguous registration");
 assert.equal(h.authUsers.size,1);
});

test("two usernames issue distinct Auth UIDs, bad passwords do not authenticate",async()=>{
 const h=harness();
 const a=await (await h.request("register",{username:"alice3",password:"correct-horse-battery"})).json();
 const b=await (await h.request("register",{username:"bob777",password:"correct-horse-staple"})).json();
 assert.notEqual(a.access_token,b.access_token);
 const success=await h.request("login",{username:"ALICE3",password:"correct-horse-battery"});
 assert.equal(success.status,200);
 assert.equal((await success.json()).access_token,a.access_token);
 const wrong=await h.request("login",{username:"alice3",password:"incorrect-password"});
 const absent=await h.request("login",{username:"unknown123",password:"incorrect-password"});
 assert.equal(wrong.status,401);assert.equal(absent.status,401);
 assert.deepEqual(await wrong.json(),await absent.json());
});

test("password recovery consumes old code exactly once and preserves Supabase Auth UID",async()=>{
 const h=harness();
 const a=await (await h.request("register",{username:"alice3",password:"correct-horse-battery"})).json();
 const uid=h.accounts.get("alice3").uid;
 const reset=await h.request("recover",{username:"alice3",recoveryCode:a.recovery_code,newPassword:"replacement-passphrase"});
 assert.equal(reset.status,200);
 const newCode=(await reset.json()).recovery_code;
 assert.notEqual(newCode,a.recovery_code);
 assert.equal(h.accounts.get("alice3").uid,uid);
 const old=await h.request("recover",{username:"alice3",recoveryCode:a.recovery_code,newPassword:"changed-again-password"});
 assert.equal(old.status,401);
 const oldPassword=await h.request("login",{username:"alice3",password:"correct-horse-battery"});
 assert.equal(oldPassword.status,401);
 const newer=await h.request("login",{username:"alice3",password:"replacement-passphrase"});
 assert.equal(newer.status,200);
 const second=await h.request("recover",{username:"alice3",recoveryCode:newCode,newPassword:"third-new-passphrase"});
 assert.equal(second.status,200);
});

test("concurrent attempts cannot consume the same recovery code twice",async()=>{
 const h=harness();
 const registered=await (await h.request("register",{username:"alice3",password:"correct-horse-battery"})).json();
 const params={username:"alice3",recoveryCode:registered.recovery_code,newPassword:"replacement-passphrase"};
 const results=await Promise.all([h.request("recover",params),h.request("recover",params)]);
 assert.deepEqual(results.map(x=>x.status).sort(),[200,401]);
});

test("Turnstile failure is fail-closed and cannot reserve a username",async()=>{
 const h=harness();h.setCaptchaGood(false);
 const r=await h.request("register",{username:"alice3",password:"correct-horse-battery"});
 assert.equal(r.status,403);
 assert.equal(h.accounts.size,0);
});

test("missing owner-controlled alias domain disables all account endpoints",async()=>{
 const h=harness({AUTH_ALIAS_DOMAIN:"example.invalid"});
 const res=await h.request("register",{username:"alice3",password:"correct-horse-battery"});
 assert.equal(res.status,403);
 assert.equal(h.accountCreates,0);
});

test("owned alias domain requires an explicit verified rollout approval",async()=>{
 const h=harness({AUTH_ALIAS_DOMAIN_APPROVED:""});
 const res=await h.request("register",{username:"alice3",password:"correct-horse-battery"});
 assert.equal(res.status,403);
 assert.equal(h.accountCreates,0);
});

test("cross-origin requests are denied before sensitive processing",async()=>{
 const h=harness();
 const res=await h.request("register",{username:"alice3",password:"correct-horse-battery"},"https://evil.invalid");
 assert.equal(res.status,403);
 assert.equal(h.accounts.size,0);
});

test("oversized request bodies are rejected",async()=>{
 const h=harness();
 const res=await h.request("login",{username:"alice3",password:"x".repeat(5000)});
 assert.equal(res.status,400);
});

test("brute-force login attempts are subject to server-side database rate limiting",async()=>{
 const h=harness();
 await h.request("register",{username:"alice3",password:"correct-horse-battery"});
 let status;
 for(let i=0;i<13;i++){
   status=(await h.request("login",{username:"alice3",password:"incorrect-password"})).status;
 }
 assert.equal(status,429);
});
