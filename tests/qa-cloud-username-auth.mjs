import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  normalizeUsername, validUsername, validPassword,
  validateAliasDomain, createInternalAlias, makeRecoveryCode,
  validRecoveryCode, hmacHex
} from "../supabase/functions/_shared/username-auth.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = name => readFile(path.join(root, name), "utf8");

test("username normalization and uniqueness key are case insensitive", () => {
  assert.equal(normalizeUsername("  Knight_ABC "), "knight_abc");
  assert.equal(validUsername("Knight_ABC"), true);
  for (const bad of ["ab", "2abc", "admin", "ROOT", "a-b", "player@email.com", "中文玩家", "a".repeat(25)]) {
    assert.equal(validUsername(bad), false, bad);
  }
});

test("password policy is enforced before Supabase Auth receives a password", () => {
  assert.equal(validPassword("correct-horse-battery"), true);
  for (const value of ["short", "12345678901", null, 123, "x".repeat(129)]) {
    assert.equal(validPassword(value), false);
  }
  assert.equal(validPassword("x".repeat(12)), true);
  assert.equal(validPassword("x".repeat(128)), true);
});

test("internal alias must use an operator-controlled real domain, never public test domains", () => {
  for (const domain of ["", ".invalid", "example.com.invalid", "foo.test", "localhost", "supabase.co", "github.io", "foo.github.io", "auth.accounts.example.net", "example.com", "gmail.com", ""]){
    assert.equal(validateAliasDomain(domain), false, domain);
  }
  assert.equal(validateAliasDomain("auth.characteraccounts.tw"), true);
  assert.throws(() => createInternalAlias(".invalid"), /operator-owned/);
  const alias1 = createInternalAlias("auth.characteraccounts.tw");
  const alias2 = createInternalAlias("auth.characteraccounts.tw");
  assert.match(alias1, /^player-[0-9a-f]{48}@auth\.characteraccounts\.tw$/);
  assert.notEqual(alias1, alias2);
});

test("one-time recovery codes are 256-bit random and HMAC digests are domain separated", async () => {
  const codes = new Set(Array.from({length: 128}, () => makeRecoveryCode()));
  assert.equal(codes.size, 128);
  const code = [...codes][0];
  assert.equal(code.length, 46);
  assert.equal(validRecoveryCode(code), true);
  assert.equal(validRecoveryCode(code + "a"), false);
  assert.equal(validRecoveryCode("123456"), false);
  const key = "secret-only-on-edge-" + "a".repeat(40);
  const digest = await hmacHex(key, "dnd5r:recovery:v1", code);
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.equal(await hmacHex(key, "dnd5r:recovery:v1", code), digest);
  assert.notEqual(await hmacHex(key, "dnd5r:rate:v1", code), digest);
  assert.notEqual(await hmacHex(key, "dnd5r:recovery:v1", makeRecoveryCode()), digest);
  await assert.rejects(hmacHex("short-key", "dnd5r:recovery:v1", code), /unconfigured/);
});

test("SQL enforces unique UID/username, no anonymous table access and service-only RPCs", async () => {
  const sql = await read("cloud/username-auth.sql");
  assert.match(sql, /username\s+text\s+primary\s+key/i);
  assert.match(sql, /user_id\s+uuid\s+unique\s+references\s+auth\.users/i);
  assert.match(sql, /internal_email\s+text\s+not\s+null\s+unique/i);
  assert.match(sql, /alter\s+table\s+public\.cloud_login_accounts\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /alter\s+table\s+public\.cloud_auth_rate_limits\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /revoke\s+all\s+on\s+table\s+public\.cloud_login_accounts\s+from\s+public,\s*anon,\s*authenticated/i);
  assert.doesNotMatch(sql, /grant\s+(?:select|insert|update|delete|all)\s+on\s+table\s+public\.cloud_login_accounts\s+to\s+authenticated/i);
  assert.match(sql, /grant\s+select,\s*insert,\s*update,\s*delete\s+on\s+table\s+public\.cloud_login_accounts\s+to\s+service_role/i);
  for (const name of ["cloud_take_auth_rate_limit","cloud_reserve_username","cloud_finalize_username","cloud_claim_recovery","cloud_complete_recovery","cloud_abort_recovery"]) {
    assert.match(sql, new RegExp("create\\s+or\\s+replace\\s+function\\s+public\\."+name, "i"));
    assert.match(sql, new RegExp("grant\\s+execute\\s+on\\s+function\\s+public\\."+name+"[\\s\\S]{0,190}to\\s+service_role", "i"));
  }
  assert.match(sql, /recovery_nonce\s+is\s+null/i);
  assert.match(sql, /update\s+public\.cloud_login_accounts\s+as\s+a\s+set\s+recovery_nonce/i);
  assert.doesNotMatch(sql, /create\s+or\s+replace\s+function\s+public\.update_character_cas/i);
  assert.doesNotMatch(sql, /delete\s+from\s+auth\.users/i);
});

test("Edge function fail closed on missing auth-domain, peppers and Turnstile", async () => {
  const edge = await read("supabase/functions/username-auth/index.ts");
  const config = await read("supabase/config.toml");
  assert.match(config, /\[functions\.username-auth\][\s\S]*verify_jwt\s*=\s*false/);
  assert.match(edge, /AUTH_ALIAS_DOMAIN/);
  assert.match(edge, /AUTH_ALIAS_DOMAIN_APPROVED/);
  assert.match(edge, /validateAliasDomain/);
  assert.match(edge, /TURNSTILE_SECRET_KEY/);
  assert.match(edge, /challenges\.cloudflare\.com\/turnstile\/v0\/siteverify/);
  assert.match(edge, /cloud_take_auth_rate_limit/);
  assert.match(edge, /\["global",\s*"all",\s*1000,\s*900\]/);
  assert.match(edge, /cloud_claim_recovery/);
  assert.match(edge, /cloud_complete_recovery/);
  assert.match(edge, /signInWithPassword/);
  assert.match(edge, /auth\.admin\.createUser/);
  assert.match(edge, /auth\.admin\.updateUserById/);
  assert.match(edge, /req\.method\s*!==\s*"POST"/);
  assert.match(edge, /content-length/);
  assert.match(edge, /no-store/);
  assert.match(edge, /"Retry-After": "900"/);
  assert.doesNotMatch(edge, /console\.(log|error)\s*\(/);
  assert.doesNotMatch(edge, /signInAnonymously/);
  assert.doesNotMatch(edge, /deleteUser|cloud_cancel_reservation/);
  assert.doesNotMatch(await read("cloud/username-auth.sql"), /cloud_cancel_reservation/);
});

test("browser has guest-first username auth, no alias/password persistence", async () => {
  const [app, page, config] = await Promise.all([
    read("cloud/app.mjs"),
    read("cloud/index.html"),
    read("cloud/public-config.example.js")
  ]);
  assert.match(page, /href="\.\.\/"[^>]*>直接使用訪客角色卡/);
  assert.match(page, /id="cloudControls" disabled/);
  for(const id of ["loginForm","registerForm","recoverForm","turnstileWidget","recoveryValue","ackRecoveryButton"]) {
    assert.match(page, new RegExp('id="'+id+'"'));
  }
  assert.match(page, /type="password"/);
  assert.match(page, /autocomplete="current-password"/);
  assert.match(app, /functions\.invoke\("username-auth"/);
  assert.match(app, /auth\.setSession/);
  assert.match(app, /auth\.getUser/);
  assert.match(app, /session\?\.user\?\.id/);
  assert.match(app, /cloudControls\.disabled\s*=\s*!authenticated/);
  assert.match(app, /recoveryValue\.textContent/);
  assert.doesNotMatch(app, /localStorage\.setItem|sessionStorage\.setItem|\.innerHTML\s*=/);
  assert.doesNotMatch(app, /signInWithOAuth|signInWithOtp|config\.authProvider|emailAddress|sendOtpButton/);
  assert.doesNotMatch(config, /service_role|SECRET_KEY|TURNSTILE_SECRET_KEY|authProvider|custom:line/);
  assert.match(config, /turnstileSiteKey/);
});

test("existing 2014/2024 character and DM SQL contracts stay unchanged", async () => {
  const [schema, bridge] = await Promise.all([read("cloud/schema.sql"),read("cloud/bridge.mjs")]);
  assert.match(schema, /auth\.uid\s*\(\s*\)/i);
  assert.match(schema, /update_character_cas/i);
  assert.match(schema, /list_linked_characters/i);
  assert.match(bridge, /2014/);
  assert.match(bridge, /2024/);
  assert.match(bridge, /prepareCharacterImport/);
});
