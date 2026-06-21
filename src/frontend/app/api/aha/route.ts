// API Aha Moment: (1) sinh đúng 1 câu hỏi đào sâu (token thấp, 1 lượt);
// (2) lưu phản tư + phạm vi chia sẻ vào aha_reflections (real mode).
// Demo mode dùng câu hỏi mẫu + lưu localStorage phía client.

import { resolveApiSession } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AhaPayload = {
  action?: unknown;
  module_id?: unknown;
  insight?: unknown;
  link_prior?: unknown;
  next_action?: unknown;
  visibility?: unknown;
  ai_question?: unknown;
};

const VALID_VISIBILITY = new Set(["private", "department", "company"]);

function str(v: unknown, max = 1000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Câu hỏi mẫu khi chưa bật OpenAI.
function fallbackQuestion(insight: string): string {
  const topic = insight.replace(/[.!?…]+$/, "") || "điều bạn vừa nhận ra";
  return `Nếu áp dụng "${topic}" vào một việc thật trong tuần này, rào cản lớn nhất là gì — và bạn sẽ vượt qua nó thế nào?`;
}

async function generateQuestion(body: AhaPayload): Promise<string> {
  const insight = str(body.insight, 600);
  const linkPrior = str(body.link_prior, 600);
  const nextAction = str(body.next_action, 300);

  if (!isOpenAIConfigured()) return fallbackQuestion(insight);
  const client = getOpenAIClient();
  if (!client) return fallbackQuestion(insight);

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      max_tokens: 80,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Bạn là gia sư AI cho nhân viên Việt Nam. Người học vừa hoàn thành một bài. Hãy hỏi lại ĐÚNG MỘT câu mở, ngắn gọn (≤30 từ), bằng tiếng Việt đời thường, đào sâu phản tư của họ để họ áp dụng vào việc thật. Chỉ trả về 1 câu hỏi, không lời dẫn.",
        },
        {
          role: "user",
          content: `Điều vừa hiểu ra: ${insight}\nGiống/khác cách đang làm: ${linkPrior}\nSẽ thử khi nào: ${nextAction}`,
        },
      ],
    });
    const q = completion.choices[0]?.message?.content?.trim();
    return q && q.length > 0 ? q : fallbackQuestion(insight);
  } catch (err) {
    console.error("[aha-question]", err);
    return fallbackQuestion(insight);
  }
}

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: AhaPayload;
  try {
    body = (await request.json()) as AhaPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const action = typeof body.action === "string" ? body.action : "question";

  if (action === "question") {
    const insight = str(body.insight, 600);
    if (!insight) {
      return apiError("VALIDATION_ERROR", "Thiếu nội dung phản tư.");
    }
    const question = await generateQuestion(body);
    return Response.json({ ok: true, question });
  }

  if (action === "save") {
    const insight = str(body.insight, 1000);
    const moduleId = str(body.module_id, 120);
    if (!insight || !moduleId) {
      return apiError("VALIDATION_ERROR", "Thiếu dữ liệu phản tư.");
    }
    const visibility = VALID_VISIBILITY.has(String(body.visibility))
      ? (body.visibility as string)
      : "private";

    // Demo mode lưu phía client; ở đây chỉ xác nhận.
    if (session.mode === "demo") {
      return Response.json({ ok: true, persisted: false });
    }

    try {
      const supabase = await createSupabaseServerClient();
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.userId)
        .maybeSingle();

      const { error } = await supabase.from("aha_reflections").insert({
        user_id: session.userId,
        organization_id: membership?.organization_id ?? null,
        module_id: moduleId,
        insight,
        link_prior: str(body.link_prior, 1000) || null,
        next_action: str(body.next_action, 300) || null,
        visibility,
        ai_question: str(body.ai_question, 600) || null,
      });
      if (error) throw error;
      return Response.json({ ok: true, persisted: true });
    } catch (err) {
      console.error("[aha-save]", err);
      return apiError("INTERNAL_ERROR", "Chưa lưu được phản tư.");
    }
  }

  return apiError("VALIDATION_ERROR", "Hành động không hợp lệ.");
}
