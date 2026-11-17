import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmailOtpFlow,
  normalizeOtpEmail,
  isValidOtpEmail,
  EMAIL_OTP_COOLDOWN_MS,
  EmailOtpError,
} from "../cloud/email-otp.mjs";

const validSession = () => ({ user: { id: "00000000-0000-4000-8000-000000000001" } });
function fixture() {
  let time = 100_000;
  const requests = [];
  const verifications = [];
  let sendError = null;
  let verifyError = null;
  const auth = {
    async signInWithOtp(args) { requests.push(args); return { error: sendError }; },
    async verifyOtp(args) { verifications.push(args); return { data: { session: validSession() }, error: verifyError }; },
  };
  const flow = createEmailOtpFlow(auth, { clock: () => time });
  return {
    flow, requests, verifications,
    advance(ms) { time += ms; },
    setSendError(error) { sendError = error; },
    setVerifyError(error) { verifyError = error; },
  };
}

test("Email is normalized and invalid formats fail before any backend request", async () => {
  const f = fixture();
  assert.equal(normalizeOtpEmail("  TEST@Example.COM "), "test@example.com");
  assert.equal(isValidOtpEmail("test@example.com"), true);
  for (const value of ["", "name", "a@b", "bad @example.com"]) {
    await assert.rejects(f.flow.requestCode(value), EmailOtpError);
  }
  assert.equal(f.requests.length, 0);
});

test("Sign-in sends an Email OTP with optional account creation, never OAuth", async () => {
  const f = fixture();
  const result = await f.flow.requestCode("  Adventurer@Example.com ");
  assert.deepEqual(result, { email: "adventurer@example.com", stale: false });
  assert.deepEqual(f.requests, [{ email: "adventurer@example.com", options: { shouldCreateUser: true } }]);
  assert.equal(f.flow.pendingEmail, "adventurer@example.com");
});

test("Verify requires a requested six-digit code and uses email type", async () => {
  const f = fixture();
  await assert.rejects(f.flow.verifyCode("123456"), /請先寄送/);
  await f.flow.requestCode("a@example.com");
  for (const code of ["12345", "1234567", "12345a", ""]) {
    await assert.rejects(f.flow.verifyCode(code), /六位數/);
  }
  assert.equal(f.verifications.length, 0);
  const result = await f.flow.verifyCode("123456");
  assert.deepEqual(result, { stale: false, session: validSession() });
  assert.deepEqual(f.verifications, [{ email: "a@example.com", token: "123456", type: "email" }]);
  assert.equal(f.flow.pendingEmail, "");
  assert.deepEqual(Object.keys(f.flow), ["requestCode", "verifyCode", "cancelPending", "remainingCooldownMs", "pendingEmail"]);
  assert.equal(JSON.stringify(f.flow).includes("123456"), false);
});

test("Cooling down the same email prevents repeated requests for 60 seconds", async () => {
  const f = fixture();
  await f.flow.requestCode("a@example.com");
  assert.equal(f.flow.remainingCooldownMs("a@example.com"), EMAIL_OTP_COOLDOWN_MS);
  await assert.rejects(f.flow.requestCode("a@example.com"), /60 秒/);
  f.advance(59_999);
  await assert.rejects(f.flow.requestCode("a@example.com"), /60 秒/);
  f.advance(1);
  await f.flow.requestCode("a@example.com");
  assert.equal(f.requests.length, 2);
});

test("Changing the email invalidates pending code and never verifies a different address", async () => {
  const f = fixture();
  await f.flow.requestCode("a@example.com");
  f.flow.cancelPending();
  assert.equal(f.flow.pendingEmail, "");
  await assert.rejects(f.flow.verifyCode("123456"), /請先寄送/);
  await f.flow.requestCode("b@example.com");
  await f.flow.verifyCode("123456");
  assert.deepEqual(f.verifications[0], { email: "b@example.com", token: "123456", type: "email" });
});

test("Failed backend sends and verification cannot unlock cloud or fake a session", async () => {
  const f = fixture();
  f.setSendError(new Error("SMTP failed"));
  await assert.rejects(f.flow.requestCode("a@example.com"), /SMTP failed/);
  assert.equal(f.flow.pendingEmail, "");
  f.setSendError(null);
  await f.flow.requestCode("a@example.com");
  f.setVerifyError(new Error("OTP expired"));
  await assert.rejects(f.flow.verifyCode("123456"), /OTP expired/);
  assert.equal(f.flow.pendingEmail, "a@example.com");
  assert.equal(f.flow.remainingCooldownMs("a@example.com") > 0, true);
});

test("Changing email while a send is in flight invalidates stale response", async () => {
  let resolveSend;
  const sends = [];
  const flow = createEmailOtpFlow({
    signInWithOtp(args) { sends.push(args); return new Promise((resolve) => { resolveSend = resolve; }); },
    async verifyOtp() { throw new Error("must not verify stale code"); },
  });
  const action = flow.requestCode("a@example.com");
  flow.cancelPending();
  resolveSend({ error: null });
  assert.deepEqual(await action, { stale: true });
  assert.equal(flow.pendingEmail, "");
  await assert.rejects(flow.verifyCode("123456"), /請先寄送/);
  assert.equal(sends.length, 1);
});

test("Second request during an in-flight send is rejected", async () => {
  let finish;
  const flow = createEmailOtpFlow({
    signInWithOtp() { return new Promise((resolve) => { finish = resolve; }); },
    async verifyOtp() { return { data: { session: validSession() }, error: null }; },
  });
  const p = flow.requestCode("a@example.com");
  await assert.rejects(flow.requestCode("b@example.com"), /請勿重複/);
  finish({ error: null });
  await p;
});

test("Back-end must provide an authenticated session before cloud access can proceed", async () => {
  const flow = createEmailOtpFlow({
    async signInWithOtp() { return { error: null }; },
    async verifyOtp() { return { data: { session: null }, error: null }; },
  });
  await flow.requestCode("a@example.com");
  await assert.rejects(flow.verifyCode("123456"), /未取得有效登入狀態/);
  assert.equal(flow.pendingEmail, "a@example.com");
});
