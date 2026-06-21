// Xác thực quản lý. Demo mode vẫn dùng cookie/email pattern; Supabase real mode
// dùng organization_members làm source of truth cho multi-manager.

import { cookies } from "next/headers";
import { resolveApiSession, type ApiSession } from "@/lib/api-auth";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";
import {
  selectManagerMembership,
  type ManagerMembership,
  type ManagerMembershipRow,
} from "@/lib/manager-membership";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ManagerContext = {
  session: ApiSession;
  membership: ManagerMembership;
};

async function isDemoManager(): Promise<boolean> {
  const cookieStore = await cookies();
  const hasDemo = cookieStore.get(DEMO_SESSION_COOKIE)?.value === "true";
  const isManager = cookieStore.get(DEMO_USER_TYPE_COOKIE)?.value === "manager";
  return hasDemo && isManager;
}

export async function getManagerMembershipForUser(
  userId: string,
): Promise<ManagerMembership | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "organization_id, member_role, updated_at, created_at, organizations(name)",
    )
    .eq("user_id", userId)
    .in("member_role", ["manager", "owner"]);

  if (error) {
    console.warn("[manager-membership]", error.message);
    return null;
  }

  return selectManagerMembership((data as ManagerMembershipRow[] | null) ?? []);
}

export async function getCurrentManagerMembership(): Promise<ManagerMembership | null> {
  if (!isSupabaseConfigured()) {
    if (!(await isDemoManager())) return null;
    return {
      organizationId: "demo",
      organizationName: "Tổ chức demo",
      role: "manager",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return getManagerMembershipForUser(user.id);
}

export async function isManagerUser(): Promise<boolean> {
  return Boolean(await getCurrentManagerMembership());
}

export async function requireManagerContext(): Promise<ManagerContext | null> {
  const session = await resolveApiSession();
  if (!session) return null;

  const membership = await getCurrentManagerMembership();
  if (!membership) return null;

  return { session, membership };
}

export async function requireManagerApiSession(): Promise<ApiSession | null> {
  const context = await requireManagerContext();
  return context?.session ?? null;
}
