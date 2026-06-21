"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  DEMO_ONBOARDED_COOKIE,
  DEMO_PLATFORM_ADMIN_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";

export function useAppLogout() {
  const router = useRouter();

  return async function handleLogout() {
    // Demo mode: xóa cookie demo, không gọi Supabase.
    if (!isSupabaseConfigured()) {
      document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${DEMO_ONBOARDED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${DEMO_USER_TYPE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${DEMO_PLATFORM_ADMIN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      router.push("/");
      router.refresh();
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };
}

export function AppNavLogoutButton() {
  const handleLogout = useAppLogout();

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full px-3 py-1.5 text-sm font-medium text-ink-2 transition hover:bg-destructive/10 hover:text-destructive"
    >
      Đăng xuất
    </button>
  );
}
