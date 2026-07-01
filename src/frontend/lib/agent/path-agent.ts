// Agent sinh lộ trình: gọi OpenAI với CHỈ metadata (chống lộ PII), parse + validate id.
// Lỗi / thiếu key / parse fail → fallback rule-based (demo không crash).
//
// NGUỒN SỰ THẬT engine:
// - Trang `/lo-trinh` → POST `/api/agent/lo-trinh` → `generatePath` (file này).
// - Panel gợi ý → POST `/api/agents/recommender` → `rankModules` (lib/agents/recommender.ts).
// Role + skip-basic dùng chung: `path-agent-eligibility.ts`, `coerceRoleId` trong `role-ids.ts`.

import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/openai";
import { ROLE_LABEL, type RoleId } from "@/lib/openai";
import { SKILL_LABELS } from "@/lib/roles";
import {
  buildCandidatePool,
  findMissingSkills,
} from "./path-agent-catalog";
import { buildFallbackPath } from "./path-agent-fallback";
import { logPathFallback } from "./path-agent-log";
import type {
  AgentFlowInput,
  AgentPathResult,
  AgentRawOutput,
  CandidateModule,
} from "./path-agent-types";
import { MAX_MODULES, validateAgentOutput } from "./path-agent-validate";

function poolForPrompt(pool: CandidateModule[]): string {
  // CHỈ metadata: id, title, level, foundation, skill labels. KHÔNG nội dung/PII.
  return pool
    .map((m) => {
      const skills = m.skills
        .map((s) => SKILL_LABELS[s] ?? s)
        .join(", ");
      return `- ${m.id} | ${m.title} | level ${m.level}${
        m.isFoundation ? " | NỀN TẢNG" : ""
      }${skills ? ` | kỹ năng: ${skills}` : ""}`;
    })
    .join("\n");
}

function buildPrompt(input: AgentFlowInput, pool: CandidateModule[]): string {
  const roleLabel = ROLE_LABEL[input.roleId as RoleId] ?? "nhân viên văn phòng";
  const skillLabels = input.skillSlugs
    .map((s) => SKILL_LABELS[s] ?? s)
    .join(", ");
  const completed = input.completedModuleIds.length
    ? input.completedModuleIds.join(", ")
    : "(chưa hoàn thành bài nào)";
  const gapIds = input.assessmentGapModuleIds.length
    ? input.assessmentGapModuleIds.join(", ")
    : "(không có)";
  const goals = input.goalTags.length
    ? input.goalTags.join(", ")
    : "(chưa khai báo)";
  const companyBlock = [
    input.organizationName ? `- Công ty: ${input.organizationName}` : null,
    input.departmentId
      ? `- Phòng ban: ${ROLE_LABEL[input.departmentId as RoleId] ?? input.departmentId}`
      : null,
    input.assignedPathTitle ? `- Lộ trình đang giao: ${input.assignedPathTitle}` : null,
    input.assignedPathModules?.length
      ? `- Module trong lộ trình công ty: ${input.assignedPathModules
          .map((mod) => `${mod.id} | ${mod.title}`)
          .join("; ")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `Bạn là bộ chọn lộ trình học AI cho ${roleLabel} tại doanh nghiệp Việt Nam.

NHIỆM VỤ: CHỌN và SẮP XẾP bài học TỪ DANH SÁCH dưới đây. TUYỆT ĐỐI KHÔNG bịa id mới — chỉ dùng id có trong danh sách.

ĐẦU VÀO:
- Luồng: ${input.flow === "company" ? "Công ty" : "Cá nhân"}
- Vị trí: ${roleLabel}
- Level AI hiện tại (0-5): ${input.aiLevel}
- Kỹ năng mục tiêu: ${skillLabels || "(theo vị trí)"}
- Bài đã hoàn thành (bỏ qua): ${completed}
- Module ưu tiên lấp lỗ hổng assessment (đưa lên đầu nếu còn phù hợp): ${gapIds}
- Mục tiêu / việc muốn AI hóa (goalTags): ${goals}
${companyBlock ? `${companyBlock}\n` : ""}

DANH SÁCH BÀI (chỉ được chọn id ở đây):
${poolForPrompt(pool)}

QUY TẮC:
1. Ưu tiên bài trong danh sách "lấp lỗ hổng assessment" nếu chưa hoàn thành.
2. Ưu tiên bài NỀN TẢNG, rồi level thấp → cao; cân goalTags khi chọn module kỹ năng.
3. Tối đa ${MAX_MODULES} bài. Bỏ bài đã hoàn thành. Level cao (>=5) bỏ bài nhập môn level 1 (giữ nền tảng).
4. Nếu công ty đã giao lộ trình, ưu tiên giữ thứ tự và module trong lộ trình đó.
5. Nhóm bài theo chủ đề/kỹ năng, mỗi nhóm kèm lý do ngắn.
6. KHÔNG trả rỗng. Nếu một kỹ năng không có bài phù hợp, ghi vào "missingSkills".

TRẢ VỀ JSON đúng cấu trúc:
{
  "summary": "tóm tắt lộ trình 1-2 câu",
  "groups": [{"title": "...", "reason": "...", "moduleIds": ["id1","id2"]}],
  "missingSkills": ["tên kỹ năng chưa có bài"]
}`;
}

function fallback(
  input: AgentFlowInput,
  fingerprint: string,
  reason: Parameters<typeof logPathFallback>[0],
  extra?: { errorName?: string },
): AgentPathResult {
  logPathFallback(reason, input, extra);
  return buildFallbackPath(input, fingerprint);
}

export async function generatePath(
  input: AgentFlowInput,
  fingerprint: string,
): Promise<AgentPathResult> {
  const pool = buildCandidatePool(input);

  if (!isOpenAIConfigured()) {
    return fallback(input, fingerprint, "no-key");
  }
  const client = getOpenAIClient();
  if (!client) return fallback(input, fingerprint, "no-client");

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.2,
      max_tokens: 900,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Bạn trả về JSON hợp lệ, tiếng Việt." },
        { role: "user", content: buildPrompt(input, pool) },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return fallback(input, fingerprint, "empty-content");

    let raw: AgentRawOutput;
    try {
      raw = JSON.parse(content) as AgentRawOutput;
    } catch {
      return fallback(input, fingerprint, "parse-fail");
    }

    const validated = validateAgentOutput(raw, pool, input);
    if (validated.orderedModuleIds.length === 0) {
      return fallback(input, fingerprint, "empty-output");
    }

    const declaredMissing = Array.isArray(raw.missingSkills)
      ? raw.missingSkills.filter((x): x is string => typeof x === "string")
      : [];
    const detectedMissing = findMissingSkills(input.skillSlugs).map(
      (slug) => SKILL_LABELS[slug] ?? slug,
    );
    const missingSkills = [...new Set([...detectedMissing, ...declaredMissing])];

    return {
      source: "agent",
      flow: input.flow,
      summary:
        typeof raw.summary === "string" && raw.summary.trim()
          ? raw.summary.trim()
          : "Lộ trình học AI cá nhân hóa theo vị trí và level của bạn.",
      groups: validated.groups,
      orderedModuleIds: validated.orderedModuleIds,
      missingSkills,
      fingerprint,
    };
  } catch (err) {
    const errorName = err instanceof Error ? err.name : "Error";
    console.error("[path-agent]", err);
    return fallback(input, fingerprint, "exception", { errorName });
  }
}
