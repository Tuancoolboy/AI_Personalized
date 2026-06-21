import { apiError, apiOk } from "@/lib/api-error";
import type { ManagerReviewAction } from "@/lib/manager-grading";
import {
  isMissingGradingSchema,
  resolveManagerReviewDecision,
} from "@/lib/manager-grading";
import { requireManagerContext } from "@/lib/manager-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type ReviewPayload = {
  action?: unknown;
  adjustedScore?: unknown;
  reason?: unknown;
};

function parseAction(value: unknown): ManagerReviewAction | null {
  if (value === "accept" || value === "adjust" || value === "needs-revision") {
    return value;
  }
  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resultId: string }> },
) {
  const manager = await requireManagerContext();
  if (!manager) {
    return apiError("FORBIDDEN", "Chỉ quản lý mới duyệt được bài chấm điểm.");
  }

  const { resultId } = await context.params;
  if (!resultId?.trim()) {
    return apiError("VALIDATION_ERROR", "Thiếu mã kết quả chấm điểm.");
  }

  let body: ReviewPayload;
  try {
    body = (await request.json()) as ReviewPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "Body JSON không hợp lệ.");
  }

  const action = parseAction(body.action);
  if (!action) {
    return apiError(
      "VALIDATION_ERROR",
      "action phải là accept, adjust hoặc needs-revision.",
    );
  }

  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim()
      : "";
  if (!reason) {
    return apiError("VALIDATION_ERROR", "Vui lòng nhập lý do duyệt.");
  }

  const adjustedScore =
    typeof body.adjustedScore === "number"
      ? body.adjustedScore
      : typeof body.adjustedScore === "string"
        ? Number(body.adjustedScore)
        : undefined;

  if (
    action === "adjust" &&
    (adjustedScore === undefined ||
      !Number.isFinite(adjustedScore) ||
      adjustedScore < 0 ||
      adjustedScore > 100)
  ) {
    return apiError(
      "VALIDATION_ERROR",
      "Điều chỉnh điểm cần adjustedScore từ 0 đến 100.",
    );
  }

  if (
    !isSupabaseConfigured() ||
    manager.membership.organizationId === "demo" ||
    resultId.startsWith("demo-")
  ) {
    const decision = resolveManagerReviewDecision(
      action,
      68,
      adjustedScore,
    );
    return apiOk({
      resultId,
      persisted: false,
      reviewStatus: decision.reviewStatus,
      finalScore: decision.finalScore,
      message: "Demo — quyết định chưa lưu vào Supabase.",
    });
  }

  const supabase = createSupabaseServiceClient();
  const orgId = manager.membership.organizationId;

  const { data: existing, error: fetchError } = await supabase
    .from("grading_results")
    .select("id, score, review_status, submission_id, organization_id")
    .eq("id", resultId)
    .maybeSingle();

  if (fetchError) {
    if (isMissingGradingSchema(fetchError.message)) {
      return apiError(
        "NOT_FOUND",
        "Chưa có bảng grading — chạy migration 0020.",
      );
    }
    console.error("[manager/grading PATCH fetch]", fetchError.message);
    return apiError("INTERNAL_ERROR", "Không đọc được kết quả chấm điểm.");
  }

  if (!existing || existing.organization_id !== orgId) {
    return apiError("NOT_FOUND", "Không tìm thấy bài chấm trong tổ chức.");
  }

  if (existing.review_status !== "manager-review") {
    return apiError(
      "CONFLICT",
      "Bài này không còn trong hàng đợi chờ duyệt.",
    );
  }

  const decision = resolveManagerReviewDecision(
    action,
    existing.score,
    adjustedScore,
  );

  const { error: updateError } = await supabase
    .from("grading_results")
    .update({
      score: decision.finalScore,
      review_status: decision.reviewStatus,
    })
    .eq("id", resultId)
    .eq("organization_id", orgId);

  if (updateError) {
    console.error("[manager/grading PATCH update]", updateError.message);
    return apiError("INTERNAL_ERROR", "Không cập nhật được kết quả chấm.");
  }

  const { error: reviewError } = await supabase.from("grading_reviews").insert({
    grading_result_id: resultId,
    reviewer_id: manager.session.userId,
    adjusted_score: action === "adjust" ? decision.finalScore : null,
    reason,
  });

  if (reviewError) {
    console.error("[manager/grading PATCH review]", reviewError.message);
    return apiError("INTERNAL_ERROR", "Không lưu được nhật ký duyệt.");
  }

  if (action === "needs-revision" && existing.submission_id) {
    await supabase
      .from("assessment_submissions")
      .update({ status: "needs-revision" })
      .eq("id", existing.submission_id);
  } else if (
    (action === "accept" || action === "adjust") &&
    existing.submission_id
  ) {
    await supabase
      .from("assessment_submissions")
      .update({ status: "graded" })
      .eq("id", existing.submission_id);
  }

  return apiOk({
    resultId,
    persisted: true,
    reviewStatus: decision.reviewStatus,
    finalScore: decision.finalScore,
    message:
      action === "needs-revision"
        ? "Đã yêu cầu nhân viên làm lại."
        : action === "adjust"
          ? "Đã điều chỉnh điểm và duyệt."
          : "Đã duyệt điểm AI.",
  });
}
