import { cookies } from "next/headers";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
  type UserType,
} from "@/lib/supabase/is-configured";
import { metadataFullName, resolveFullDisplayName } from "@/lib/display-name";
import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getManagerMembershipForUser } from "@/lib/manager-auth";

export async function resolveAppUserType(): Promise<UserType> {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return "employee";
    return (await getManagerMembershipForUser(user.id)) ? "manager" : "employee";
  }

  const cookieStore = await cookies();
  const typeCookie = cookieStore.get(DEMO_USER_TYPE_COOKIE)?.value;
  return typeCookie === "manager" ? "manager" : "employee";
}

export async function resolveAppUserDisplayName(): Promise<string> {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return "bạn";

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    return resolveFullDisplayName({
      profileFullName: data?.full_name,
      metadataFullName: metadataFullName(user.user_metadata),
      email: user.email,
      fallback: "bạn",
    });
  }

  const cookieStore = await cookies();
  const hasDemo = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "true";
  if (!hasDemo) return "bạn";

  const userType = await resolveAppUserType();
  return userType === "manager" ? "Quản lý" : "Demo User";
}
