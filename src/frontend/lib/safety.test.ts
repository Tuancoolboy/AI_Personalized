import { describe, expect, it } from "vitest";
import { detectSensitiveData, getSafetyWarning } from "./safety";

describe("safety", () => {
  it("detects phone-like numbers", () => {
    expect(detectSensitiveData("Số của khách: 0912345678")).toBe(true);
  });

  it("detects account keywords", () => {
    expect(detectSensitiveData("STK 123456789")).toBe(true);
    expect(detectSensitiveData("số tài khoản ngân hàng")).toBe(true);
  });

  it("detects password keywords", () => {
    expect(detectSensitiveData("mật khẩu wifi công ty")).toBe(true);
  });

  it("returns undefined for safe questions", () => {
    expect(getSafetyWarning("AI giúp em viết email thế nào?")).toBeUndefined();
  });

  it("returns warning for sensitive paste", () => {
    expect(getSafetyWarning("CMND 001234567890")).toContain("nhạy cảm");
  });
});
