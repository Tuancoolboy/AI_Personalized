// Xác thực platform_admin (super-admin) phía server — dùng cho khu /quan-tri.
// Demo mode: cookie DEMO_PLATFORM_ADMIN_COOKIE (đặt khi đăng nhập đúng email).
// Real mode: kiểm tra bảng platform_admins qua rbac.isPlatformAdmin (least-privilege).

import { cookies } from "next/headers";
import { resolveApiSession } from "@/lib/api-auth";
import { isPlatformAdmin } from "@/lib/rbac";
import {
  DEMO_PLATFORM_ADMIN_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";

export async function isPlatformAdminUser(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_PLATFORM_ADMIN_COOKIE)?.value === "true";
  }
  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") return false;
  return isPlatformAdmin(session.userId);
}

export async function requirePlatformAdminContext(): Promise<
  { mode: "demo"; userId: "demo-user" } | { mode: "supabase"; userId: string } | null
> {
  const session = await resolveApiSession();
  if (!session) return null;

  if (session.mode === "demo") {
    const cookieStore = await cookies();
    return cookieStore.get(DEMO_PLATFORM_ADMIN_COOKIE)?.value === "true"
      ? session
      : null;
  }

  if (!(await isPlatformAdmin(session.userId))) {
    return null;
  }

  return session;
}
