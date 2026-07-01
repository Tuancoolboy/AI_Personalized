import { randomUUID } from "crypto";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { persistMcqGrading } from "@/lib/grading-persistence";
import {
  getHocTapQuiz,
  gradeHocTapQuizAnswers,
} from "@/lib/hoc-tap-quiz-catalog";
import { resolveHocTapAudience } from "@/lib/hoc-tap-audience";
import { gradeMcqQuiz } from "@/lib/mcq-grader";
import { isSubmittedQuizAnswer } from "@/lib/quiz-answers";
import { canAccessLearning, loadLearningActivationRecord } from "@/lib/learning-activation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
  "nhan-su",
]);

export async function GET() {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API quiz cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }
  const access = await loadLearningActivationRecord(session.userId);
  if (!canAccessLearning(access)) {
    return apiError("FORBIDDEN", "ACCOUNT_NOT_ACTIVATED");
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
  quizId?: unknown;
  score?: unknown;
  moduleId?: unknown;
  answers?: unknown;
  attemptId?: unknown;
};

function parseAnswers(value: unknown): number[] | null {
  if (!Array.isArray(value)) return null;
  const parsed: number[] = [];
  for (const item of value) {
    if (!isSubmittedQuizAnswer(item)) {
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
  const access = await loadLearningActivationRecord(session.userId);
  if (!canAccessLearning(access)) {
    return apiError("FORBIDDEN", "ACCOUNT_NOT_ACTIVATED");
  }

  let body: QuizPayload;
  try {
    body = (await request.json()) as QuizPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const roleId = typeof body.roleId === "string" ? body.roleId.trim() : "";
  const quizId = typeof body.quizId === "string" ? body.quizId.trim() : "";
  const attemptId =
    typeof body.attemptId === "string" ? body.attemptId.trim() : "";
  const moduleId =
    typeof body.moduleId === "string" ? body.moduleId.trim() : null;
  const answers = parseAnswers(body.answers);

  if (!roleId || !VALID_ROLES.has(roleId)) {
    return apiError("VALIDATION_ERROR", "Vai trò không hợp lệ.");
  }

  if (quizId) {
    if (!answers) {
      return apiError(
        "VALIDATION_ERROR",
        "Quiz Học tập cần đầy đủ đáp án để server tự chấm.",
      );
    }
    if (!isUuid(attemptId)) {
      return apiError(
        "VALIDATION_ERROR",
        "Mã lượt làm quiz không hợp lệ.",
      );
    }

    const quiz = getHocTapQuiz(quizId);
    const graded = gradeHocTapQuizAnswers({ quizId, roleId, answers });
    if (!quiz || !graded) {
      return apiError(
        "VALIDATION_ERROR",
        "Bộ đề hoặc số câu trả lời không hợp lệ.",
      );
    }

    let rpcResult;
    try {
      const supabase = createSupabaseServiceClient();
      rpcResult = await supabase.rpc("record_hoc_tap_quiz_attempt", {
        p_user_id: session.userId,
        p_quiz_id: quiz.id,
        p_role_id: roleId,
        p_score: graded.score,
        p_max_xp: quiz.xp,
        p_attempt_id: attemptId,
      });
    } catch (rpcError) {
      console.error("[quiz-post:hoc-tap]", rpcError);
      return apiError(
        "INTERNAL_ERROR",
        "Không lưu được XP của bài kiểm tra.",
      );
    }

    if (rpcResult.error) {
      console.error("[quiz-post:hoc-tap]", rpcResult.error.message);
      return apiError(
        "INTERNAL_ERROR",
        "Không lưu được XP của bài kiểm tra.",
      );
    }

    const award = parseHocTapAward(rpcResult.data);
    if (!award) {
      return apiError(
        "INTERNAL_ERROR",
        "Kết quả XP từ Supabase không hợp lệ.",
      );
    }

    return apiOk({
      score: graded.score,
      correctCount: graded.correctCount,
      questionCount: graded.questionCount,
      passed: graded.score >= 70,
      xpEarned: award.xpEarned,
      totalXp: award.totalXp,
      level: award.level,
      currentLevelXp: award.currentLevelXp,
      targetLevelXp: award.targetLevelXp,
      attemptId,
      idempotent: award.idempotent,
    });
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
  let audience;
  try {
    audience = await resolveHocTapAudience();
  } catch (audienceError) {
    console.error("[quiz-post:audience]", audienceError);
    return apiError(
      "INTERNAL_ERROR",
      "Không xác định được không gian Học tập.",
    );
  }
  const { error } = await supabase.from("quiz_results").insert({
    id: randomUUID(),
    user_id: session.userId,
    role_id: roleId,
    module_id: moduleId,
    score,
    quiz_source: "learning",
    organization_id: audience.organizationId,
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

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseHocTapAward(value: unknown): {
  xpEarned: number;
  totalXp: number;
  level: number;
  currentLevelXp: number;
  targetLevelXp: number;
  idempotent: boolean;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const xpEarned = Number(row.xp_earned);
  const totalXp = Number(row.total_xp);
  const level = Number(row.level);
  const currentLevelXp = Number(row.current_level_xp);
  const targetLevelXp = Number(row.target_level_xp);

  if (
    !Number.isFinite(xpEarned) ||
    !Number.isFinite(totalXp) ||
    !Number.isFinite(level) ||
    !Number.isFinite(currentLevelXp) ||
    !Number.isFinite(targetLevelXp)
  ) {
    return null;
  }

  return {
    xpEarned: Math.max(0, Math.round(xpEarned)),
    totalXp: Math.max(0, Math.round(totalXp)),
    level: Math.max(1, Math.round(level)),
    currentLevelXp: Math.max(0, Math.round(currentLevelXp)),
    targetLevelXp: Math.max(1, Math.round(targetLevelXp)),
    idempotent: row.idempotent === true,
  };
}
