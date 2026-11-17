// Email-only Auth adapter. Authentication and rate limiting remain enforced by Supabase.
// No OTP is persisted, logged, placed in a URL, or retained after verification.
export const EMAIL_OTP_COOLDOWN_MS = 60_000;

export class EmailOtpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "EmailOtpError";
    this.code = code;
  }
}

export function normalizeOtpEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidOtpEmail(value) {
  const email = normalizeOtpEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function createEmailOtpFlow(auth, { clock = () => Date.now(), cooldownMs = EMAIL_OTP_COOLDOWN_MS } = {}) {
  if (!auth || typeof auth.signInWithOtp !== "function" || typeof auth.verifyOtp !== "function") {
    throw new TypeError("Supabase Auth must support email OTP requests and verification.");
  }
  if (!Number.isFinite(cooldownMs) || cooldownMs < 0) {
    throw new TypeError("Invalid OTP cooldown.");
  }

  let pendingEmail = "";
  let lastSentEmail = "";
  let lastSentAt = Number.NEGATIVE_INFINITY;
  let generation = 0;
  let requesting = false;
  let verifying = false;

  function cancelPending() {
    generation += 1;
    pendingEmail = "";
  }

  function remainingCooldownMs(input) {
    const email = normalizeOtpEmail(input);
    if (!email || email !== lastSentEmail) return 0;
    return Math.max(0, cooldownMs - (clock() - lastSentAt));
  }

  async function requestCode(input) {
    const email = normalizeOtpEmail(input);
    if (!isValidOtpEmail(email)) {
      throw new EmailOtpError("EMAIL_INVALID", "請輸入有效的 Email 信箱。");
    }
    if (requesting) {
      throw new EmailOtpError("REQUEST_PENDING", "正在寄送驗證碼，請勿重複送出。");
    }
    if (remainingCooldownMs(email) > 0) {
      throw new EmailOtpError("COOLDOWN", "驗證碼寄送後請等待 60 秒再重送。");
    }
    // Changing the address invalidates any previous code-entry state.
    cancelPending();
    const expectedGeneration = generation;
    requesting = true;
    try {
      const { error } = await auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      lastSentEmail = email;
      lastSentAt = clock();
      if (generation !== expectedGeneration) return { stale: true };
      pendingEmail = email;
      return { email, stale: false };
    } finally {
      requesting = false;
    }
  }

  async function verifyCode(input) {
    if (!pendingEmail) {
      throw new EmailOtpError("CODE_NOT_REQUESTED", "請先寄送驗證碼。");
    }
    const code = String(input || "").trim();
    if (!/^[0-9]{6}$/.test(code)) {
      throw new EmailOtpError("CODE_INVALID", "請輸入信件中的六位數驗證碼。");
    }
    if (verifying) {
      throw new EmailOtpError("VERIFY_PENDING", "正在驗證，請勿重複送出。");
    }
    const email = pendingEmail;
    const expectedGeneration = generation;
    verifying = true;
    try {
      const { data, error } = await auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error;
      if (generation !== expectedGeneration) return { stale: true, session: null };
      if (!data?.session?.user?.id) {
        throw new EmailOtpError("SESSION_MISSING", "驗證成功但未取得有效登入狀態，請重新登入。");
      }
      pendingEmail = "";
      return { stale: false, session: data.session };
    } finally {
      verifying = false;
    }
  }

  return Object.freeze({
    requestCode,
    verifyCode,
    cancelPending,
    remainingCooldownMs,
    get pendingEmail() { return pendingEmail; },
  });
}
