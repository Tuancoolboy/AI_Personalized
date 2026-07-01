import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { buildAvatarUrl } from "@/lib/app-avatar";
import { resolveFullDisplayName, metadataFullName } from "@/lib/display-name";
import { mergeLearningProfile, parseLearningProfile } from "@/lib/learning-profile";
import { syncMemberDepartmentForUser } from "@/lib/member-department-sync";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
  "nhan-su",
]);

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiError(
      "FORBIDDEN",
      "API profile chỉ khả dụng khi đã cấu hình Supabase.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: authData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("role_id, full_name, ai_level, email, phone_number, learning_profile")
      .eq("id", session.userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (error) {
    console.error("[profile-get]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ.");
  }

  const fullName = resolveFullDisplayName({
    profileFullName: data?.full_name,
    metadataFullName: metadataFullName(authData.user?.user_metadata),
    email: authData.user?.email,
    fallback: "bạn",
  });
  const learningProfile = parseLearningProfile(data?.learning_profile);
  const avatar = learningProfile.avatar ?? null;

  return apiOk({
    roleId: data?.role_id ?? null,
    fullName,
    email: data?.email ?? authData.user?.email ?? null,
    phoneNumber: data?.phone_number ?? null,
    aiLevel: data?.ai_level ?? 0,
    avatar,
    avatarUrl: buildAvatarUrl(avatar, fullName),
  });
}

type ProfilePayload = {
  roleId?: unknown;
  fullName?: unknown;
  phoneNumber?: unknown;
  aiLevel?: unknown;
  avatar?: unknown;
};

function parseAiLevel(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : NaN;
  if (!Number.isFinite(n) || n < 0 || n > 5) return undefined;
  return n;
}

export async function PUT(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError(
      "FORBIDDEN",
      "API profile chỉ khả dụng khi đã cấu hình Supabase.",
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }
  const supabase = await createSupabaseServerClient();

  let body: ProfilePayload;
  try {
    body = (await request.json()) as ProfilePayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const roleId =
    typeof body.roleId === "string" ? body.roleId.trim() : undefined;
  if (roleId !== undefined && (!roleId || !VALID_ROLES.has(roleId))) {
    return apiError("VALIDATION_ERROR", "Vai trò không hợp lệ.");
  }

  const fullName =
    typeof body.fullName === "string" ? body.fullName.trim() : undefined;
  if (body.fullName !== undefined && (!fullName || fullName.length < 2)) {
    return apiError("VALIDATION_ERROR", "Họ tên không hợp lệ.");
  }

  const phoneNumber =
    typeof body.phoneNumber === "string"
      ? body.phoneNumber.trim().replace(/[\s().-]+/g, "")
      : body.phoneNumber === null
        ? null
        : undefined;
  if (
    phoneNumber !== undefined &&
    phoneNumber !== null &&
    phoneNumber !== "" &&
    !/^\+?\d{9,15}$/.test(phoneNumber)
  ) {
    return apiError("VALIDATION_ERROR", "Số điện thoại không hợp lệ.");
  }

  const aiLevel = parseAiLevel(body.aiLevel);
  if (body.aiLevel !== undefined && aiLevel === undefined) {
    return apiError("VALIDATION_ERROR", "Cấp độ AI không hợp lệ.");
  }

  const avatar =
    body.avatar && typeof body.avatar === "object"
      ? parseLearningProfile({ avatar: body.avatar }).avatar
      : typeof body.avatar === "string"
        ? parseLearningProfile({ avatar: body.avatar }).avatar
        : body.avatar === null
          ? null
          : undefined;
  if (body.avatar !== undefined && avatar === undefined) {
    return apiError("VALIDATION_ERROR", "Avatar không hợp lệ.");
  }

  let learningProfilePatch: ReturnType<typeof parseLearningProfile> | undefined;
  if (avatar !== undefined) {
    const { data: profileRow, error: profileReadError } = await supabase
      .from("profiles")
      .select("learning_profile")
      .eq("id", session.userId)
      .maybeSingle();

    if (profileReadError) {
      console.error("[profile-put:learning-profile]", profileReadError.message);
      return apiError("INTERNAL_ERROR", "Không đọc được hồ sơ avatar.");
    }

    learningProfilePatch = mergeLearningProfile(
      parseLearningProfile(profileRow?.learning_profile),
      { avatar: avatar ?? undefined },
    );
    if (avatar === null) {
      delete learningProfilePatch.avatar;
    }
  }

  const updatePayload = {
    ...(roleId !== undefined ? { role_id: roleId } : {}),
    ...(fullName ? { full_name: fullName } : {}),
    ...(phoneNumber !== undefined
      ? { phone_number: phoneNumber || null }
      : {}),
    ...(aiLevel !== undefined ? { ai_level: aiLevel } : {}),
    ...(learningProfilePatch ? { learning_profile: learningProfilePatch } : {}),
  };

  if (Object.keys(updatePayload).length === 0) {
    return apiError("VALIDATION_ERROR", "Không có thông tin cần cập nhật.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", session.userId)
    .select("role_id, full_name, ai_level, email, phone_number, learning_profile")
    .single();

  if (error) {
    console.error("[profile-put]", error.message);
    return apiError("INTERNAL_ERROR", "Không lưu được vai trò.");
  }

  if (roleId) {
    try {
      await syncMemberDepartmentForUser(session.userId, roleId);
    } catch (syncError) {
      const message =
        syncError instanceof Error ? syncError.message : String(syncError);
      console.warn("[profile-put:department-sync]", message);
    }
  }

  return apiOk({
    roleId: data.role_id,
    fullName: data.full_name,
    email: data.email,
    phoneNumber: data.phone_number,
    aiLevel: data.ai_level ?? 0,
    avatar: parseLearningProfile(data.learning_profile).avatar ?? null,
    avatarUrl: buildAvatarUrl(
      parseLearningProfile(data.learning_profile).avatar,
      data.full_name ?? authDataNameFallback(data.email),
    ),
  });
}

function authDataNameFallback(email: string | null | undefined): string {
  return email?.trim() || "ban";
}
