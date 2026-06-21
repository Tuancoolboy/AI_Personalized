import { randomUUID } from "crypto";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { persistMcqGrading } from "@/lib/grading-persistence";
import { gradeMcqQuiz } from "@/lib/mcq-grader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
]);

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API quiz cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("quiz_results")
    .select("id, role_id, score, passed, created_at")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[quiz-get]", error.message);
    return apiError("INTERNAL_ERROR", "Không đọc được kết quả quiz.");
  }

  const rows = data ?? [];
  const results = rows.map((row) => ({
    id: row.id as string,
    roleId: row.role_id as string,
    score: row.score as number,
    passed: Boolean(row.passed),
    createdAt: row.created_at as string,
  }));

  const averageScore =
    results.length > 0
      ? Math.round(
          results.reduce((sum, row) => sum + row.score, 0) / results.length,
        )
      : 0;

  const bestScore =
    results.length > 0
      ? Math.max(...results.map((row) => row.score))
      : 0;

  return apiOk({
    averageScore,
    bestScore,
    count: results.length,
    results,
  });
}

type QuizPayload = {
  roleId?: unknown;
  score?: unknown;
  moduleId?: unknown;
  answers?: unknown;
};

function parseAnswers(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: number[] = [];
  for (const item of value) {
    if (typeof item !== "number" || !Number.isInteger(item) || item < 0) {
      return null;
    }
    parsed.push(item);
  }
  return parsed;
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API quiz cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: QuizPayload;
  try {
    body = (await request.json()) as QuizPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const roleId = typeof body.roleId === "string" ? body.roleId.trim() : "";
  const moduleId =
    typeof body.moduleId === "string" ? body.moduleId.trim() : null;
  const answers = parseAnswers(body.answers);

  if (!roleId || !VALID_ROLES.has(roleId)) {
    return apiError("VALIDATION_ERROR", "Vai trò không hợp lệ.");
  }

  let score: number;
  let gradingResultId: string | null = null;
  let gradingPersisted = false;
  let reviewStatus: string | undefined;
  let correctCount: number | undefined;
  let questionCount: number | undefined;

  if (answers) {
    const graded = gradeMcqQuiz({ roleId, answers });
    if (!graded) {
      return apiError(
        "VALIDATION_ERROR",
        "Số câu trả lời không khớp bài kiểm tra.",
      );
    }
    score = graded.score;
    correctCount = graded.correctCount;
    questionCount = graded.questionCount;
    reviewStatus = graded.review.grading?.reviewStatus;

    const supabase = await createSupabaseServerClient();
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", session.userId)
      .maybeSingle();

    try {
      const persisted = await persistMcqGrading({
        userId: session.userId,
        organizationId: membership?.organization_id ?? null,
        roleId,
        moduleId,
        answers,
        review: graded.review,
      });
      gradingResultId = persisted.gradingResultId;
      gradingPersisted = persisted.persisted;
    } catch (err) {
      console.warn("[quiz-post] grading persist:", err);
    }
  } else {
    const rawScore =
      typeof body.score === "number" ? body.score : Number(body.score);
    if (!Number.isInteger(rawScore) || rawScore < 0 || rawScore > 100) {
      return apiError("VALIDATION_ERROR", "Điểm phải từ 0 đến 100.");
    }
    score = rawScore;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("quiz_results").insert({
    id: randomUUID(),
    user_id: session.userId,
    role_id: roleId,
    module_id: moduleId,
    score,
  });

  if (error) {
    console.error("[quiz-post]", error.message);
    return apiError("INTERNAL_ERROR", "Không lưu được kết quả quiz.");
  }

  return apiOk({
    score,
    correctCount,
    questionCount,
    reviewStatus,
    gradingResultId,
    gradingPersisted,
    passed: score >= 70,
  });
}
