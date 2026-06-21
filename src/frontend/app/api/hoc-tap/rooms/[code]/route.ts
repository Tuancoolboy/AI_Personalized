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
  deleteHocTapRoom,
  getHocTapRoomSnapshot,
  updateHocTapRoomSettings,
} from "@/lib/hoc-tap-room-store";

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
    const room = getHocTapRoomSnapshot(code, participantId);

    return apiOk({
      room,
      persisted: false,
      source: "memory",
    });
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
    const room = updateHocTapRoomSettings({
      code,
      locked: locked ?? false,
      hostToken: getStringField(body, "hostToken"),
      participantId: getStringField(body, "participantId"),
    });

    return apiOk({
      room,
      persisted: false,
      source: "memory",
    });
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
    const result = deleteHocTapRoom({
      code,
      hostToken: getStringField(body, "hostToken"),
      participantId: getStringField(body, "participantId"),
    });

    return apiOk({
      ...result,
      deleted: true,
      persisted: false,
      source: "memory",
    });
  } catch (error) {
    return hocTapRoomRouteError(error);
  }
}
