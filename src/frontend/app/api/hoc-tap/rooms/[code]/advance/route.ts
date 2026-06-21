import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  getStringField,
  hocTapRoomRouteError,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";
import { advanceHocTapRoom } from "@/lib/hoc-tap-room-store";

type Params = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: Params) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const [{ code }, body] = await Promise.all([
      params,
      readHocTapRoomJson(request),
    ]);
    const room = advanceHocTapRoom(code, getStringField(body, "hostToken"));

    return apiOk({
      room,
      persisted: false,
      source: "memory",
    });
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
