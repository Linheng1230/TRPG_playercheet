// Pure helpers shared by Deno Edge and Node tests; Supabase Auth hashes passwords.
const USERNAME = /^[a-z][a-z0-9_]{2,23}$/;
const RESERVED = new Set(["admin","administrator","root","system","supabase","support","moderator","owner","staff","help","null","undefined","anonymous","guest","api","auth","login","register","dm","developer"]);
export function normalizeUsername(value) { return String(value ?? "").trim().toLowerCase(); }
export function validUsername(value) {
  const name = normalizeUsername(value);
  return USERNAME.test(name) && !RESERVED.has(name);
}
export function validPassword(password) {
  return typeof password === "string" && password.length >= 12 && password.length <= 128;
}
export function validateAliasDomain(domain) {
  if (typeof domain !== "string") return false;
  const host = domain.trim().toLowerCase();
  if (host.length > 240 || !/^(?=.{4,240}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return false;
  const forbidden = ["invalid", "test", "example", "localhost", "local", "example.com", "example.net", "example.org", "supabase.co", "github.io", "gmail.com", "outlook.com", "hotmail.com", "yahoo.com"];
  return !forbidden.some(suffix => host === suffix || host.endsWith("." + suffix));
}
export function secureRandomBytes(bytes = 32) {
  if (!Number.isInteger(bytes) || bytes < 24 || bytes > 128) throw new Error("Invalid random length");
  const output = new Uint8Array(bytes);
  crypto.getRandomValues(output);
  return output;
}
export function randomHex(bytes = 24) {
  return Array.from(secureRandomBytes(bytes), b => b.toString(16).padStart(2, "0")).join("");
}
export function makeRecoveryCode() {
  // A one-time 256-bit secret, not a human security question.
  const data = secureRandomBytes(32);
  const encoded = btoa(String.fromCharCode(...data)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return "R1-" + encoded;
}
export function createInternalAlias(domain) {
  if (!validateAliasDomain(domain)) throw new Error("AUTH_ALIAS_DOMAIN must be operator-owned and valid");
  return "player-" + randomHex(24) + "@" + domain.trim().toLowerCase();
}
export async function hmacHex(secret, context, value) {
  if (typeof secret !== "string" || secret.length < 32) throw new Error("HMAC secret unconfigured");
  if (!context || typeof context !== "string" || typeof value !== "string") throw new Error("Invalid HMAC input");
  const utf8 = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", utf8.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, utf8.encode(context + "\u0000" + value));
  return Array.from(new Uint8Array(mac), b => b.toString(16).padStart(2, "0")).join("");
}
export function validRecoveryCode(value) {
  return typeof value === "string" && /^R1-[a-zA-Z0-9_-]{43}$/.test(value);
}
