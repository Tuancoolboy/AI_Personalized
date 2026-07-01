// Employee persistence helpers for Supabase real mode.
// Client components call these only when Supabase env vars are configured.

import type { AssessmentAnswer, AssessmentResult } from "@/lib/assessment";
import {
  normalizeExtraLessonStatus,
  validateExtraSkillLessonEnrollment,
  type ExtraSkillLessonEnrollment,
  type ExtraSkillLessonView,
} from "@/lib/extra-skill-lessons";
import { buildOnboardingAssessmentResultInsert } from "@/lib/onboarding-assessment-result";
import { parseLearningProfile } from "@/lib/learning-profile";
import type {
  DemoProfile,
  DemoProgress,
  DemoQuizResult,
  DemoTimeLog,
} from "@/lib/demo-storage";
import {
  getDemoExtraLessons,
  getDemoProfile,
  getDemoProgress,
  saveDemoExtraLesson,
} from "@/lib/demo-storage";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { ROLES, SKILL_LABELS } from "@/lib/roles";
import { type RoleId } from "@/lib/openai";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type ProgressStatus = DemoProgress[string];

type ProfileRow = {
  role_id: string | null;
  assessment_result: unknown | null;
  daily_tasks: string[] | null;
  ai_level: number | null;
  learning_profile: unknown | null;
  created_at: string | null;
};

type ProgressRow = {
  module_id: string;
  status: string;
};

type ExtraLessonRow = {
  module_id: string;
  skill_slug: string;
  source_role_id: string;
  enrolled_at: string;
};

type TimeLogRow = {
  id: string;
  hours_saved: number | string;
  usefulness: number | null;
  note: string | null;
  logged_at: string;
};

type QuizResultRow = {
  id: string;
  role_id: string;
  score: number;
  passed: boolean;
  created_at: string;
};

async function getCurrentUserId(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
}

function isProgressStatus(status: string): status is ProgressStatus {
  return status === "chua-hoc" || status === "dang-hoc" || status === "hoan-thanh";
}

function buildExtraLessonView(
  lesson: ExtraSkillLessonEnrollment,
  progressStatus?: string,
): ExtraSkillLessonView {
  const lessonModule = getLearningModuleById(lesson.moduleId);
  const role = ROLES[lesson.sourceRoleId as RoleId];
  const skillLabel = SKILL_LABELS[lesson.skillSlug] ?? lesson.skillSlug;
  return {
    ...lesson,
    title: lessonModule?.title ?? lesson.moduleId,
    roleLabel: role?.label ?? lesson.sourceRoleId,
    skillLabel,
    summary: lessonModule?.summary ?? "",
    status: normalizeExtraLessonStatus(progressStatus),
    module: lessonModule,
  };
}

function toDemoProfile(row: ProfileRow): DemoProfile | null {
  if (!row.role_id) return null;

  const assessment = row.assessment_result as AssessmentResult | null;
  return {
    roleId: row.role_id,
    assessment: assessment ?? undefined,
    dailyTasks: row.daily_tasks ?? assessment?.dailyTasks ?? [],
    learningProfile: parseLearningProfile(row.learning_profile),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function getEmployeeProfile(): Promise<DemoProfile | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role_id, assessment_result, daily_tasks, ai_level, learning_profile, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? toDemoProfile(data as ProfileRow) : null;
}

export async function saveEmployeeProfile(
  profile: DemoProfile,
  options?: { assessmentAnswers?: AssessmentAnswer[] },
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Chưa có phiên đăng nhập Supabase.");

  const supabase = createSupabaseBrowserClient();
  const learningProfile = profile.learningProfile ?? {
    preferredAddress: "neutral" as const,
  };
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role_id: profile.roleId,
      assessment_result: profile.assessment ?? null,
      daily_tasks: profile.dailyTasks ?? profile.assessment?.dailyTasks ?? [],
      ai_level: profile.assessment?.aiLevel ?? null,
      learning_profile: learningProfile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) throw error;

  if (profile.assessment && options?.assessmentAnswers) {
    const { error: resultError } = await supabase
      .from("onboarding_assessment_results")
      .insert({
        user_id: userId,
        ...buildOnboardingAssessmentResultInsert({
          roleId: profile.roleId,
          answers: options.assessmentAnswers,
          result: profile.assessment,
        }),
      });

    if (resultError) throw resultError;
  }

  try {
    await fetch("/api/member/sync-department", { method: "POST" });
  } catch (syncError) {
    console.warn("[employee-profile:department-sync]", syncError);
  }
}

export async function getEmployeeExtraLessons(): Promise<ExtraSkillLessonView[]> {
  if (!isSupabaseConfigured()) {
    return getDemoExtraLessons().map((lesson) =>
      buildExtraLessonView(
        lesson as ExtraSkillLessonEnrollment,
        getDemoProgress()[lesson.moduleId],
      ),
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = createSupabaseBrowserClient();
  try {
    const [{ data, error }, { data: progressData }] = await Promise.all([
      supabase
        .from("extra_skill_lessons")
        .select("module_id, skill_slug, source_role_id, enrolled_at")
        .eq("user_id", userId)
        .order("enrolled_at", { ascending: false }),
      supabase
        .from("module_progress")
        .select("module_id, status")
        .eq("user_id", userId),
    ]);

    if (error) throw error;

    const progress = new Map(
      ((progressData ?? []) as ProgressRow[]).map((row) => [row.module_id, row.status]),
    );

    return ((data ?? []) as ExtraLessonRow[]).map((row) =>
      buildExtraLessonView(
        {
          moduleId: row.module_id,
          skillSlug: row.skill_slug,
          sourceRoleId: row.source_role_id as RoleId,
          enrolledAt: row.enrolled_at,
        },
        progress.get(row.module_id),
      ),
    );
  } catch (error) {
    console.warn("[employee-extra-lessons:get]", error);
    return [];
  }
}

function mapExtraSkillLessonDbError(error: unknown): Error {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : String(error);

  if (message.includes("extra_skill_lesson_limit_exceeded")) {
    return new Error("Đã đạt giới hạn 5 bài học thêm.");
  }
  if (message.includes("extra_skill_lesson_same_role")) {
    return new Error("Bài này thuộc lộ trình chính, không thêm vào Kỹ năng khác.");
  }
  if (message.includes("extra_skill_lesson_profile_role_missing")) {
    return new Error(
      "Chưa chọn vai trò. Hoàn thành onboarding trước khi thêm bài Kỹ năng khác.",
    );
  }
  if (
    message.includes("extra_skill_lesson_module_not_found") ||
    message.includes("extra_skill_lesson_role_mismatch")
  ) {
    return new Error("Bài học không tồn tại trong catalog.");
  }

  return error instanceof Error ? error : new Error(message);
}

export async function saveEmployeeExtraLesson(
  lesson: ExtraSkillLessonEnrollment,
): Promise<ExtraSkillLessonView[]> {
  if (!isSupabaseConfigured()) {
    const userRoleId = getDemoProfile()?.roleId as RoleId | undefined;
    const currentLessons = getDemoExtraLessons().map((item) => ({
      moduleId: item.moduleId,
      skillSlug: item.skillSlug,
      sourceRoleId: item.sourceRoleId as RoleId,
      enrolledAt: item.enrolledAt,
    }));
    validateExtraSkillLessonEnrollment(userRoleId, lesson, currentLessons);
    saveDemoExtraLesson({
      moduleId: lesson.moduleId,
      skillSlug: lesson.skillSlug,
      sourceRoleId: lesson.sourceRoleId,
      enrolledAt: lesson.enrolledAt,
    });
    return getEmployeeExtraLessons();
  }

  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Chưa có phiên đăng nhập Supabase.");

  const profileRoleResult = await createSupabaseBrowserClient()
    .from("profiles")
    .select("role_id")
    .eq("id", userId)
    .maybeSingle();
  const userRoleId = profileRoleResult.data?.role_id as RoleId | null | undefined;

  const currentLessons = (await getEmployeeExtraLessons()).map((item) => ({
    moduleId: item.moduleId,
    skillSlug: item.skillSlug,
    sourceRoleId: item.sourceRoleId,
    enrolledAt: item.enrolledAt,
  }));
  validateExtraSkillLessonEnrollment(userRoleId, lesson, currentLessons);

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("extra_skill_lessons").upsert(
    {
      user_id: userId,
      module_id: lesson.moduleId,
      skill_slug: lesson.skillSlug,
      source_role_id: lesson.sourceRoleId,
      enrolled_at: lesson.enrolledAt,
    },
    { onConflict: "user_id,module_id" },
  );

  if (error) throw mapExtraSkillLessonDbError(error);
  return getEmployeeExtraLessons();
}

export async function getEmployeeProgress(): Promise<DemoProgress> {
  const userId = await getCurrentUserId();
  if (!userId) return {};

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("user_id", userId);

  if (error) throw error;

  return ((data ?? []) as ProgressRow[]).reduce<DemoProgress>((acc, row) => {
    if (isProgressStatus(row.status)) {
      acc[row.module_id] = row.status;
    }
    return acc;
  }, {});
}

export async function saveEmployeeModuleStatus(
  moduleId: string,
  status: ProgressStatus,
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Chưa có phiên đăng nhập Supabase.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("module_progress").upsert(
    {
      user_id: userId,
      module_id: moduleId,
      status,
      completed_at: status === "hoan-thanh" ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,module_id" },
  );

  if (error) throw error;
}

export async function getEmployeeTimeLogs(): Promise<DemoTimeLog[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("time_logs")
    .select("id, hours_saved, usefulness, note, logged_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as TimeLogRow[]).map((row) => ({
    id: row.id,
    hoursSaved: Number(row.hours_saved),
    usefulness: row.usefulness ?? undefined,
    note: row.note ?? undefined,
    loggedAt: row.logged_at,
  }));
}

export async function addEmployeeTimeLog(
  hoursSaved: number,
  usefulness?: number,
  note?: string,
): Promise<DemoTimeLog[]> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Chưa có phiên đăng nhập Supabase.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("time_logs").insert({
    user_id: userId,
    hours_saved: hoursSaved,
    usefulness: usefulness ?? null,
    note: note || null,
  });

  if (error) throw error;
  return getEmployeeTimeLogs();
}

export async function getEmployeeQuizResults(): Promise<DemoQuizResult[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("quiz_results")
    .select("id, role_id, score, passed, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as QuizResultRow[]).map((row) => ({
    id: row.id,
    roleId: row.role_id,
    score: row.score,
    passed: row.passed,
    createdAt: row.created_at,
  }));
}

export async function addEmployeeQuizResult(
  roleId: string,
  score: number,
): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Chưa có phiên đăng nhập Supabase.");

  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.from("quiz_results").insert({
    user_id: userId,
    role_id: roleId,
    score,
  });

  if (error) throw error;
}
