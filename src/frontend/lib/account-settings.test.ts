import { describe, expect, it } from "vitest";
import {
  normalizeAccountTab,
  resolveAccountRoleLabel,
  validateEmailUpdate,
  validatePasswordChange,
  validatePhoneNumber,
} from "@/lib/account-settings";

describe("account settings validation", () => {
  it("normalizes unknown tabs to profile overview", () => {
    expect(normalizeAccountTab("email")).toBe("email");
    expect(normalizeAccountTab("unknown")).toBe("thong-tin");
  });

  it("prefers the user's actual role label over generic employee text", () => {
    expect(resolveAccountRoleLabel("marketing", "employee")).toBe("Marketing");
    expect(resolveAccountRoleLabel("marketing", "manager")).toBe("Marketing");
    expect(resolveAccountRoleLabel(null, "manager")).toBe("Trưởng phòng");
  });

  it("validates phone numbers as optional but formatted", () => {
    expect(validatePhoneNumber("")).toEqual({ ok: true, value: "" });
    expect(validatePhoneNumber("090 123 4567")).toEqual({
      ok: true,
      value: "0901234567",
    });
    expect(validatePhoneNumber("abc")).toEqual({
      ok: false,
      message: "Số điện thoại cần gồm 9-15 chữ số.",
    });
  });

  it("rejects invalid or unchanged email updates", () => {
    expect(validateEmailUpdate("bad", "a@test.local")).toEqual({
      ok: false,
      message: "Email mới không hợp lệ.",
    });
    expect(validateEmailUpdate(" A@Test.Local ", "a@test.local")).toEqual({
      ok: false,
      message: "Email mới đang trùng email hiện tại.",
    });
    expect(validateEmailUpdate("new@test.local", "a@test.local")).toEqual({
      ok: true,
      value: "new@test.local",
    });
  });

  it("validates password confirmation and length", () => {
    expect(
      validatePasswordChange({
        currentPassword: "",
        newPassword: "12345678",
        confirmPassword: "12345678",
      }),
    ).toEqual({
      ok: false,
      message: "Vui lòng nhập mật khẩu hiện tại.",
    });
    expect(
      validatePasswordChange({
        currentPassword: "old-password",
        newPassword: "123",
        confirmPassword: "123",
      }),
    ).toEqual({
      ok: false,
      message: "Mật khẩu mới cần ít nhất 8 ký tự.",
    });
    expect(
      validatePasswordChange({
        currentPassword: "old-password",
        newPassword: "new-password",
        confirmPassword: "different",
      }),
    ).toEqual({
      ok: false,
      message: "Xác nhận mật khẩu chưa khớp.",
    });
  });
});
