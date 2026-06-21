import { detectUserTypeFromEmail } from "@/lib/supabase/is-configured";
import type { UserType } from "@/lib/supabase/is-configured";

/** Chỉ cho phép path nội bộ — chặn protocol-relative `//`. */
export function sanitizeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

/** Đường dẫn sau login/register — dùng chung proxy + form. */
export function getPostAuthPath(
  roleId: string | null | undefined,
  email: string | null | undefined,
  userType?: UserType | null,
): string {
  if (userType === "manager") {
    return "/quan-ly";
  }
  if (!userType && email && detectUserTypeFromEmail(email) === "manager") {
    return "/quan-ly";
  }
  if (roleId) {
    return "/lo-trinh";
  }
  return "/onboarding";
}

export const EMPLOYEE_APP_PREFIXES = [
  "/lo-trinh",
  "/tro-ly",
  "/kiem-tra",
  "/tien-bo",
] as const;

export function isEmployeeAppPath(pathname: string): boolean {
  return EMPLOYEE_APP_PREFIXES.some((p) => pathname.startsWith(p));
}

export function isManagerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return detectUserTypeFromEmail(email) === "manager";
}
