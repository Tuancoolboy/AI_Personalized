// Đọc bài học từ Supabase hoặc fallback file tĩnh.

import {
  getLearningModuleById,
  getLearningModulesByRole,
  type LearningModuleRecord,
  type ModuleSection,
} from "@/lib/learning-modules-data";
import type { AttachedFile, RubricCriterion } from "@/lib/roles";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export type { LearningModuleRecord, ModuleSection };

type DbRow = {
  id: string;
  role_id: string;
  title: string;
  duration_min: number;
  level: number;
  sort_order: number;
  summary: string;
  content: string;
  learnings: string[];
  sections: ModuleSection[];
  practice_prompt: string;
  tool?: string | null;
  attached_file?: AttachedFile | null;
};

function mapRow(row: DbRow): LearningModuleRecord {
  // Rubric chưa có cột riêng trong DB (thêm dần) → lấy từ data tĩnh theo id.
  // tool: ưu tiên cột DB (migration 0017), fallback data tĩnh.
  const staticMod = getLearningModuleById(row.id);
  const rubric: RubricCriterion[] = staticMod?.rubric ?? [];
  return {
    id: row.id,
    role_id: row.role_id,
    title: row.title,
    duration_min: row.duration_min,
    level: row.level as 1 | 2 | 3,
    sort_order: row.sort_order,
    summary: row.summary,
    content: row.content,
    learnings: row.learnings ?? [],
    sections: row.sections ?? [],
    practice_prompt: row.practice_prompt ?? "",
    tool: row.tool ?? staticMod?.tool ?? null,
    toolReason: staticMod?.toolReason ?? null,
    rubric,
    attached_file: row.attached_file ?? staticMod?.attached_file ?? null,
  };
}

export async function fetchModulesForRole(
  roleId: string,
  aiLevel = 0,
): Promise<LearningModuleRecord[]> {
  if (!isSupabaseConfigured()) {
    return getLearningModulesByRole(roleId, aiLevel);
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("role_id", roleId)
      .order("sort_order", { ascending: true });

    if (error || !data?.length) {
      return getLearningModulesByRole(roleId, aiLevel);
    }

    let list = data.map((row) => mapRow(row as DbRow));
    if (aiLevel >= 5) {
      list = list.filter((m) => m.level >= 2);
    }
    return list;
  } catch {
    return getLearningModulesByRole(roleId, aiLevel);
  }
}

export async function fetchModuleById(
  moduleId: string,
): Promise<LearningModuleRecord | null> {
  if (!isSupabaseConfigured()) {
    return getLearningModuleById(moduleId);
  }

  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase
      .from("learning_modules")
      .select("*")
      .eq("id", moduleId)
      .maybeSingle();

    if (error || !data) {
      return getLearningModuleById(moduleId);
    }
    return mapRow(data as DbRow);
  } catch {
    return getLearningModuleById(moduleId);
  }
}
