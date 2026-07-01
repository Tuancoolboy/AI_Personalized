import { buildExtraSkillLessonsPromptContext, type ExtraSkillLessonEnrollment } from "@/lib/extra-skill-lessons";
import { getLearningModuleById } from "@/lib/learning-modules-data";
import { ROLES, SKILL_LABELS } from "@/lib/roles";
import { type RoleId } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExtraLessonRow = {
  module_id: string;
  skill_slug: string;
  source_role_id: string;
  enrolled_at: string;
};

async function loadExtraLessonRows(userId: string): Promise<ExtraSkillLessonEnrollment[]> {
  const supabase = await createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from("extra_skill_lessons")
      .select("module_id, skill_slug, source_role_id, enrolled_at")
      .eq("user_id", userId)
      .order("enrolled_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as ExtraLessonRow[]).map((row) => ({
      moduleId: row.module_id,
      skillSlug: row.skill_slug,
      sourceRoleId: row.source_role_id as RoleId,
      enrolledAt: row.enrolled_at,
    }));
  } catch (error) {
    console.warn("[chat-knowledge-extra] extra_skill_lessons:", error);
    return [];
  }
}

export async function buildExtraSkillLessonsContext(
  userId: string,
  roleId: RoleId,
  query: string,
): Promise<string> {
  const lessons = await loadExtraLessonRows(userId);
  const enrolledLessons = lessons
    .map((lesson) => {
      const mod = getLearningModuleById(lesson.moduleId);
      return {
        moduleId: lesson.moduleId,
        title: mod?.title ?? lesson.moduleId,
        skillLabel: SKILL_LABELS[lesson.skillSlug] ?? lesson.skillSlug,
      };
    })
    .filter((lesson) => Boolean(lesson.title));

  return buildExtraSkillLessonsPromptContext(
    roleId,
    query,
    lessons.length,
    enrolledLessons,
  );
}

export async function countExtraSkillLessons(userId: string): Promise<number> {
  const lessons = await loadExtraLessonRows(userId);
  return lessons.length;
}

export async function listExtraSkillLessons(
  userId: string,
): Promise<ExtraSkillLessonEnrollment[]> {
  return loadExtraLessonRows(userId);
}

export function getExtraSkillLessonDisplayLabel(roleId: RoleId): string {
  return ROLES[roleId]?.shortLabel ?? roleId;
}
