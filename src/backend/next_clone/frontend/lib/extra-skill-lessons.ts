import type { RoleId } from "@/lib/openai";
import {
  getLearningModuleById,
  type LearningModuleRecord,
} from "@/lib/learning-modules-data";
import { ROLES, SKILL_LABELS, type RoleModule } from "@/lib/roles";

export const EXTRA_SKILL_LESSON_LIMIT = 5;

export type ExtraSkillLessonCatalogItem = {
  moduleId: string;
  title: string;
  roleId: RoleId;
  roleLabel: string;
  skillSlug: string;
  skillLabel: string;
  summary: string;
};

export type ExtraSkillLessonEnrollment = {
  moduleId: string;
  skillSlug: string;
  sourceRoleId: RoleId;
  enrolledAt: string;
};

export type ExtraSkillLessonView = ExtraSkillLessonEnrollment & {
  title: string;
  roleLabel: string;
  skillLabel: string;
  summary: string;
  status: "chua-hoc" | "dang-hoc" | "hoan-thanh";
  module: LearningModuleRecord | null;
};

const VALID_STATUSES = new Set<ExtraSkillLessonView["status"]>([
  "chua-hoc",
  "dang-hoc",
  "hoan-thanh",
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const QUERY_STOPWORDS = new Set([
  "ai",
  "cho",
  "cua",
  "dung",
  "giam",
  "gi",
  "giup",
  "hoc",
  "lam",
  "lien",
  "moi",
  "muon",
  "nao",
  "nay",
  "nen",
  "noi",
  "phan",
  "sao",
  "the",
  "theo",
  "trong",
  "tu",
  "ve",
  "voi",
]);

function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(" ")
    .filter((token) => token.length >= 5 && !QUERY_STOPWORDS.has(token));
}

function getCatalogItemsForRole(roleId: RoleId): ExtraSkillLessonCatalogItem[] {
  const role = ROLES[roleId];
  if (!role) return [];

  const items: ExtraSkillLessonCatalogItem[] = [];
  for (const [sourceRoleId, sourceRole] of Object.entries(ROLES)) {
    if (sourceRoleId === roleId) continue;
    for (const lessonModule of sourceRole.modules as RoleModule[]) {
      const firstSkill = lessonModule.skills?.find(Boolean);
      if (!firstSkill) continue;
      const staticModule = getLearningModuleById(lessonModule.id);
      const summary = staticModule?.summary ?? lessonModule.content;
      items.push({
        moduleId: lessonModule.id,
        title: lessonModule.title,
        roleId: sourceRoleId as RoleId,
        roleLabel: sourceRole.label,
        skillSlug: firstSkill,
        skillLabel: SKILL_LABELS[firstSkill] ?? firstSkill,
        summary,
      });
    }
  }

  return items;
}

function scoreCatalogItem(query: string, item: ExtraSkillLessonCatalogItem): number {
  const normalizedQuery = normalizeText(query);
  const normalizedTitle = normalizeText(item.title);
  const normalizedSkillLabel = normalizeText(item.skillLabel);
  const normalizedRoleLabel = normalizeText(item.roleLabel);
  const normalizedSummary = normalizeText(item.summary);
  const tokens = tokenizeQuery(query);

  if (!tokens.length) {
    return 0;
  }

  let score = 0;
  const titleMatches = normalizedTitle.includes(normalizedQuery) || tokens.some((token) => normalizedTitle.includes(token));
  const skillMatches = normalizedSkillLabel.includes(normalizedQuery) || tokens.some((token) => normalizedSkillLabel.includes(token));

  if (!titleMatches && !skillMatches) {
    return 0;
  }

  if (normalizedTitle.includes(normalizedQuery)) score += 8;
  if (normalizedSkillLabel.includes(normalizedQuery)) score += 7;
  if (normalizedTitle.includes(normalizedSkillLabel)) score += 4;
  if (normalizedSkillLabel.includes(normalizedTitle)) score += 4;
  for (const token of tokens) {
    if (normalizedTitle.includes(token)) score += 6;
    if (normalizedSkillLabel.includes(token)) score += 6;
    if (normalizedSummary.includes(token)) score += 2;
    if (normalizedRoleLabel.includes(token)) score += 1;
  }
  return score;
}

export function findExtraSkillLessonForQuery(
  roleId: RoleId,
  query: string,
): ExtraSkillLessonCatalogItem | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const candidates = getCatalogItemsForRole(roleId)
    .map((item) => ({ item, score: scoreCatalogItem(trimmed, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.item ?? null;
}

export function formatExtraSkillLessonLink(
  item: ExtraSkillLessonCatalogItem,
): string {
  return `[${item.title}](/lo-trinh/${item.moduleId}?extra=1)`;
}

export function validateExtraSkillLessonEnrollment(
  userRoleId: RoleId | null | undefined,
  lesson: ExtraSkillLessonEnrollment,
  currentLessons: ExtraSkillLessonEnrollment[],
): void {
  if (!userRoleId) {
    throw new Error(
      "Chưa chọn vai trò. Hoàn thành onboarding trước khi thêm bài Kỹ năng khác.",
    );
  }

  const lessonModule = getLearningModuleById(lesson.moduleId);
  if (!lessonModule) {
    throw new Error("Bài học không tồn tại trong catalog.");
  }
  if (lessonModule.role_id !== lesson.sourceRoleId) {
    throw new Error("Dữ liệu bài học không khớp nguồn role.");
  }
  if (lessonModule.role_id === userRoleId) {
    throw new Error("Bài này thuộc lộ trình chính, không thêm vào Kỹ năng khác.");
  }

  const existing = currentLessons.find((item) => item.moduleId === lesson.moduleId);
  const nextCount = existing ? currentLessons.length : currentLessons.length + 1;
  if (!existing && nextCount > EXTRA_SKILL_LESSON_LIMIT) {
    throw new Error("Đã đạt giới hạn 5 bài học thêm.");
  }
}

export function formatExtraSkillLessonAnswer(
  roleId: RoleId,
  query: string,
): string | null {
  const item = findExtraSkillLessonForQuery(roleId, query);
  if (!item) return null;

  return [
    `Có một bài phù hợp trong bộ kỹ năng của hệ thống, nhưng nó không nằm trong lộ trình chính của ${ROLES[roleId]?.shortLabel ?? roleId}.`,
    `Em gợi ý học bài ${formatExtraSkillLessonLink(item)} thuộc kỹ năng **${item.skillLabel}** của ${item.roleLabel}.`,
    "Đây sẽ được lưu ở section **Kỹ năng khác** sau khi bạn xác nhận học.",
  ].join("\n\n");
}

export function buildExtraSkillLessonsPromptContext(
  roleId: RoleId,
  query: string,
  enrolledCount = 0,
  enrolledLessons: Array<{ moduleId: string; title: string; skillLabel: string }> = [],
): string {
  const candidate = findExtraSkillLessonForQuery(roleId, query);
  const lines: string[] = [
    `Giới hạn Kỹ năng khác: ${Math.min(enrolledCount, EXTRA_SKILL_LESSON_LIMIT)}/${EXTRA_SKILL_LESSON_LIMIT}`,
  ];

  if (enrolledLessons.length > 0) {
    lines.push("Các bài Kỹ năng khác đã lưu:");
    for (const lesson of enrolledLessons.slice(0, EXTRA_SKILL_LESSON_LIMIT)) {
      lines.push(
        `- [${lesson.title}](/lo-trinh/${lesson.moduleId}?extra=1) — ${lesson.skillLabel}`,
      );
    }
  }

  if (candidate) {
    lines.push(
      `Bài đang khớp câu hỏi hiện tại: [${candidate.title}](/lo-trinh/${candidate.moduleId}?extra=1) — ${candidate.skillLabel} (${candidate.roleLabel}).`,
    );
    lines.push(
      "Quy tắc cho bài học thêm: đây là một bài độc lập trong section Kỹ năng khác, không có nút Bài tiếp theo mặc định trong lộ trình chính. Khi user hỏi tiếp theo, không suy diễn sang module của role khác; chỉ nói bài này là bài học thêm riêng và nếu cần thì gợi ý 1 bài Kỹ năng khác liên quan khác trong catalog.",
    );
  }

  lines.push(
    "Quy tắc: chỉ gợi ý bài có thật trong catalog hệ thống; không link sang lộ trình tổng của role khác; nếu user chưa xác nhận thì hỏi một câu ngắn để thêm vào Kỹ năng khác.",
  );

  return lines.join("\n");
}

export function normalizeExtraLessonStatus(
  status: string | null | undefined,
): ExtraSkillLessonView["status"] {
  return VALID_STATUSES.has(status as ExtraSkillLessonView["status"])
    ? (status as ExtraSkillLessonView["status"])
    : "dang-hoc";
}
