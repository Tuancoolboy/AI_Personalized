import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { assignmentGraderAgent } from "@/lib/agents/grader";
import { toLegacyPracticeReview } from "@/lib/agents/grader-types";
import { persistOpenTextGrading } from "@/lib/grading-persistence";
import { fetchModuleById } from "@/lib/learning-modules";
import { isOpenAIConfigured, type RoleId } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set<RoleId>([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
  "nhan-su",
]);

type GraderPayload = {
  kind?: unknown;
  moduleId?: unknown;
  prompt?: unknown;
  answer?: unknown;
  roleId?: unknown;
};

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  if (!isOpenAIConfigured()) {
    return apiError("FORBIDDEN", "Chưa cấu hình OPENAI_API_KEY.");
  }

  let body: GraderPayload;
  try {
    body = (await request.json()) as GraderPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const moduleId =
    typeof body.moduleId === "string" ? body.moduleId.trim() : "";

  if (answer.length < 20) {
    return apiError(
      "VALIDATION_ERROR",
      "Câu trả lời cần ít nhất 20 ký tự để Agent 2 chấm.",
    );
  }
  if (!prompt) {
    return apiError("VALIDATION_ERROR", "Thiếu câu hỏi / yêu cầu bài (prompt).");
  }

  let roleId =
    typeof body.roleId === "string" && VALID_ROLES.has(body.roleId as RoleId)
      ? (body.roleId as RoleId)
      : ("khac" as RoleId);
  let moduleTitle: string | undefined;

  if (moduleId) {
    const mod = await fetchModuleById(moduleId);
    if (mod) {
      roleId = mod.role_id as RoleId;
      moduleTitle = mod.title;
    }
  }

  if (session.mode === "supabase" && isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", session.userId)
      .maybeSingle();
    if (!body.roleId && profile?.role_id && VALID_ROLES.has(profile.role_id as RoleId)) {
      roleId = profile.role_id as RoleId;
    }
  }

  try {
    const { result } = await assignmentGraderAgent.execute(
      {
        kind: "open-text",
        roleId,
        prompt,
        answer,
        moduleTitle,
      },
      { organizationId: null, userId: session.userId },
    );

    const legacy = toLegacyPracticeReview(result);
    const review = {
      ...legacy,
      grading: {
        rubricBreakdown: result.rubricBreakdown,
        evidence: result.evidence,
        confidence: result.confidence,
        reviewStatus: result.reviewStatus,
        rubricVersion: result.rubricVersion,
        model: result.model,
      },
    };

    let gradingResultId: string | null = null;
    let gradingPersisted = false;

    if (session.mode === "supabase" && isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", session.userId)
        .maybeSingle();

      try {
        const persisted = await persistOpenTextGrading({
          userId: session.userId,
          organizationId: membership?.organization_id ?? null,
          moduleId: moduleId || null,
          prompt,
          answer,
          review: {
            ...legacy,
            grading: review.grading,
          },
        });
        gradingResultId = persisted.gradingResultId;
        gradingPersisted = persisted.persisted;
      } catch (err) {
        console.warn("[agents/grader] persist skipped:", err);
      }
    }

    return apiOk({
      result: review,
      gradingResultId,
      gradingPersisted,
    });
  } catch (err) {
    console.error("[agents/grader]", err);
    return apiError("INTERNAL_ERROR", "Agent 2 không chấm được bài tự luận.");
  }
}
