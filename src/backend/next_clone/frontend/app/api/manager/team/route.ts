import { apiError, apiOk } from "@/lib/api-error";
import { requireManagerContext } from "@/lib/manager-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  managerPrivateOrganizationName,
  organizationNameOf,
} from "@/lib/manager-membership";
import {
  getSingleOrganizationConflict,
  SINGLE_ORGANIZATION_CONFLICT_MESSAGE,
  type OrganizationMembershipRow,
} from "@/lib/single-organization-membership";
import {
  departmentIdToLabel,
  isDepartmentId,
  TEAM_MEMBERS,
  type DepartmentId,
  type InvitationStatus,
  type MemberRole,
  type TeamMember,
} from "@/lib/team-data";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODULE_COUNT_PER_ROLE = 6;

type InvitePayload = {
  email?: unknown;
  grantManagerAccess?: unknown;
};

type AuthUserSummary = {
  id: string;
  email?: string | null;
  phone?: string | null;
  confirmed_at?: string | null;
  invited_at?: string | null;
  last_sign_in_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

type OrganizationMemberRow = {
  user_id: string;
  member_role: MemberRole;
  department_id: string | null;
  invited_email: string | null;
  invited_at: string | null;
  created_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role_id: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ProgressRow = {
  user_id: string;
  status: string;
  completed_at: string | null;
};

type QuizRow = {
  user_id: string;
  score: number;
};

function relativeDayLabel(value: string | null | undefined): string {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000)),
  );
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  return `${diffDays} ngày trước`;
}

function metadataNameOf(user: AuthUserSummary | undefined): string | null {
  const raw = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function metadataPhoneOf(user: AuthUserSummary | undefined): string | null {
  const raw =
    user?.user_metadata?.phone_number ??
    user?.user_metadata?.phone ??
    user?.user_metadata?.phoneNumber ??
    user?.phone;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function emailNameFallback(email: string | null | undefined): string {
  if (!email) return "Nhân viên mới";
  return email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Nhân viên mới";
}

function profileNameOf(
  profile: ProfileRow | null | undefined,
  user: AuthUserSummary | null | undefined,
): string | null {
  return profile?.full_name?.trim() || metadataNameOf(user ?? undefined);
}

function profilePhoneOf(
  profile: ProfileRow | null | undefined,
  user: AuthUserSummary | null | undefined,
): string | null {
  return profile?.phone_number?.trim() || metadataPhoneOf(user ?? undefined);
}

async function findAuthUserByEmail(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
): Promise<AuthUserSummary | null> {
  const normalized = email.toLowerCase();

  // O(1) lookup via profiles.email index — no full auth.users scan.
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) return null;

  const { data, error } = await supabase.auth.admin.getUserById(profile.id);
  if (error) throw error;
  return (data.user as AuthUserSummary | null) ?? null;
}

async function loadAuthUsersById(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userIds: string[],
): Promise<Map<string, AuthUserSummary>> {
  if (userIds.length === 0) return new Map();

  // Parallel per-user lookups — no full auth.users scan.
  const results = await Promise.all(
    userIds.map((id) => supabase.auth.admin.getUserById(id)),
  );

  const usersById = new Map<string, AuthUserSummary>();
  for (const { data, error } of results) {
    if (!error && data.user) {
      usersById.set(data.user.id, data.user as AuthUserSummary);
    }
  }
  return usersById;
}

async function loadProfileById(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
): Promise<{ profile: ProfileRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number, role_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { profile: null, errorMessage: error.message };
  }

  return { profile: (data as ProfileRow | null) ?? null };
}

async function loadMembershipsByUserId(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  userId: string,
): Promise<{ memberships: OrganizationMembershipRow[]; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, member_role, updated_at, created_at, organizations(name)")
    .eq("user_id", userId);

  if (error) {
    return { memberships: [], errorMessage: error.message };
  }

  return {
    memberships: (data as OrganizationMembershipRow[] | null) ?? [],
  };
}

async function getOrCreateManagerPrivateOrganization(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  email: string,
  now: string,
): Promise<OrganizationRow> {
  const name = managerPrivateOrganizationName(email);
  const { data, error } = await supabase
    .from("organizations")
    .upsert(
      {
        name,
        updated_at: now,
      },
      { onConflict: "name" },
    )
    .select("id, name")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Không tạo được tổ chức riêng.");
  }

  return data as OrganizationRow;
}

function mapTeamMember(params: {
  row: OrganizationMemberRow;
  profile?: ProfileRow;
  authUser?: AuthUserSummary;
  completedCount: number;
  latestCompletedAt?: string | null;
  quizScore: number;
}): TeamMember {
  const departmentId = isDepartmentId(params.row.department_id ?? "")
    ? (params.row.department_id as DepartmentId)
    : isDepartmentId(params.profile?.role_id ?? "")
      ? (params.profile?.role_id as DepartmentId)
      : "khac";
  const email = params.authUser?.email ?? params.row.invited_email ?? undefined;
  const phoneNumber = profilePhoneOf(params.profile, params.authUser);
  const invitationStatus: InvitationStatus =
    params.authUser?.last_sign_in_at || params.authUser?.confirmed_at
      ? "active"
      : "pending";
  const completionPct = Math.min(
    100,
    Math.round((params.completedCount / MODULE_COUNT_PER_ROLE) * 100),
  );
  const fallbackActivity =
    invitationStatus === "pending" ? "Đã gửi lời mời" : "Chưa bắt đầu";
  const latestActivity =
    relativeDayLabel(params.latestCompletedAt) ||
    relativeDayLabel(params.row.invited_at ?? params.row.created_at) ||
    fallbackActivity;

  return {
    id: params.row.user_id,
    fullName:
      params.profile?.full_name?.trim() ||
      metadataNameOf(params.authUser) ||
      emailNameFallback(email),
    email,
    phoneNumber: phoneNumber ?? undefined,
    departmentId,
    department: departmentIdToLabel(departmentId),
    memberRole: params.row.member_role,
    invitationStatus,
    completionPct,
    quizScore: params.quizScore,
    lastActivity: latestActivity,
  };
}

async function loadOrganizationMembers(
  organizationId: string,
  organizationName: string,
  viewerUserId: string,
) {
  const supabase = createSupabaseServiceClient();
  const { data: memberRows, error: memberError } = await supabase
    .from("organization_members")
    .select("user_id, member_role, department_id, invited_email, invited_at, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (memberError) {
    console.error("[manager-team:get-members]", memberError.message);
    return apiError("INTERNAL_ERROR", "Không tải được danh sách nhân viên.");
  }

  const rows = ((memberRows ?? []) as OrganizationMemberRow[]).filter(
    (row) => row.user_id !== viewerUserId,
  );
  const userIds = rows.map((row) => row.user_id);
  if (userIds.length === 0) {
    return apiOk({
      members: [],
      total: 0,
      organizationName,
      persisted: true,
    });
  }

  const [
    { data: profiles, error: profilesError },
    { data: progress, error: progressError },
    { data: quizzes, error: quizzesError },
    usersById,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, phone_number, role_id")
      .in("id", userIds),
    supabase
      .from("module_progress")
      .select("user_id, status, completed_at")
      .in("user_id", userIds),
    supabase
      .from("quiz_results")
      .select("user_id, score")
      .in("user_id", userIds),
    loadAuthUsersById(supabase, userIds),
  ]);

  const readError = profilesError ?? progressError ?? quizzesError;
  if (readError) {
    console.error("[manager-team:get-details]", readError.message);
    return apiError("INTERNAL_ERROR", "Không tải được dữ liệu tiến độ đội.");
  }

  const profileById = new Map(
    ((profiles ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]),
  );
  const completedByUser = new Map<string, number>();
  const latestCompletedByUser = new Map<string, string>();
  for (const row of (progress ?? []) as ProgressRow[]) {
    if (row.status !== "hoan-thanh") continue;
    completedByUser.set(row.user_id, (completedByUser.get(row.user_id) ?? 0) + 1);
    if (
      row.completed_at &&
      (!latestCompletedByUser.has(row.user_id) ||
        new Date(row.completed_at).getTime() >
          new Date(latestCompletedByUser.get(row.user_id) ?? 0).getTime())
    ) {
      latestCompletedByUser.set(row.user_id, row.completed_at);
    }
  }

  const quizScoresByUser = new Map<string, number[]>();
  for (const row of (quizzes ?? []) as QuizRow[]) {
    const prev = quizScoresByUser.get(row.user_id) ?? [];
    prev.push(row.score);
    quizScoresByUser.set(row.user_id, prev);
  }

  const members = rows.map((row) => {
    const scores = quizScoresByUser.get(row.user_id) ?? [];
    const quizScore =
      scores.length === 0 ? 0 : Math.max(...scores.map((score) => Math.round(score)));
    return mapTeamMember({
      row,
      profile: profileById.get(row.user_id),
      authUser: usersById.get(row.user_id),
      completedCount: completedByUser.get(row.user_id) ?? 0,
      latestCompletedAt: latestCompletedByUser.get(row.user_id),
      quizScore,
    });
  });

  return apiOk({
    members,
    total: members.length,
    organizationName,
    persisted: true,
  });
}

export async function GET() {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới xem được danh sách đội.");
  }

  if (!isSupabaseConfigured()) {
    return apiOk({
      members: TEAM_MEMBERS,
      total: TEAM_MEMBERS.length,
      organizationName: context.membership.organizationName,
      persisted: false,
      message: "Đang dùng dữ liệu demo/local.",
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiOk({
      members: [],
      total: 0,
      organizationName: context.membership.organizationName,
      persisted: false,
      message:
        "Thiếu SUPABASE_SERVICE_ROLE_KEY nên chưa đọc được danh sách nhân viên thật.",
    });
  }

  return loadOrganizationMembers(
    context.membership.organizationId,
    context.membership.organizationName,
    context.session.userId,
  );
}

export async function POST(request: Request) {
  const context = await requireManagerContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới thêm nhân viên.");
  }

  let body: InvitePayload;
  try {
    body = (await request.json()) as InvitePayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const grantManagerAccess = body.grantManagerAccess === true;

  if (!email || !EMAIL_REGEX.test(email)) {
    return apiError("VALIDATION_ERROR", "Email không hợp lệ.");
  }

  const memberRole: MemberRole = grantManagerAccess ? "manager" : "employee";
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const demoName = emailNameFallback(email);
    const departmentId: DepartmentId = "khac";
    return apiOk({
      member: {
        id: `m-${Date.now()}`,
        fullName: demoName,
        email,
        departmentId,
        department: departmentIdToLabel(departmentId),
        memberRole,
        invitationStatus: "pending",
        completionPct: 0,
        quizScore: 0,
        lastActivity: "Vừa thêm",
      } satisfies TeamMember,
      persisted: false,
      message: `Đã thêm ${demoName} vào danh sách demo.`,
    });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return apiError(
      "INTERNAL_ERROR",
      "Thiếu SUPABASE_SERVICE_ROLE_KEY nên chưa thể thêm nhân viên thật.",
    );
  }

  const supabase = createSupabaseServiceClient();
  let authUser: AuthUserSummary | null = null;

  try {
    authUser = await findAuthUserByEmail(supabase, email);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[manager-team:find-user]", message);
    return apiError("INTERNAL_ERROR", "Không kiểm tra được email nhân viên.");
  }

  if (!authUser) {
    return apiError(
      "NOT_FOUND",
      "Không tìm thấy tài khoản này. Nhân viên cần đăng ký tài khoản trước khi được thêm vào tổ chức.",
    );
  }

  const { memberships, errorMessage: membershipsError } =
    await loadMembershipsByUserId(supabase, authUser.id);
  if (membershipsError) {
    console.error("[manager-team:memberships]", membershipsError);
    return apiError("INTERNAL_ERROR", "Không kiểm tra được công ty hiện tại.");
  }

  let organizationId = context.membership.organizationId;
  let privateOrganizationName: string | null = null;

  if (grantManagerAccess) {
    const expectedPrivateOrganizationName = managerPrivateOrganizationName(email);
    const blockingMembership = memberships.find(
      (row) => organizationNameOf(row) !== expectedPrivateOrganizationName,
    );

    if (blockingMembership) {
      return apiError("CONFLICT", SINGLE_ORGANIZATION_CONFLICT_MESSAGE, {
        organizationId: blockingMembership.organization_id,
        organizationName: organizationNameOf(blockingMembership),
      });
    }

    try {
      const privateOrganization = await getOrCreateManagerPrivateOrganization(
        supabase,
        email,
        now,
      );
      organizationId = privateOrganization.id;
      privateOrganizationName = privateOrganization.name;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[manager-team:private-org]", message);
      return apiError(
        "INTERNAL_ERROR",
        "Không tạo được công ty riêng cho quản lý mới.",
      );
    }
  }

  const conflict = getSingleOrganizationConflict(memberships, organizationId);
  if (conflict.hasConflict) {
    return apiError("CONFLICT", SINGLE_ORGANIZATION_CONFLICT_MESSAGE, {
      organizationId: conflict.existingOrganizationId,
      organizationName: conflict.existingOrganizationName,
    });
  }

  const { profile, errorMessage: profileError } = await loadProfileById(
    supabase,
    authUser.id,
  );
  if (profileError) {
    console.error("[manager-team:profile]", profileError);
    return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ nhân viên.");
  }

  const registeredName =
    profileNameOf(profile, authUser) ||
    emailNameFallback(authUser.email ?? email);
  const registeredPhone = profilePhoneOf(profile, authUser);
  const metadataName = metadataNameOf(authUser);
  const profileDepartmentId = profile?.role_id ?? "";
  const departmentId: DepartmentId = isDepartmentId(profileDepartmentId)
    ? profileDepartmentId
    : "khac";
  const profileUpdate: { full_name?: string; phone_number?: string } = {};

  if (!profile?.full_name?.trim() && metadataName) {
    profileUpdate.full_name = metadataName;
  }
  if (!profile?.phone_number?.trim() && registeredPhone) {
    profileUpdate.phone_number = registeredPhone;
  }

  if (Object.keys(profileUpdate).length > 0) {
    const profileWrite = profile
      ? await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", authUser.id)
      : await supabase
          .from("profiles")
          .upsert({ id: authUser.id, ...profileUpdate }, { onConflict: "id" });

    if (profileWrite.error) {
      console.error("[manager-team:profile-sync]", profileWrite.error.message);
      return apiError("INTERNAL_ERROR", "Không đồng bộ được hồ sơ nhân viên.");
    }
  }

  const currentMembership =
    memberships.find((row) => row.organization_id === organizationId) ?? null;
  const preservedRole =
    currentMembership?.member_role === "owner" ||
    currentMembership?.member_role === "manager"
      ? currentMembership.member_role
      : memberRole;
  const membershipPayload = {
    member_role: preservedRole,
    department_id: departmentId,
    invited_email: email,
    invited_by:
      context.session.mode === "supabase" ? context.session.userId : null,
    invited_at: authUser.invited_at ?? now,
    updated_at: now,
  };
  const membershipWrite = currentMembership
    ? await supabase
        .from("organization_members")
        .update(membershipPayload)
        .eq("organization_id", organizationId)
        .eq("user_id", authUser.id)
    : await supabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: authUser.id,
        ...membershipPayload,
      });

  if (membershipWrite.error) {
    console.error("[manager-team:membership]", membershipWrite.error.message);
    if (membershipWrite.error.code === "23505") {
      return apiError("CONFLICT", SINGLE_ORGANIZATION_CONFLICT_MESSAGE);
    }
    return apiError("INTERNAL_ERROR", "Không thêm được nhân viên vào tổ chức.");
  }

  const member: TeamMember = {
    id: authUser.id,
    fullName: registeredName,
    email,
    phoneNumber: registeredPhone ?? undefined,
    departmentId,
    department: departmentIdToLabel(departmentId),
    memberRole: preservedRole as MemberRole,
    invitationStatus:
      authUser.last_sign_in_at || authUser.confirmed_at ? "active" : "pending",
    completionPct: 0,
    quizScore: 0,
    lastActivity: grantManagerAccess ? "Đã tạo công ty riêng" : "Đã xác minh",
  };

  const successMessage =
    memberRole === "manager"
      ? `Đã xác minh ${registeredName} và tạo công ty riêng ${privateOrganizationName}.`
      : `Đã xác minh ${registeredName} và thêm vào tổ chức.`;

  return apiOk({
    member,
    persisted: true,
    message: successMessage,
  });
}
