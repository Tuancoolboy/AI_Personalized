import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  getStringField,
  hocTapRoomRouteError,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";
import { joinHocTapRoomWithRuntime } from "@/lib/hoc-tap-room-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const body = await readHocTapRoomJson(request);
    const result = await joinHocTapRoomWithRuntime(session, {
      code: getStringField(body, "code"),
      playerName: getStringField(body, "playerName"),
      avatarSeed: getStringField(body, "avatarSeed"),
    });

    return apiOk(result);
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
