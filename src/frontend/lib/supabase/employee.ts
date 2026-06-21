// Employee persistence helpers for Supabase real mode.
// Client components call these only when Supabase env vars are configured.

import type { AssessmentAnswer, AssessmentResult } from "@/lib/assessment";
import { buildOnboardingAssessmentResultInsert } from "@/lib/onboarding-assessment-result";
import { parseLearningProfile } from "@/lib/learning-profile";
import type {
  DemoProfile,
  DemoProgress,
  DemoQuizResult,
  DemoTimeLog,
} from "@/lib/demo-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
