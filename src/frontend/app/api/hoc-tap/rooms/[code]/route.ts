import type { NextRequest } from "next/server";
import { resolveApiSession } from "@/lib/api-auth";
import { apiError, apiOk } from "@/lib/api-error";
import {
  getBooleanField,
  getStringField,
  hocTapRoomRouteError,
  readHocTapRoomJson,
} from "@/lib/hoc-tap-room-api";
import {
  deleteHocTapRoomWithRuntime,
  getHocTapRoomWithRuntime,
  updateHocTapRoomSettingsWithRuntime,
} from "@/lib/hoc-tap-room-runtime";

type Params = { params: Promise<{ code: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: Params) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const { code } = await params;
    const participantId = request.nextUrl.searchParams.get("participantId");
    return apiOk(await getHocTapRoomWithRuntime(session, code, participantId));
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}

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
    const locked = getBooleanField(body, "locked");
    const result = await updateHocTapRoomSettingsWithRuntime(session, {
      code,
      locked: locked ?? false,
      hostToken: getStringField(body, "hostToken"),
      participantId: getStringField(body, "participantId"),
    });
    return apiOk(result);
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập.");
  }

  try {
    const [{ code }, body] = await Promise.all([
      params,
      readHocTapRoomJson(request),
    ]);
    const result = await deleteHocTapRoomWithRuntime(session, {
      code,
      hostToken: getStringField(body, "hostToken"),
      participantId: getStringField(body, "participantId"),
    });

    return apiOk({
      ...result,
      deleted: true,
    });
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
