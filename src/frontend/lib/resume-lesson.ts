import {
  getLearningModuleById,
  getLearningModulesByRole,
} from "@/lib/learning-modules-data";
import type { RoleId } from "@/lib/openai";

export type ResumeLesson = {
  moduleId: string;
  title: string;
  href: string;
  status: "dang-hoc" | "chua-hoc";
};

/** Bài đang học dở (ưu tiên `dang-hoc`), rồi bài tiếp theo trên lộ trình. */
export function resolveResumeLesson(
  roleId: RoleId,
  progressByModuleId: Record<string, string>,
): ResumeLesson | null {
  const modules = getLearningModulesByRole(roleId, 0);
  if (modules.length === 0) return null;

  const inProgressId = Object.entries(progressByModuleId).find(
    ([, status]) => status === "dang-hoc",
  )?.[0];

  if (inProgressId) {
    const mod = getLearningModuleById(inProgressId);
    if (mod) {
      return {
        moduleId: mod.id,
        title: mod.title,
        href: `/lo-trinh/${mod.id}`,
        status: "dang-hoc",
      };
    }
  }

  const next = modules.find((mod) => progressByModuleId[mod.id] !== "hoan-thanh");
  if (!next) return null;

  return {
    moduleId: next.id,
    title: next.title,
    href: `/lo-trinh/${next.id}`,
    status: "chua-hoc",
  };
}
