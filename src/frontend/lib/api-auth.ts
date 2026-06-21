import { cookies } from "next/headers";
import {
  DEMO_SESSION_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ApiSession =
  | { mode: "supabase"; userId: string }
  | { mode: "demo"; userId: "demo-user" };

export async function resolveApiSession(): Promise<ApiSession | null> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { mode: "supabase", userId: user.id };
  }

  const cookieStore = await cookies();
  const hasDemo = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "true";
  if (!hasDemo) return null;
  return { mode: "demo", userId: "demo-user" };
}
