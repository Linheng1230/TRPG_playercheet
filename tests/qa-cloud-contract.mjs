import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => readFile(path.join(root, name), "utf8");

const [sql, app, page, configExample, readme] = await Promise.all([
  read("cloud/schema.sql"),
  read("cloud/app.mjs"),
  read("cloud/index.html"),
  read("cloud/public-config.example.js"),
  read("cloud/README.md"),
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function functionBlock(name) {
  const startPattern = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+(?:public\\.)?${escapeRegExp(name)}\\b`,
    "i",
  );
  const start = sql.search(startPattern);
  assert.notEqual(start, -1, `missing SQL function ${name}`);
  const next = sql.slice(start + 1).search(/create\s+or\s+replace\s+function\s+/i);
  return next === -1 ? sql.slice(start) : sql.slice(start, start + 1 + next);
}

test("cloud schema creates the four tenant tables with RLS enabled", () => {
  for (const table of [
    "characters",
    "campaigns",
    "campaign_memberships",
    "character_links",
  ]) {
    assert.match(sql, new RegExp(`create\\s+table\\s+public\\.${table}\\b`, "i"));
    assert.match(
      sql,
      new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      ),
    );
  }
  assert.match(sql, /owner_id\s+uuid\s+not\s+null/i);
  assert.match(sql, /revision\s+bigint\s+not\s+null/i);
  assert.match(sql, /local_character_id\s+text\s+not\s+null/i);
  assert.match(sql, /payload\s+jsonb\s+not\s+null/i);
});

test("authenticated mutations are fixed-search-path SECURITY DEFINER RPCs", () => {
  const names = [
    "create_character",
    "update_character_cas",
    "create_campaign",
    "join_campaign",
    "link_character",
    "revoke_character_link",
    "list_linked_characters",
  ];

  for (const name of names) {
    const block = functionBlock(name);
    assert.match(block, /security\s+definer/i, `${name} must be SECURITY DEFINER`);
    assert.match(block, /set\s+search_path\s*=\s*(?:''|pg_catalog)/i, `${name} needs a fixed search_path`);
    assert.match(block, /auth\.uid\s*\(\s*\)/i, `${name} must bind work to auth.uid()`);
    assert.match(
      sql,
      new RegExp(`grant\\s+execute\\s+on\\s+function[\\s\\S]{0,500}${escapeRegExp(name)}[\\s\\S]{0,500}to\\s+authenticated`, "i"),
      `${name} must be executable only through the authenticated API contract`,
    );
  }

  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)\s+on\s+(?:table\s+)?public\./i);
  assert.doesNotMatch(sql, /\bservice_role\b/i);
});

test("character writes use owner checks and compare-and-swap revisions", () => {
  const create = functionBlock("create_character");
  const update = functionBlock("update_character_cas");
  assert.match(create, /import_fingerprint/i);
  assert.match(create, /on\s+conflict/i);
  assert.match(update, /p_expected_revision/i);
  assert.match(update, /owner_id\s*=\s*(?:v_user_id|auth\.uid\s*\(\s*\))/i);
  assert.match(update, /revision\s*=\s*[^,;]*revision\s*\+\s*1/i);
  assert.match(update, /revision_conflict/i);
});

test("campaign invitations are high entropy, hashed, and not broadly selectable", () => {
  const campaignsStart = sql.search(/create\s+table\s+public\.campaigns\b/i);
  const membershipsStart = sql.search(/create\s+table\s+public\.campaign_memberships\b/i);
  assert.ok(campaignsStart >= 0 && membershipsStart > campaignsStart);
  const campaignsTable = sql.slice(campaignsStart, membershipsStart);

  assert.match(campaignsTable, /invite_hash\s+bytea\s+not\s+null/i);
  assert.doesNotMatch(campaignsTable, /invite_code\s+(?:text|varchar|character)/i);
  assert.match(sql, /gen_random_bytes\s*\(\s*32\s*\)/i);
  assert.match(functionBlock("join_campaign"), /digest\s*\(/i);
  assert.doesNotMatch(sql, /grant\s+select\s+on\s+(?:table\s+)?public\.campaigns\b/i);
  assert.doesNotMatch(sql, /returns[\s\S]{0,250}\binvite_hash\b/i);
});

test("RLS/read contracts express owner isolation and DM read-only linkage", () => {
  assert.match(sql, /create\s+policy[\s\S]{0,500}public\.characters[\s\S]{0,900}owner_id\s*=\s*auth\.uid\s*\(\s*\)/i);
  assert.match(sql, /campaign_memberships[\s\S]{0,1000}(?:is_campaign_dm|can_read|is_campaign_member)/i);
  assert.match(sql, /character_links[\s\S]{0,1000}(?:is_campaign_dm|can_read|is_campaign_member)/i);
  assert.match(functionBlock("list_linked_characters"), /role\s*=\s*'dm'|is_campaign_dm/i);
  assert.doesNotMatch(functionBlock("list_linked_characters"), /\bupdate\s+public\.characters\b/i);
});

test("guest-first username login is inert without Supabase and Turnstile configuration", () => {
  assert.match(app, /public-config\.js/);
  assert.match(app, /未設定|unconfigured/i);
  assert.match(app, /loginSubmitButton\.disabled\s*=\s*true/);
  assert.match(page, /href="\.\.\/"[^>]*>直接使用訪客角色卡/);
  assert.match(page, /id="cloudControls" disabled/);
  assert.doesNotMatch(app, /service[_-]?role/i);
  assert.doesNotMatch(configExample, /(?:serviceRole|service_role)\s*:/i);
  assert.doesNotMatch(configExample, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.doesNotMatch(configExample, /authProvider|custom:line/);
  assert.doesNotMatch(app, /signInWithOAuth\s*\(|signInWithOtp\s*\(/);
  assert.match(app, /functions\.invoke\("username-auth"/);
  assert.match(app, /auth\.getUser/);
  assert.match(page, /id="loginForm"/);
  assert.match(page, /id="registerForm"[^>]*hidden/);
  assert.match(page, /id="recoverForm"[^>]*hidden/);
  assert.match(page, /id="turnstileWidget"/);
});

test("preview requires explicit import consent and renders no data through innerHTML", () => {
  assert.match(app, /prepareCharacterImport/);
  assert.match(app, /commitCharacterImport/);
  assert.match(app, /consent/i);
  assert.match(page, /type="checkbox"[^>]*consent|consent[^>]*type="checkbox"/i);
  assert.doesNotMatch(app, /\.innerHTML\s*=/);
  assert.match(app, /\.textContent\s*=/);
});

test("README describes the no-email password bridge and real release gates", () => {
  for (const phrase of ["AUTH_ALIAS_DOMAIN", "Turnstile", "auth.uid()", "RLS",
    "2014", "2024", "rollback", "cloud_login_accounts", "NOT DEPLOYED"]) {
    assert.ok(readme.toLowerCase().includes(phrase.toLowerCase()), "README missing " + phrase);
  }
  assert.match(readme, /G1 BLOCKED/);
  assert.match(readme, /G2 BLOCKED/);
  assert.match(readme, /不自動合併/);
  assert.match(readme, /consent|明確/);
});