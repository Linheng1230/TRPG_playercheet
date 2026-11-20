/** Convex Auth v2 username/password public error codes; never show raw causes or secrets. */
export type AuthMode = "signin" | "signup";
export type AuthUserError = {
  error: string;
  minimumLength?: number;
  maximumLength?: number;
  retryAfterMs?: number;
};

export const SIGNUP_PASSWORD_MIN_LENGTH = 10;
export const SIGNIN_PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 100;

export function authFailureMessage(mode: AuthMode, issue?: AuthUserError): string {
  const code = issue?.error;
  switch (code) {
    case "PASSWORD_TOO_SHORT":
      return `密碼至少需要 ${mode === "signup" ? SIGNUP_PASSWORD_MIN_LENGTH : SIGNIN_PASSWORD_MIN_LENGTH} 個字元。`;
    case "PASSWORD_TOO_LONG":
      return `密碼不可超過 ${PASSWORD_MAX_LENGTH} 個字元。`;
    case "PASSWORD_HAS_SURROUNDING_WHITESPACE":
      return "密碼開頭或結尾不能有空白字元，請修改後再試。";
    case "PASSWORD_TOO_COMMON":
      return "這組密碼太常見，請換一組較難猜的密碼。";
    case "USERNAME_TOO_SHORT":
      return "帳號名稱太短，請至少輸入 3 個字元。";
    case "USERNAME_TOO_LONG":
      return "帳號名稱太長，請縮短後再試。";
    case "USERNAME_HAS_SURROUNDING_WHITESPACE":
      return "帳號名稱開頭或結尾不能有空白字元。";
    case "USERNAME_HAS_INVALID_CHARACTERS":
      return "帳號名稱包含不可使用的特殊或隱藏字元，請修改後再試。";
    case "USERNAME_TAKEN":
      return "此帳號名稱目前無法註冊，請改用其他名稱，或返回登入。";
    case "RATE_LIMITED":
      return "嘗試次數過多，請稍後再試。";
    case "USER_NOT_FOUND":
    case "INVALID_CREDENTIALS":
      return "登入失敗，請檢查帳號與密碼後再試。";
    case "OTHER_ERROR":
      return mode === "signup"
        ? "目前無法完成註冊，請稍後再試。"
        : "目前無法完成登入，請稍後再試。";
    default:
      return mode === "signup"
        ? "註冊未完成。請檢查帳號與密碼格式，或稍後重試。"
        : "登入未完成。請確認帳號與密碼後重試。";
  }
}
