/** 5-character human-friendly invites. Hash before sending to Convex. */
export const INVITE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const INVITE_LENGTH = 5;
export const INVITE_ATTEMPTS_PER_WINDOW = 5;
export const INVITE_WINDOW_MS = 10 * 60 * 1000;
const UNBIASED_BYTE_LIMIT = Math.floor(256 / INVITE_ALPHABET.length) * INVITE_ALPHABET.length;

export function makeInviteCode(getBytes: (array: Uint8Array) => Uint8Array = (array) => {
  if (!globalThis.crypto?.getRandomValues) throw new Error("SECURE_RANDOM_UNAVAILABLE");
  return globalThis.crypto.getRandomValues(array);
}): string {
  let code = "";
  while (code.length < INVITE_LENGTH) {
    const bytes = getBytes(new Uint8Array(12));
    for (const byte of bytes) {
      if (byte >= UNBIASED_BYTE_LIMIT) continue;
      code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
      if (code.length === INVITE_LENGTH) break;
    }
  }
  return code;
}
export function normalizeInviteCode(raw: string): string | null {
  const clean = raw.trim();
  if (/^[A-Za-z0-9]{5}$/.test(clean)) return clean.toUpperCase();
  // Previously issued 256-bit hex invitations can still be redeemed until expiry.
  if (/^[a-fA-F0-9]{64}$/.test(clean)) return clean.toLowerCase();
  return null;
}
export type InviteBudget = { windowStartedAt: number; attempts: number };
export function advanceInviteBudget(previous: InviteBudget | null, now: number):
  { next: InviteBudget; allowed: boolean } {
  const expired = !previous || now - previous.windowStartedAt >= INVITE_WINDOW_MS ||
    now < previous.windowStartedAt;
  const base = expired ? { windowStartedAt: now, attempts: 0 } : previous;
  return { next: { windowStartedAt: base.windowStartedAt, attempts: base.attempts + 1 },
    allowed: base.attempts < INVITE_ATTEMPTS_PER_WINDOW };
}
