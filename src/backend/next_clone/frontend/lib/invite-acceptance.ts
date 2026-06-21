import {
  buildInvitePath,
  findActiveInviteLinkByToken,
  incrementInviteLinkUsedCount,
} from "@/lib/company-invite-links";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  getSingleOrganizationConflict,
  type OrganizationMembershipRow,
} from "@/lib/single-organization-membership";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type InviteAcceptError = "accept" | "invalid" | "already-member";

export type InviteAcceptResult =
  | { ok: true; redirectPath: string }
  | { ok: false; error: InviteAcceptError };

type MembershipRow = OrganizationMembershipRow & {
  member_role: string;
  department_id: string | null;
};

async function getProfileRoleId(
  supabase: SupabaseServiceClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[invite-accept:profile]", error.message);
    return null;
  }

  return typeof data?.role_id === "string" ? data.role_id : null;
}

function postAcceptRedirectPath(
  memberRole: string | null | undefined,
  roleId: string | null,
): string {
  if (memberRole === "manager" || memberRole === "owner") {
    return "/quan-ly";
  }
  return roleId ? "/lo-trinh" : "/onboarding";
}

export async function acceptOrganizationInvite(input: {
  token: string;
  userId: string;
  userEmail: string | null | undefined;
  supabase?: SupabaseServiceClient;
}): Promise<InviteAcceptResult> {
  const supabase = input.supabase ?? createSupabaseServiceClient();

  let invite;
  try {
    invite = await findActiveInviteLinkByToken(supabase, input.token);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[invite-accept:invite-read]", message);
    return { ok: false, error: "accept" };
  }

  if (!invite) {
    return { ok: false, error: "invalid" };
  }

  const now = new Date().toISOString();
  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select(
      "organization_id, member_role, department_id, updated_at, created_at, organizations(name)",
    )
    .eq("user_id", input.userId);

  if (membershipsError) {
    console.error("[invite-accept:membership-read]", membershipsError.message);
    return { ok: false, error: "accept" };
  }

  const membershipRows = (memberships as MembershipRow[] | null) ?? [];
  const conflict = getSingleOrganizationConflict(
    membershipRows,
    invite.organization_id,
  );
  if (conflict.hasConflict) {
    return { ok: false, error: "already-member" };
  }

  const currentMembership =
    membershipRows.find((row) => row.organization_id === invite.organization_id) ??
    null;

  const membershipWrite = currentMembership
    ? await supabase
        .from("organization_members")
        .update({
          department_id: currentMembership.department_id || "khac",
          invited_email: input.userEmail ?? null,
          invited_by: invite.created_by,
          invited_at: now,
          updated_at: now,
        })
        .eq("organization_id", invite.organization_id)
        .eq("user_id", input.userId)
    : await supabase.from("organization_members").insert({
        organization_id: invite.organization_id,
        user_id: input.userId,
        member_role: "employee",
        department_id: "khac",
        invited_email: input.userEmail ?? null,
        invited_by: invite.created_by,
        invited_at: now,
        updated_at: now,
      });

  if (membershipWrite.error) {
    console.error(
      "[invite-accept:membership-write]",
      membershipWrite.error.message,
    );
    return { ok: false, error: "accept" };
  }

  await incrementInviteLinkUsedCount(supabase, invite.id);

  const effectiveRole =
    currentMembership?.member_role === "manager" ||
    currentMembership?.member_role === "owner"
      ? currentMembership.member_role
      : "employee";

  const roleId = await getProfileRoleId(supabase, input.userId);
  return {
    ok: true,
    redirectPath: postAcceptRedirectPath(effectiveRole, roleId),
  };
}

export function inviteAcceptErrorPath(
  token: string,
  error: InviteAcceptError,
): string {
  return `${buildInvitePath(token)}?error=${error}`;
}
