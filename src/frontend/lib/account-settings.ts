import { getRole } from "@/lib/roles";
import type { UserType } from "@/lib/supabase/is-configured";

export const ACCOUNT_TABS = [
  "thong-tin",
  "ho-so",
  "mat-khau",
  "email",
] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function resolveAccountRoleLabel(
  roleId: string | null | undefined,
  userType: UserType,
): string {
  const role = typeof roleId === "string" ? getRole(roleId) : null;
  if (role) {
    return role.shortLabel;
  }

  return userType === "manager" ? "Trưởng phòng" : "Nhân viên";
}

export function normalizeAccountTab(value: string | null | undefined): AccountTab {
  return ACCOUNT_TABS.includes(value as AccountTab)
    ? (value as AccountTab)
    : "thong-tin";
}

export function normalizePhoneNumber(value: string): string {
  return value.trim().replace(/[\s().-]+/g, "");
}

export function validatePhoneNumber(value: string): ValidationResult {
  const phoneNumber = normalizePhoneNumber(value);
  if (!phoneNumber) return { ok: true, value: "" };
  if (!/^\+?\d{9,15}$/.test(phoneNumber)) {
    return {
      ok: false,
      message: "Số điện thoại cần gồm 9-15 chữ số.",
    };
  }
  return { ok: true, value: phoneNumber };
}

export function validateFullName(value: string): ValidationResult {
  const fullName = value.trim().replace(/\s+/g, " ");
  if (fullName.length < 2) {
    return { ok: false, message: "Vui lòng nhập họ tên hợp lệ." };
  }
  return { ok: true, value: fullName };
}

export function validateEmailUpdate(
  value: string,
  currentEmail: string | null | undefined,
): ValidationResult {
  const email = value.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, message: "Email mới không hợp lệ." };
  }
  if (currentEmail && email === currentEmail.trim().toLowerCase()) {
    return { ok: false, message: "Email mới đang trùng email hiện tại." };
  }
  return { ok: true, value: email };
}

export function validatePasswordChange(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): ValidationResult {
  const currentPassword = input.currentPassword;
  const newPassword = input.newPassword;
  const confirmPassword = input.confirmPassword;

  if (currentPassword.length < 1) {
    return { ok: false, message: "Vui lòng nhập mật khẩu hiện tại." };
  }
  if (newPassword.length < 8) {
    return { ok: false, message: "Mật khẩu mới cần ít nhất 8 ký tự." };
  }
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Xác nhận mật khẩu chưa khớp." };
  }
  if (newPassword === currentPassword) {
    return {
      ok: false,
      message: "Mật khẩu mới cần khác mật khẩu hiện tại.",
    };
  }
  return { ok: true, value: newPassword };
}
