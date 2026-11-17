// Public username/password bridge. Never deploy before the opt-in SQL migration,
// owned alias domain, Turnstile configuration, and hosted Supabase Auth UAT pass.
// This endpoint is intentionally unauthenticated at Supabase's gateway; it
// authenticates/limits every request itself. See supabase/config.toml.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import {
  normalizeUsername, validUsername, validPassword, validateAliasDomain,
  makeRecoveryCode, validRecoveryCode, createInternalAlias, hmacHex
} from "../_shared/username-auth.mjs";

const maxBody = 4096;
const genericAuthError = "帳號、密碼或復原碼無效。";
const reply = (status, body, origin = "", extra = {}) => Response.json(body, {
  status,
  headers: {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    ...extra
  }
});

function getConfig() {
  const env = Deno.env;
  const config = {
    url: env.get("SUPABASE_URL") || "",
    serviceKey: env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    publicKey: env.get("SUPABASE_ANON_KEY") || "",
    turnstileKey: env.get("TURNSTILE_SECRET_KEY") || "",
    recoveryPepper: env.get("RECOVERY_PEPPER") || "",
    limitPepper: env.get("RATE_LIMIT_PEPPER") || "",
    aliasDomain: env.get("AUTH_ALIAS_DOMAIN") || "",
    aliasApproved: env.get("AUTH_ALIAS_DOMAIN_APPROVED") === "true",
    origin: env.get("DND_PUBLIC_ORIGIN") || "https://linheng1230.github.io",
    localOrigin: env.get("DND_DEV_ORIGIN") || ""
  };
  // No fallback credentials or test-domain aliases, even in a development env.
  if (!config.url.startsWith("https://") || !config.serviceKey || !config.publicKey ||
    !config.turnstileKey || config.recoveryPepper.length < 32 ||
    config.limitPepper.length < 32 || !validateAliasDomain(config.aliasDomain) || !config.aliasApproved ||
    !config.origin.startsWith("https://")) {
    return null;
  }
  return config;
}
function allowOrigin(origin, cfg) {
  if (!origin || !cfg) return false;
  return origin === cfg.origin || (cfg.localOrigin && origin === cfg.localOrigin);
}
async function smallJson(req) {
  const n = Number(req.headers.get("content-length"));
  if (Number.isFinite(n) && n > maxBody) throw Error("oversized");
  const mime = req.headers.get("content-type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(mime)) throw Error("not json");
  const reader = req.body?.getReader();
  if (!reader) throw Error("empty");
  let total = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBody) {
      await reader.cancel();
      throw Error("oversized");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

async function verifyTurnstile(token, cfg, origin) {
  if (typeof token !== "string" || token.length < 20 || token.length > 2048) return false;
  const form = new URLSearchParams({ secret: cfg.turnstileKey, response: token });
  let data;
  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(5000)
    });
    if (!result.ok) return false;
    data = await result.json();
  } catch { return false; }
  if (data?.success !== true) return false;
  try { return data.hostname === new URL(origin).hostname; }
  catch { return false; }
}

const adminClient = (cfg) => createClient(cfg.url, cfg.serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
const passwordClient = (cfg) => createClient(cfg.url, cfg.publicKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});
async function rpc(admin, name, args) {
  const { data, error } = await admin.rpc(name, args);
  if (error) throw new Error("Required service RPC failed");
  return data;
}
async function limit(admin, cfg, action, user, req) {
  // The IP header is a defense-in-depth signal, not a trusted identity.
  // Per-username limiting is applied independently to resist header spoofing.
  const ip = String(req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown").slice(0, 128);
  for (const [scope, key, max, seconds] of [
    ["global", "all", 1000, 900],
    ["ip", ip, 30, 900],
    ["name", user, action === "login" ? 12 : 6, 900]
  ]) {
    const digest = await hmacHex(cfg.limitPepper, "dnd5r:rate:v1", action + ":" + scope + ":" + key);
    const accepted = await rpc(admin, "cloud_take_auth_rate_limit", {
      p_bucket: digest, p_max_attempts: max, p_window_seconds: seconds
    });
    if (accepted !== true) return false;
  }
  return true;
}
async function issueSession(auth, email, password) {
  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data?.session?.access_token || !data?.session?.refresh_token) return null;
  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "";
  const cfg = getConfig();
  if (!allowOrigin(origin, cfg)) return reply(403, { error: "FORBIDDEN" });
  const headers = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Max-Age": "600"
  };
  if (req.method === "OPTIONS") return new Response(null, {
    status: 204, headers: { ...headers, "Access-Control-Allow-Origin": origin, "Vary": "Origin" }
  });
  if (req.method !== "POST") return reply(405, { error: "METHOD_NOT_ALLOWED" }, origin);
  // Avoid caching credentials or leaking details in logs / exceptions.
  let input;
  try { input = await smallJson(req); }
  catch { return reply(400, { error: "INVALID_REQUEST" }, origin); }
  const action = input?.action;
  const username = normalizeUsername(input?.username);
  if (!["register","login","recover"].includes(action) || !validUsername(username)) {
    return reply(400, { error: "INVALID_REQUEST" }, origin);
  }
  if (!await verifyTurnstile(input.turnstileToken, cfg, origin)) {
    return reply(403, { error: "CHALLENGE_REQUIRED" }, origin);
  }
  const admin = adminClient(cfg);
  try {
    if (!await limit(admin, cfg, action, username, req)) {
      return reply(429, { error: "RATE_LIMITED" }, origin, { "Retry-After": "900" });
    }

    if (action === "register") {
      if (!validPassword(input.password)) return reply(400, { error: "PASSWORD_POLICY" }, origin);
      const email = createInternalAlias(cfg.aliasDomain);
      const code = makeRecoveryCode();
      const digest = await hmacHex(cfg.recoveryPepper, "dnd5r:recovery:v1", code);
      const nonce = crypto.randomUUID();
      const reserved = await rpc(admin, "cloud_reserve_username", {
        p_username: username, p_internal_email: email, p_recovery_digest: digest, p_nonce: nonce
      });
      if (reserved !== true) return reply(409, { error: "USERNAME_UNAVAILABLE" }, origin);
      let userId;
      try {
        const created = await admin.auth.admin.createUser({
          email, password: input.password, email_confirm: true
        });
        if (created.error) {
          // A definite API failure: safely release only the pending reservation.
          await rpc(admin, "cloud_cancel_reservation", { p_username: username, p_nonce: nonce });
          return reply(503, { error: "REGISTER_UNAVAILABLE" }, origin);
        }
        userId = created.data?.user?.id;
        if (!userId) return reply(503, { error: "REGISTER_UNAVAILABLE" }, origin);
      } catch {
        // Uncertain create state; DO NOT delete pending reservation or Auth user.
        return reply(503, { error: "REGISTER_UNAVAILABLE" }, origin);
      }
      const finalized = await rpc(admin, "cloud_finalize_username", {
        p_username: username, p_nonce: nonce, p_user_id: userId
      });
      if (finalized !== true) return reply(503, { error: "REGISTER_UNAVAILABLE" }, origin);
      const tokens = await issueSession(passwordClient(cfg), email, input.password);
      // Even if issuing tokens fails, account was created; show recovery code once.
      return reply(201, { ...tokens, recovery_code: code, account_created: true }, origin);
    }

    if (action === "login") {
      if (typeof input.password !== "string" || input.password.length > 128) {
        return reply(401, { error: "INVALID_CREDENTIALS", message: genericAuthError }, origin);
      }
      const { data, error } = await admin.from("cloud_login_accounts")
        .select("internal_email").eq("username", username).eq("status", "active").maybeSingle();
      if (error || !data?.internal_email) return reply(401, { error: "INVALID_CREDENTIALS", message: genericAuthError }, origin);
      const tokens = await issueSession(passwordClient(cfg), data.internal_email, input.password);
      if (!tokens) return reply(401, { error: "INVALID_CREDENTIALS", message: genericAuthError }, origin);
      return reply(200, tokens, origin);
    }

    if (!validRecoveryCode(input.recoveryCode) || !validPassword(input.newPassword)) {
      return reply(401, { error: "INVALID_CREDENTIALS", message: genericAuthError }, origin);
    }
    const oldDigest = await hmacHex(cfg.recoveryPepper, "dnd5r:recovery:v1", input.recoveryCode);
    const nextCode = makeRecoveryCode();
    const nextDigest = await hmacHex(cfg.recoveryPepper, "dnd5r:recovery:v1", nextCode);
    const nonce = crypto.randomUUID();
    const claim = await rpc(admin, "cloud_claim_recovery", {
      p_username: username, p_old_digest: oldDigest, p_nonce: nonce, p_new_digest: nextDigest
    });
    const id = Array.isArray(claim) ? claim[0]?.claimed_user_id : null;
    if (!id) return reply(401, { error: "INVALID_CREDENTIALS", message: genericAuthError }, origin);
    let changed;
    try {
      changed = await admin.auth.admin.updateUserById(id, { password: input.newPassword });
    } catch {
      // Ambiguous password update: keep claim locked until operator reconciles.
      return reply(503, { error: "RECOVERY_UNAVAILABLE" }, origin);
    }
    if (changed.error) {
      await rpc(admin, "cloud_abort_recovery", { p_username: username, p_nonce: nonce });
      return reply(503, { error: "RECOVERY_UNAVAILABLE" }, origin);
    }
    const completed = await rpc(admin, "cloud_complete_recovery", {
      p_username: username, p_nonce: nonce
    });
    if (completed !== true) return reply(503, { error: "RECOVERY_UNAVAILABLE" }, origin);
    return reply(200, { recovery_code: nextCode, password_updated: true }, origin);
  } catch {
    // Never pass backend exceptions, SQL identifiers, internal alias, or secrets to clients.
    return reply(503, { error: "SERVICE_UNAVAILABLE" }, origin);
  }
});
