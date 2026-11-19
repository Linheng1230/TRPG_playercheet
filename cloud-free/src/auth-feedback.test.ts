import { describe, expect, it } from "vitest";
import {
  authFailureMessage,
  SIGNIN_PASSWORD_MIN_LENGTH,
  SIGNUP_PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./auth-feedback";

describe("Convex Auth v2 login/signup failure UI copy", () => {
  it("uses the upstream pinned password requirement, not the old 8-character signup rule", () => {
    expect(SIGNUP_PASSWORD_MIN_LENGTH).toBe(10);
    expect(SIGNIN_PASSWORD_MIN_LENGTH).toBe(8);
    expect(PASSWORD_MAX_LENGTH).toBe(100);
    expect(authFailureMessage("signup",{error:"PASSWORD_TOO_SHORT"})).toContain("10 個字元");
    expect(authFailureMessage("signin",{error:"PASSWORD_TOO_SHORT"})).toContain("8 個字元");
  });

  it("labels signup failures as signup, not login", () => {
    expect(authFailureMessage("signup")).toMatch(/^註冊未完成/);
    expect(authFailureMessage("signin")).toMatch(/^登入未完成/);
    expect(authFailureMessage("signup",{error:"OTHER_ERROR"})).toContain("註冊");
    expect(authFailureMessage("signin",{error:"OTHER_ERROR"})).toContain("登入");
  });

  it("maps documented password failures into actionable instructions", () => {
    expect(authFailureMessage("signup",{error:"PASSWORD_TOO_COMMON"})).toContain("太常見");
    expect(authFailureMessage("signup",{error:"PASSWORD_TOO_LONG"})).toContain("100");
    expect(authFailureMessage("signup",{error:"PASSWORD_HAS_SURROUNDING_WHITESPACE"})).toContain("開頭或結尾");
  });

  it("maps documented username format failures", () => {
    expect(authFailureMessage("signup",{error:"USERNAME_TOO_SHORT"})).toContain("3");
    expect(authFailureMessage("signup",{error:"USERNAME_TOO_LONG"})).toContain("太長");
    expect(authFailureMessage("signup",{error:"USERNAME_HAS_SURROUNDING_WHITESPACE"})).toContain("空白");
    expect(authFailureMessage("signup",{error:"USERNAME_HAS_INVALID_CHARACTERS"})).toContain("隱藏字元");
  });

  it("does not show account existence or raw backend diagnostics", () => {
    const feedback=authFailureMessage("signup",{error:"USERNAME_TAKEN"});
    expect(feedback).toContain("無法註冊");
    expect(feedback).not.toMatch(/已被|已存在|有人使用/);
    const secret="sensitive-secret-do-not-render";
    const error={error:"OTHER_ERROR",cause:Error(secret)};
    expect(authFailureMessage("signup",error)).not.toContain(secret);
    expect(authFailureMessage("signin",{error:"USER_NOT_FOUND"}))
      .toBe(authFailureMessage("signin",{error:"INVALID_CREDENTIALS"}));
    expect(authFailureMessage("signin",{error:"RATE_LIMITED"})).toContain("稍後");
  });

  it("falls back safely for unexpected error codes",()=>{
    expect(authFailureMessage("signup",{error:"FUTURE_STATUS"})).toMatch(/^註冊未完成/);
    expect(authFailureMessage("signin",{error:"FUTURE_STATUS"})).toMatch(/^登入未完成/);
  });
});
