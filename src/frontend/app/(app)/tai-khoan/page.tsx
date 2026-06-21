import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountSettingsContent } from "@/components/account-settings-content";
import {
  normalizeAccountTab,
  resolveAccountRoleLabel,
} from "@/lib/account-settings";
import { metadataFullName, resolveFullDisplayName } from "@/lib/display-name";
import { getManagerMembershipForUser } from "@/lib/manager-auth";
import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
  type UserType,
} from "@/lib/supabase/is-configured";

export const metadata: Metadata = {
  title: "Tài khoản · AI Trợ Lý",
};

type AccountPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const query = await searchParams;
  const activeTab = normalizeAccountTab(query.tab);
  const supabaseReady = isSupabaseConfigured();

  let userType: UserType = "employee";
  let isDemo = false;
  let fullName = "Demo User";
  let email = "demo@aitroly.local";
  let phoneNumber = "";
  let roleId: string | null = null;

  if (supabaseReady) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    email = user.email ?? "nguoidung@aitroly.local";
    userType = (await getManagerMembershipForUser(user.id))
      ? "manager"
      : "employee";

    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id, full_name, email, phone_number")
      .eq("id", user.id)
      .maybeSingle();

    roleId = profile?.role_id ?? null;
    fullName = resolveFullDisplayName({
      profileFullName: profile?.full_name,
      metadataFullName: metadataFullName(user.user_metadata),
      email: user.email,
      fallback: email,
    });
    email = profile?.email ?? email;
    phoneNumber = profile?.phone_number ?? "";
  } else {
    const cookieStore = await cookies();
    const hasDemoSession =
      cookieStore.get(DEMO_SESSION_COOKIE)?.value === "true";
    if (!hasDemoSession) redirect("/login");

    isDemo = true;
    const typeCookie = cookieStore.get(DEMO_USER_TYPE_COOKIE)?.value;
    userType = typeCookie === "manager" ? "manager" : "employee";
    fullName = userType === "manager" ? "Chị Quản lý" : "Demo User";
    email =
      userType === "manager"
        ? "quanly@congty.vn"
        : "nhanvien@congty.vn";
  }

  const roleLabel = resolveAccountRoleLabel(roleId, userType);

  return (
    <AccountSettingsContent
      activeTab={activeTab}
      userType={userType}
      isDemo={isDemo}
      initialProfile={{
        fullName,
        email,
        phoneNumber,
        roleLabel,
      }}
    />
  );
}
