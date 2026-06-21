import { apiError } from "@/lib/api-error";
import {
  HocTapRoomError,
  type HocTapRoomEntryRole,
  type HocTapRoomMode,
  type HocTapRoomQuestionInput,
  type HocTapRoomType,
} from "@/lib/hoc-tap-room-store";

export function hocTapRoomRouteError(error: unknown) {
  if (error instanceof HocTapRoomError) {
    if (error.code === "ROOM_NOT_FOUND") {
      return apiError("NOT_FOUND", error.message);
    }
    if (error.code === "FORBIDDEN") {
      return apiError("FORBIDDEN", error.message);
    }
    if (
      error.code === "ROOM_FULL" ||
      error.code === "ROOM_FINISHED" ||
      error.code === "ROOM_NOT_WAITING" ||
      error.code === "ROOM_NOT_PLAYING" ||
      error.code === "ROOM_EMPTY" ||
      error.code === "HOST_CANNOT_ANSWER" ||
      error.code === "QUESTION_MISMATCH"
    ) {
      return apiError("CONFLICT", error.message);
    }
    return apiError("VALIDATION_ERROR", error.message);
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error("[hoc-tap-rooms]", message);
  return apiError("INTERNAL_ERROR", "Phòng quiz tạm thời chưa phản hồi.");
}

export async function readHocTapRoomJson(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const data = (await request.json()) as unknown;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("JSON body must be an object");
    }
    return data as Record<string, unknown>;
  } catch {
    throw new HocTapRoomError("INVALID_INPUT", "JSON không hợp lệ.");
  }
}

export function getStringField(
  body: Record<string, unknown>,
  field: string,
): string {
  const value = body[field];
  return typeof value === "string" ? value : "";
}

export function getNumberField(
  body: Record<string, unknown>,
  field: string,
): number | undefined {
  const value = body[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function getBooleanField(
  body: Record<string, unknown>,
  field: string,
): boolean | undefined {
  const value = body[field];
  return typeof value === "boolean" ? value : undefined;
}

export function parseHocTapRoomMode(value: unknown): HocTapRoomMode | undefined {
  if (value === "classic" || value === "team-battle") return value;
  return undefined;
}

export function parseHocTapRoomType(value: unknown): HocTapRoomType | undefined {
  if (value === "host-review" || value === "ai-secret") return value;
  return undefined;
}

export function parseHocTapRoomEntryRole(
  value: unknown,
): HocTapRoomEntryRole | undefined {
  if (value === "host" || value === "player") return value;
  return undefined;
}

export function parseHocTapRoomQuestions(
  value: unknown,
): HocTapRoomQuestionInput[] {
  if (!Array.isArray(value)) {
    throw new HocTapRoomError("INVALID_INPUT", "Danh sách câu hỏi không hợp lệ.");
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HocTapRoomError("INVALID_INPUT", "Câu hỏi không hợp lệ.");
    }
    const row = item as Record<string, unknown>;
    return {
      question: typeof row.question === "string" ? row.question : "",
      options: Array.isArray(row.options)
        ? row.options.filter((option): option is string => typeof option === "string")
        : [],
      correctIndex:
        typeof row.correctIndex === "number" ? row.correctIndex : -1,
      explanation:
        typeof row.explanation === "string" ? row.explanation : undefined,
    };
  });
}
