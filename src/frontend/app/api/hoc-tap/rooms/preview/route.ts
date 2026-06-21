import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  generateHocTapAiRoomQuestions,
  normalizeHocTapAiRoomPreviewInput,
} from "@/lib/hoc-tap-ai-room-generator";
import { HocTapRoomError } from "@/lib/hoc-tap-room-store";
import {
  hocTapRoomRouteError,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const body = await readHocTapRoomJson(request);
    const input = normalizeHocTapAiRoomPreviewInput(body);
    if (input.roomType === "ai-secret") {
      throw new HocTapRoomError(
        "FORBIDDEN",
        "Phòng AI bí mật không cho xem trước câu hỏi hoặc đáp án.",
      );
    }
    const result = await generateHocTapAiRoomQuestions(input);

    return apiOk({
      ...result,
      persisted: false,
    });
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
