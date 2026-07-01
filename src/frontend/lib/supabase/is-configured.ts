// Kiểm tra Supabase đã cấu hình env vars chưa.
// Client-safe vì chỉ check NEXT_PUBLIC_* vars (luôn lộ ra client bundle).
// Demo mode bật khi return false — auth + (app) chạy không cần Supabase.

import { hasSupabasePublicEnv } from "@/lib/supabase/public-env";

export function isSupabaseConfigured(): boolean {
  return hasSupabasePublicEnv();
}

// Cookie name dùng để đánh dấu demo session.
// Đặt khi user "đăng nhập" trong demo mode → proxy + layout cho phép truy cập (app).
export const DEMO_SESSION_COOKIE = "ai_troly_demo_session";

// Cookie đánh dấu user type: "employee" (mặc định) hoặc "manager".
// Email pattern "quanly@", "manager@", "hr@" trong demo → manager.
export const DEMO_USER_TYPE_COOKIE = "ai_troly_demo_user_type";

// Cookie đánh dấu đã hoàn thành onboarding trong demo mode (proxy không đọc localStorage).
export const DEMO_ONBOARDED_COOKIE = "ai_troly_demo_onboarded";

// Cookie đánh dấu platform_admin trong demo mode (khu /van-hanh).
export const DEMO_PLATFORM_ADMIN_COOKIE = "ai_troly_demo_platform_admin";

// Email được cấp quyền super-admin (platform_admin). Real mode seed vào bảng
// platform_admins bằng migration / bootstrap script; demo mode nhận diện qua
// email khi đăng nhập. KHÔNG chứa mật khẩu — chỉ là danh sách email được phép.
export const PLATFORM_ADMIN_EMAILS = [
  "admin@c2-app-009.io.vn",
  "lucas.ai.vn@gmail.com",
];

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return PLATFORM_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export type UserType = "employee" | "manager";

// Detect user type từ email khi login demo.
export function detectUserTypeFromEmail(email: string): UserType {
  const lowered = email.toLowerCase();
  if (
    lowered.startsWith("quanly") ||
    lowered.startsWith("manager") ||
    lowered.startsWith("hr") ||
    lowered.startsWith("admin") ||
    lowered.startsWith("ql.") ||
    lowered.startsWith("truongphong")
  ) {
    return "manager";
  }
  return "employee";
}
