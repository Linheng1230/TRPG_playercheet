import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../cloud/schema.sql", import.meta.url), "utf8");
const readme = await readFile(new URL("../cloud/README.md", import.meta.url), "utf8");

function nativeGuard(source) {
  const start = source.indexOf("create or replace function private.assert_native_payload(");
  const end = source.indexOf("create or replace function private.snapshot_fingerprint(", start);
  assert.ok(start >= 0 && end > start, "native payload guard is missing");
  return source.slice(start, end);
}

function assertRequiredServerGuards(source) {
  const guard = nativeGuard(source);
  for (const field of ["base", "rolled", "skills", "asi", "level", "ts", "meta", "play", "slotsUsed"]) {
    assert.match(guard, new RegExp("p_payload->'" + field + "'"), "server RPC must validate " + field);
  }
  for (const field of ["rolled", "skills"]) {
    assert.match(guard, new RegExp("jsonb_typeof\\(p_payload->'" + field + "'\\)[^\\n]*<> 'array'"));
  }
  for (const field of ["base", "asi", "meta", "play", "slotsUsed"]) {
    assert.match(guard, new RegExp("jsonb_typeof\\(p_payload->'" + field + "'\\)[^\\n]*<> 'object'"));
  }
  for (const field of ["level", "ts"]) {
    assert.match(guard, new RegExp("jsonb_typeof\\(p_payload->'" + field + "'\\)[^\\n]*<> 'number'"));
  }
  assert.match(guard, /p_payload->>'level'.*!~ '\^\(\?:\[1-9\]\|1\[0-9\]\|20\)\$'/);
  assert.match(guard, /p_payload->'base'[\s\S]*\?&\s*array\['str','dex','con','int','wis','cha'\]/);
}

test("RPC rejects missing native save fields even when browser validation is bypassed (static)", () => {
  assertRequiredServerGuards(sql);
});

test("guard coverage detects a regression removing the server-side skills check", () => {
  const modified = sql.replace(
    "or coalesce(jsonb_typeof(p_payload->'skills'), '') <> 'array'",
    "or false -- intentionally weakened",
  );
  assert.notEqual(modified, sql);
  assert.throws(() => assertRequiredServerGuards(modified), /skills/);
});

test("security doc references actual GitHub Actions evidence, not outdated no-workflow claim", () => {
  assert.match(readme, /43847831945/);
  assert.doesNotMatch(readme, /workflow\s*尚未提交/);
});

test("hosted username auth and RLS remain blocked despite local QA", () => {
  assert.match(readme, /G1 BLOCKED/);
  assert.match(readme, /RLS/i);
  assert.match(readme, /NOT DEPLOYED/i);
  assert.match(readme, /AUTH_ALIAS_DOMAIN/);
  assert.match(readme, /不刪除|不修改|絕不刪除/);
  assert.doesNotMatch(readme, /已完成.*正式.*登入.*PASS/);
});
