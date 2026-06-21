import type { AgentCapability } from "@/lib/agents/types";
import {
  GRADER_RUBRIC_VERSION,
  normalizeGradingResult,
  type GradingResult,
  type RawGraderPayload,
  type PracticeImagePayload,
} from "@/lib/agents/grader-types";
import type { LearningModuleRecord } from "@/lib/learning-modules-data";
import {
  ROLE_LABEL,
  getOpenAIClient,
  getOpenAIModel,
  type RoleId,
} from "@/lib/openai";

export type PracticalGraderInput = {
  kind: "practical-image";
  roleId: RoleId;
  module: Pick<
    LearningModuleRecord,
    "title" | "summary" | "practice_prompt" | "learnings"
  >;
  images: PracticeImagePayload[];
};

export type OpenTextGraderInput = {
  kind: "open-text";
  roleId: RoleId;
  prompt: string;
  answer: string;
  moduleTitle?: string;
};

export type GraderInput = PracticalGraderInput | OpenTextGraderInput;

export type GraderOutput = {
  result: GradingResult;
};

export function buildPracticalGraderPrompt(
  roleId: RoleId,
  mod: PracticalGraderInput["module"],
): string {
  const label = ROLE_LABEL[roleId] ?? ROLE_LABEL.khac;
  const learnings = mod.learnings.map((l) => `- ${l}`).join("\n");

  return `Bạn là Agent 2 — chấm bài thực hành AI cho ${label} tại doanh nghiệp Việt Nam.

BÀI HỌC: ${mod.title}
TÓM TẮT: ${mod.summary}
PROMPT MẪU:
${mod.practice_prompt || "(không có prompt cố định)"}

ĐIỂM CẦN ĐẠT:
${learnings}

RUBRIC (${GRADER_RUBRIC_VERSION}):
- 40đ: Đã dùng AI / nội dung liên quan bài học
- 30đ: Phù hợp vai trò ${label}
- 20đ: Có chỉnh sửa / cá nhân hóa
- 10đ: Hướng tới dùng được trong công việc

NGUYÊN TẮC:
1. Tiếng Việt đời thường, khích lệ.
2. Ảnh mờ → score 40–55, confidence thấp (~0.5).
3. Ảnh không liên quan → score 20–40.
4. KHÔNG bịa chi tiết không thấy trong ảnh.
5. evidence: trích dẫn ngắn những gì bạn thực sự thấy trong ảnh.
6. confidence: 0–1 phản ánh mức chắc chắn của bạn.

Trả JSON với các field: score, feedback, rubricBreakdown[{criterion,points,maxPoints,note}], evidence[], strengths[], improvements[], confidence.`;
}

export async function gradePracticalImages(
  input: PracticalGraderInput,
): Promise<GradingResult | null> {
  const client = getOpenAIClient();
  if (!client || input.images.length === 0) return null;

  const model = getOpenAIModel();
  const systemPrompt = buildPracticalGraderPrompt(input.roleId, input.module);
  const imageCount = input.images.length;
  const userText =
    imageCount === 1
      ? "Ảnh kết quả thực hành — chấm theo rubric và trả JSON."
      : `${imageCount} ảnh kết quả thực hành — chấm tổng thể và trả JSON.`;

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          ...input.images.map((img) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${img.mimeType};base64,${img.base64}`,
              detail: "low" as const,
            },
          })),
        ],
      },
    ],
    max_tokens: 900,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as RawGraderPayload;
    return normalizeGradingResult(parsed, model);
  } catch {
    return null;
  }
}

export function buildOpenTextGraderPrompt(
  roleId: RoleId,
  prompt: string,
  moduleTitle?: string,
): string {
  const label = ROLE_LABEL[roleId] ?? ROLE_LABEL.khac;
  return `Bạn là Agent 2 — chấm bài tự luận AI cho ${label} tại doanh nghiệp Việt Nam.

${moduleTitle ? `BÀI HỌC: ${moduleTitle}\n` : ""}CÂU HỎI / YÊU CẦU:
${prompt}

RUBRIC (${GRADER_RUBRIC_VERSION}) — tổng 100đ:
- 35đ: Trả lời đúng trọng tâm câu hỏi
- 30đ: Ví dụ / nội dung sát công việc ${label}
- 20đ: Cấu trúc rõ, có thể áp dụng
- 15đ: An toàn dữ liệu (không lộ thông tin nhạy cảm)

NGUYÊN TẮC:
1. Tiếng Việt đời thường, khích lệ.
2. evidence: trích dẫn ngắn từ câu trả lời (không bịa).
3. confidence: 0–1 — thấp nếu câu trả lời quá ngắn/mơ hồ.

Trả JSON: score, feedback, rubricBreakdown[], evidence[], strengths[], improvements[], confidence.`;
}

export async function gradeOpenTextAnswer(
  input: OpenTextGraderInput,
): Promise<GradingResult | null> {
  const client = getOpenAIClient();
  const answer = input.answer.trim();
  if (!client || answer.length < 20) return null;

  const model = getOpenAIModel();
  const systemPrompt = buildOpenTextGraderPrompt(
    input.roleId,
    input.prompt,
    input.moduleTitle,
  );

  const response = await client.chat.completions.create({
    model,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Câu trả lời của học viên:\n\n${answer.slice(0, 6000)}`,
      },
    ],
    max_tokens: 900,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as RawGraderPayload;
    return normalizeGradingResult(parsed, model);
  } catch {
    return null;
  }
}

export const assignmentGraderAgent: AgentCapability<GraderInput, GraderOutput> = {
  name: "grader",
  async execute(input) {
    if (input.kind === "open-text") {
      const result = await gradeOpenTextAnswer(input);
      if (!result) throw new Error("Không chấm được bài tự luận.");
      return { result };
    }
    if (input.kind === "practical-image") {
      const result = await gradePracticalImages(input);
      if (!result) throw new Error("Không chấm được bài thực hành.");
      return { result };
    }
    throw new Error("Loại bài nộp không hợp lệ.");
  },
};
