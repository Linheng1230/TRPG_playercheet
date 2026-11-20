// Real Convex Local Deployment smoke: synthetic account, no real user data/credentials.
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
const client = new ConvexHttpClient("http://127.0.0.1:3210");
const suffix=randomBytes(7).toString("hex");
const credentials={username:"dndqa_"+suffix,password:"Local-QA!-"+randomBytes(18).toString("base64url")};
try{
 const response=await client.mutation(api.auth.signUpWithUsernamePassword,credentials);
 console.log("SIGNUP_STATUS="+String(response?.status));
 console.log("TOKEN_PROPERTIES="+Object.keys(response?.tokens??{}).join(","));
 if(response?.status!=="complete" || !response?.tokens?.accessToken)throw Error("signup did not issue access token; code="+String(response?.userError?.error??"unknown"));
 client.setAuth(response.tokens.accessToken);
 const mine=await client.query(api.characters.listMine,{});
 console.log("AUTHENTICATED_READ="+Array.isArray(mine));
 if(!Array.isArray(mine)) throw Error("owner list invalid");
 console.log("AUTH_LOCAL_SMOKE=PASS");
}catch(e){console.error("AUTH_LOCAL_SMOKE=FAIL "+(e?.message??String(e)));process.exitCode=1}
