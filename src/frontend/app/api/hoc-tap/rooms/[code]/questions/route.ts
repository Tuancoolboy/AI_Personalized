import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  getStringField,
  hocTapRoomRouteError,
  parseHocTapRoomQuestions,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";
import { updateHocTapRoomQuestionsWithRuntime } from "@/lib/hoc-tap-room-runtime";

type Params = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: Params) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const [{ code }, body] = await Promise.all([
      params,
      readHocTapRoomJson(request),
    ]);
    const result = await updateHocTapRoomQuestionsWithRuntime(session, {
      code,
      hostToken: getStringField(body, "hostToken"),
      questions: parseHocTapRoomQuestions(body.questions),
    });
    return apiOk(result);
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
