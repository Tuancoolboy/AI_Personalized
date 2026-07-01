import { apiOk } from "@/lib/api-error";
import { isPlatformAdmin } from "@/lib/rbac";
import { resolveApiSession } from "@/lib/api-auth";
import {
  DEMO_PLATFORM_ADMIN_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";
import { cookies } from "next/headers";

export async function GET() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    return apiOk({
      isPlatformAdmin:
        cookieStore.get(DEMO_PLATFORM_ADMIN_COOKIE)?.value === "true",
    });
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiOk({ isPlatformAdmin: false });
  }

  return apiOk({ isPlatformAdmin: await isPlatformAdmin(session.userId) });
}
