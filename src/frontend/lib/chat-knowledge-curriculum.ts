import {
  getLearningModuleById,
  getLearningModulesByRole,
  type LearningModuleRecord,
} from "@/lib/learning-modules-data";
import type { RoleId } from "@/lib/openai";
import { getRole, ROLES } from "@/lib/roles";
import {
  resolveResumeLesson,
  type ResumeLesson,
} from "@/lib/resume-lesson";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  loadOrganizationLearningContext,
  type AssignedPathModuleHint,
  type OrganizationLearningContext,
} from "@/lib/chat-knowledge-company";

const STATUS_LABEL: Record<string, string> = {
  "chua-hoc": "chưa học",
  "dang-hoc": "đang học",
  "hoan-thanh": "hoàn thành",
};

function truncate(text: string, maxLen: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function normalizeTokens(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ");

  const tokens: string[] = [];
  const seen = new Set<string>();
  let current = "";

  const pushToken = () => {
    const token = current.trim();
    current = "";
    if (token.length < 3 || seen.has(token)) return;
    seen.add(token);
    tokens.push(token);
  };

  for (const ch of normalized) {
    if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") {
      pushToken();
      continue;
    }
    current += ch;
  }
  pushToken();

  return tokens;
}

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

type ModuleSearchIndex = {
  mod: LearningModuleRecord;
  fingerprint: string;
  title: string;
  summary: string;
  content: string;
  sizePenalty: number;
};

// Module catalog is bounded (~100 entries); simple id+fingerprint cache is enough.
const MODULE_SEARCH_INDEX_CACHE = new Map<string, ModuleSearchIndex>();

function moduleSearchFingerprint(mod: LearningModuleRecord): string {
  return [
    mod.title,
    mod.summary,
    mod.content,
    mod.practice_prompt,
    String(mod.sections.length),
    String(mod.learnings.length),
  ].join("\0");
}

function buildModuleSearchIndex(mod: LearningModuleRecord): ModuleSearchIndex {
  const fingerprint = moduleSearchFingerprint(mod);
  const cached = MODULE_SEARCH_INDEX_CACHE.get(mod.id);
  if (cached && cached.fingerprint === fingerprint) {
    return cached;
  }

  const index: ModuleSearchIndex = {
    mod,
    fingerprint,
    title: normalizeForMatch(mod.title),
    summary: normalizeForMatch(mod.summary),
    content: normalizeForMatch(
      [
        mod.content,
        mod.practice_prompt,
        ...mod.sections.map((section) => `${section.title}\n${section.body}`),
        ...mod.learnings,
      ].join("\n"),
    ),
    sizePenalty: Math.max(
      1,
      Math.sqrt((mod.title.length + mod.summary.length + mod.content.length) / 120),
    ),
  };

  MODULE_SEARCH_INDEX_CACHE.set(mod.id, index);
  return index;
}

function scoreModuleForQuery(
  index: ModuleSearchIndex,
  tokens: string[],
): number {
  if (tokens.length === 0) return 0;

  let score = 0;
  for (const token of tokens) {
    if (index.title.includes(token)) {
      score += 4;
      continue;
    }
    if (index.summary.includes(token)) {
      score += 2;
      continue;
    }
    if (index.content.includes(token)) {
      score += 1;
    }
  }

  return score / index.sizePenalty;
}

function moduleFromAssignedHint(
  hint: AssignedPathModuleHint,
): LearningModuleRecord {
  const existing = getLearningModuleById(hint.id);
  if (existing) return existing;
  return {
    id: hint.id,
    role_id: "khac",
    title: hint.title,
    duration_min: 10,
    level: hint.level,
    sort_order: 0,
    summary: hint.title,
    content: "",
    learnings: [],
    sections: [],
    practice_prompt: "",
    tool: null,
    toolReason: null,
    rubric: [],
    attached_file: null,
  };
}

export function mergeModulesWithAssigned(
  roleModules: LearningModuleRecord[],
  assignedPathModules: AssignedPathModuleHint[],
): LearningModuleRecord[] {
  if (assignedPathModules.length === 0) return roleModules;

  const byId = new Map<string, LearningModuleRecord>();
  for (const hint of assignedPathModules) {
    byId.set(hint.id, moduleFromAssignedHint(hint));
  }
  for (const mod of roleModules) {
    if (!byId.has(mod.id)) byId.set(mod.id, mod);
  }

  const assignedIds = new Set(assignedPathModules.map((m) => m.id));
  const assignedFirst = assignedPathModules
    .map((hint) => byId.get(hint.id))
    .filter((mod): mod is LearningModuleRecord => Boolean(mod));
  const rest = roleModules.filter((mod) => !assignedIds.has(mod.id));
  return [...assignedFirst, ...rest];
}

function formatRelevantModuleLine(
  mod: LearningModuleRecord,
  status: string,
): string {
  const levelLabel =
    mod.level === 1 ? "Nhập môn" : mod.level === 2 ? "Trung cấp" : "Nâng cao";
  return `- [${STATUS_LABEL[status] ?? status}] [${mod.title}](/lo-trinh/${mod.id}) (${levelLabel}) — ${truncate(mod.summary, 140)}`;
}

function formatModuleLine(
  mod: LearningModuleRecord,
  status: string,
  isFocus: boolean,
  isRequired = false,
): string {
  const levelLabel =
    mod.level === 1 ? "Nhập môn" : mod.level === 2 ? "Trung cấp" : "Nâng cao";
  const requiredLabel = isRequired ? " | bắt buộc" : "";
  let line = `- [${STATUS_LABEL[status] ?? status}] [${mod.title}](/lo-trinh/${mod.id}) (${levelLabel}, ~${mod.duration_min} phút)${requiredLabel}`;
  if (isFocus) {
    line += `\n  Tóm tắt: ${truncate(mod.summary, 220)}`;
    const section = mod.sections[1]?.body ?? mod.sections[0]?.body;
    if (section) {
      line += `\n  Nội dung chính: ${truncate(section, 280)}`;
    }
    if (mod.practice_prompt) {
      line += `\n  Prompt thực hành: ${truncate(mod.practice_prompt, 160)}`;
    }
  }
  return line;
}

export type CurriculumContextInput = {
  roleId: RoleId;
  aiLevel: number;
  progressByModuleId: Record<string, string>;
  assignedPathTitle: string | null;
  modules: LearningModuleRecord[];
  assignedPathModules?: AssignedPathModuleHint[];
  query?: string | null;
};

export function formatCurriculumKnowledgeBlock(
  input: CurriculumContextInput,
): string {
  const role = getRole(input.roleId);
  const requiredById = new Map(
    (input.assignedPathModules ?? []).map((mod) => [mod.id, mod.isRequired]),
  );
  const lines: string[] = [
    `Lộ trình vai trò: ${role?.label ?? input.roleId} (global)`,
    `Cấp AI (assessment): ${input.aiLevel}/5`,
  ];

  if (input.assignedPathTitle) {
    lines.push(`Lộ trình công ty đang gán: ${input.assignedPathTitle}`);
  }

  lines.push("", "Danh sách module (nguồn chính thức — không bịa module ngoài list):");
  const focusId =
    Object.entries(input.progressByModuleId).find(([, s]) => s === "dang-hoc")?.[0] ??
    input.modules.find((m) => input.progressByModuleId[m.id] !== "hoan-thanh")?.id ??
    input.modules[0]?.id;

  for (const mod of input.modules) {
    const status = input.progressByModuleId[mod.id] ?? "chua-hoc";
    lines.push(
      formatModuleLine(
        mod,
        status,
        mod.id === focusId,
        requiredById.get(mod.id) ?? false,
      ),
    );
  }

  const starter = ROLES[input.roleId]?.starterKit;
  if (starter?.prompts.length) {
    lines.push("", "Starter kit (prompt mẫu đã thiết kế):");
    for (const prompt of starter.prompts.slice(0, 3)) {
      lines.push(`- ${prompt.title}: ${truncate(prompt.prompt, 120)}`);
    }
  }

  if (starter?.tools.length) {
    lines.push(`Công cụ gợi ý: ${starter.tools.slice(0, 5).join(", ")}`);
  }

  const query = input.query?.trim();
  if (query) {
    const tokens = normalizeTokens(query);
    const indexedModules = input.modules.map(buildModuleSearchIndex);
    const relevant = indexedModules
      .map((index) => ({
        mod: index.mod,
        score: scoreModuleForQuery(index, tokens),
        status: input.progressByModuleId[index.mod.id] ?? "chua-hoc",
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (relevant.length > 0) {
      lines.push("", "Liên quan câu hỏi hiện tại:");
      for (const item of relevant) {
        lines.push(formatRelevantModuleLine(item.mod, item.status));
      }
    }
  }

  return lines.join("\n");
}

export function buildDemoCurriculumKnowledgeContext(
  roleId: RoleId,
  query: string | null = null,
): string {
  const modules = getLearningModulesByRole(roleId, 0);
  return formatCurriculumKnowledgeBlock({
    roleId,
    aiLevel: 0,
    progressByModuleId: {},
    assignedPathTitle: null,
    modules,
    query,
  });
}

async function loadCurriculumParts(
  userId: string,
): Promise<{
  aiLevel: number;
  progressByModuleId: Record<string, string>;
}> {
  const supabase = await createSupabaseServerClient();
  const [{ data: profile }, { data: progressRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("ai_level")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("module_progress")
      .select("module_id, status")
      .eq("user_id", userId),
  ]);

  const progressByModuleId: Record<string, string> = {};
  for (const row of progressRows ?? []) {
    progressByModuleId[row.module_id] = row.status;
  }

  return {
    aiLevel: typeof profile?.ai_level === "number" ? profile.ai_level : 0,
    progressByModuleId,
  };
}

function buildCurriculumKnowledgeBlockSync(
  roleId: RoleId,
  learningContext: OrganizationLearningContext,
  query: string | null,
  aiLevel = 0,
  progressByModuleId: Record<string, string> = {},
): string {
  const roleModules = getLearningModulesByRole(roleId, aiLevel);
  const modules = mergeModulesWithAssigned(
    roleModules,
    learningContext.assignedPathModules,
  );

  return formatCurriculumKnowledgeBlock({
    roleId,
    aiLevel,
    progressByModuleId,
    assignedPathTitle: learningContext.assignedPathTitle,
    assignedPathModules: learningContext.assignedPathModules,
    modules,
    query,
  });
}

export async function buildCurriculumKnowledgeContext(
  userId: string,
  roleId: RoleId,
  query: string | null = null,
  learningContext?: OrganizationLearningContext,
): Promise<string> {
  const orgContext =
    learningContext ?? (await loadOrganizationLearningContext(userId));
  const { aiLevel, progressByModuleId } = await loadCurriculumParts(userId);

  return buildCurriculumKnowledgeBlockSync(
    roleId,
    orgContext,
    query,
    aiLevel,
    progressByModuleId,
  );
}

export function getFocusModuleTitle(
  roleId: RoleId,
  progressByModuleId: Record<string, string>,
): string | null {
  return resolveResumeLesson(roleId, progressByModuleId)?.title ?? null;
}

export type { ResumeLesson };
