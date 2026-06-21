import { randomUUID } from "crypto";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import { fetchModuleById } from "@/lib/learning-modules";
import {
  getDemoPracticeReview,
  gradePracticeSubmission,
  type PracticeReviewResult,
} from "@/lib/practice-grader";
import {
  MAX_IMAGES_PER_SUBMIT,
  createPracticeImageSignedUrls,
  uploadPracticeImages,
  type PracticeImageInput,
} from "@/lib/practice-storage";
import { isOpenAIConfigured, type RoleId } from "@/lib/openai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const VALID_ROLES = new Set<RoleId>([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
]);

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type ImagePayload = { imageBase64?: unknown; mimeType?: unknown };

const MAX_ANSWER_CHARS = 6000;

type ReviewPayload = {
  moduleId?: unknown;
  images?: unknown;
  imageBase64?: unknown;
  mimeType?: unknown;
  answerText?: unknown;
};

// Có gửi kèm input ảnh không (để phân biệt "không nộp ảnh" vs "ảnh lỗi/quá lớn").
function hasImageInput(body: ReviewPayload): boolean {
  if (Array.isArray(body.images)) return body.images.length > 0;
  return typeof body.imageBase64 === "string" && body.imageBase64.trim() !== "";
}

type SubmissionRow = {
  id: string;
  score: number;
  feedback: string;
  strengths: string[] | null;
  improvements: string[] | null;
  image_paths?: string[] | null;
  created_at: string;
};

const SELECT_WITH_IMAGES =
  "id, score, feedback, strengths, improvements, image_paths, created_at";
const SELECT_LEGACY =
  "id, score, feedback, strengths, improvements, created_at";

function isMissingImagePathsColumn(message: string): boolean {
  return /image_paths/i.test(message) && /does not exist/i.test(message);
}

function estimateBase64Bytes(base64: string): number {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

function parseImages(body: ReviewPayload): PracticeImageInput[] | null {
  if (Array.isArray(body.images)) {
    const parsed: PracticeImageInput[] = [];
    for (const item of body.images) {
      if (!item || typeof item !== "object") continue;
      const row = item as ImagePayload;
      const base64 =
        typeof row.imageBase64 === "string" ? row.imageBase64.trim() : "";
      const mimeType =
        typeof row.mimeType === "string" ? row.mimeType.trim() : "image/png";
      if (!base64 || !ALLOWED_MIME.has(mimeType)) continue;
      if (estimateBase64Bytes(base64) > MAX_IMAGE_BYTES) return null;
      parsed.push({ base64, mimeType });
    }
    return parsed.length > 0 ? parsed : null;
  }

  const legacyBase64 =
    typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  const legacyMime =
    typeof body.mimeType === "string" ? body.mimeType.trim() : "image/png";
  if (!legacyBase64 || !ALLOWED_MIME.has(legacyMime)) return null;
  if (estimateBase64Bytes(legacyBase64) > MAX_IMAGE_BYTES) return null;
  return [{ base64: legacyBase64, mimeType: legacyMime }];
}

async function mapSubmissionRow(
  row: SubmissionRow,
): Promise<Record<string, unknown>> {
  const imageUrls = await createPracticeImageSignedUrls(row.image_paths ?? []);
  return {
    id: row.id,
    score: row.score,
    feedback: row.feedback,
    strengths: row.strengths ?? [],
    improvements: row.improvements ?? [],
    imageUrls,
    imageCount: row.image_paths?.length ?? 0,
    reviewedAt: row.created_at,
  };
}

async function listSubmissions(
  userId: string,
  moduleId: string,
): Promise<SubmissionRow[]> {
  const supabase = await createSupabaseServerClient();
  const withImages = await supabase
    .from("module_practice_submissions")
    .select(SELECT_WITH_IMAGES)
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!withImages.error) {
    return (withImages.data ?? []) as SubmissionRow[];
  }
  if (!isMissingImagePathsColumn(withImages.error.message)) {
    throw withImages.error;
  }

  const legacy = await supabase
    .from("module_practice_submissions")
    .select(SELECT_LEGACY)
    .eq("user_id", userId)
    .eq("module_id", moduleId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (legacy.error) throw legacy.error;
  return ((legacy.data ?? []) as SubmissionRow[]).map((row) => ({
    ...row,
    image_paths: [],
  }));
}

async function insertSubmission(
  userId: string,
  moduleId: string,
  submissionId: string,
  review: PracticeReviewResult,
  imagePaths: string[],
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const base = {
    id: submissionId,
    user_id: userId,
    module_id: moduleId,
    score: review.score,
    feedback: review.feedback,
    strengths: review.strengths,
    improvements: review.improvements,
  };

  const withImages = await supabase
    .from("module_practice_submissions")
    .insert({ ...base, image_paths: imagePaths });

  if (!withImages.error) return;
  if (!isMissingImagePathsColumn(withImages.error.message)) {
    throw withImages.error;
  }

  const legacy = await supabase.from("module_practice_submissions").insert(base);
  if (legacy.error) throw legacy.error;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return apiError("FORBIDDEN", "API practice-review cần Supabase.");
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  const moduleId = new URL(request.url).searchParams.get("moduleId")?.trim();
  if (!moduleId) {
    return apiError("VALIDATION_ERROR", "Thiếu moduleId.");
  }

  let rows: SubmissionRow[];
  try {
    rows = await listSubmissions(session.userId, moduleId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[practice-review-get]", message);
    return apiError("INTERNAL_ERROR", "Không đọc được lịch sử chấm.");
  }
  const history = await Promise.all(rows.map(mapSubmissionRow));
  const latest = history[0] ?? null;
  const scores = rows.map((r) => r.score);
  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

  return apiOk({
    review: latest,
    history,
    stats: {
      attemptCount: rows.length,
      bestScore,
      latestScore: latest?.score ?? null,
    },
  });
}

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  let body: ReviewPayload;
  try {
    body = (await request.json()) as ReviewPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const moduleId =
    typeof body.moduleId === "string" ? body.moduleId.trim() : "";
  if (!moduleId) {
    return apiError("VALIDATION_ERROR", "Thiếu moduleId.");
  }

  // Text đáp án (mục 1) — tùy chọn, cắt độ dài chống chi phí phình (6.6).
  const answerText =
    typeof body.answerText === "string"
      ? body.answerText.trim().slice(0, MAX_ANSWER_CHARS)
      : "";

  // Ảnh: rỗng nếu không nộp; null = ảnh lỗi/quá lớn.
  let images = parseImages(body);
  if (!images) {
    if (hasImageInput(body)) {
      return apiError(
        "VALIDATION_ERROR",
        "Ảnh không hợp lệ hoặc quá lớn (tối đa 5MB/ảnh).",
      );
    }
    images = [];
  }
  if (images.length > MAX_IMAGES_PER_SUBMIT) {
    return apiError(
      "VALIDATION_ERROR",
      `Tối đa ${MAX_IMAGES_PER_SUBMIT} ảnh mỗi lần nộp.`,
    );
  }
  if (!answerText && images.length === 0) {
    return apiError(
      "VALIDATION_ERROR",
      "Hãy dán đáp án hoặc nộp ít nhất 1 ảnh kết quả.",
    );
  }

  const mod = await fetchModuleById(moduleId);
  if (!mod) {
    return apiError("NOT_FOUND", "Không tìm thấy bài học.");
  }

  const roleId = mod.role_id as RoleId;
  if (!VALID_ROLES.has(roleId)) {
    return apiError("VALIDATION_ERROR", "Vai trò bài học không hợp lệ.");
  }

  let review: PracticeReviewResult | null = null;

  if (isOpenAIConfigured()) {
    try {
      review = await gradePracticeSubmission(roleId, mod, images, {
        answerText,
        rubric: mod.rubric,
      });
    } catch (err) {
      console.error("[practice-review-openai]", err);
      // 6.1: không crash khi chấm tự động lỗi → rơi xuống demo/thủ công.
      review = null;
    }
  }

  if (!review) {
    review = getDemoPracticeReview(mod);
  }

  const entryId = randomUUID();
  let imagePaths: string[] = [];
  let imageUrls: string[] = [];

  if (session.mode === "supabase" && isSupabaseConfigured()) {
    try {
      imagePaths = await uploadPracticeImages(
        session.userId,
        moduleId,
        entryId,
        images,
      );
      await insertSubmission(
        session.userId,
        moduleId,
        entryId,
        review,
        imagePaths,
      );
      imageUrls = await createPracticeImageSignedUrls(imagePaths);
    } catch (err) {
      console.error("[practice-review-save]", err);
    }
  }

  const entry = {
    id: entryId,
    score: review.score,
    feedback: review.feedback,
    strengths: review.strengths,
    improvements: review.improvements,
    rubricScores: review.rubricScores ?? [],
    imageUrls,
    imageCount: images.length,
    reviewedAt: new Date().toISOString(),
  };

  return apiOk({ review: entry, entry });
}
