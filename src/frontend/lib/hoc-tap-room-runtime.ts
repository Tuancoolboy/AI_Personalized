import type { ApiSession } from "@/lib/api-auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  advanceSupabaseHocTapRoom,
  createSupabaseHocTapRoom,
  deleteSupabaseHocTapRoom,
  getSupabaseHocTapRoomSnapshot,
  joinSupabaseHocTapRoom,
  leaveSupabaseHocTapRoom,
  listSupabaseHocTapRooms,
  startSupabaseHocTapRoom,
  submitSupabaseHocTapRoomAnswer,
  updateSupabaseHocTapRoomQuestions,
  updateSupabaseHocTapRoomSettings,
} from "@/lib/hoc-tap-room-service";
import {
  advanceHocTapRoom,
  createHocTapRoom,
  deleteHocTapRoom,
  getHocTapRoomSnapshot,
  joinHocTapRoom,
  leaveHocTapRoom,
  listHocTapPublicRooms,
  startHocTapRoom,
  submitHocTapRoomAnswer,
  updateHocTapRoomQuestions,
  updateHocTapRoomSettings,
  type HocTapRoomAnswerInput,
  type HocTapRoomCreateInput,
  type HocTapRoomDeleteInput,
  type HocTapRoomJoinInput,
  type HocTapRoomLeaveInput,
  type HocTapRoomUpdateQuestionsInput,
  type HocTapRoomUpdateSettingsInput,
} from "@/lib/hoc-tap-room-store";

type RoomRuntimeMeta = {
  persisted: boolean;
  source: "memory" | "supabase";
};

function shouldUseSupabaseRoomRuntime(session: ApiSession): boolean {
  return session.mode === "supabase" && isSupabaseConfigured();
}

export async function listHocTapRoomsWithRuntime(session: ApiSession) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      rooms: await listSupabaseHocTapRooms({ userId: session.userId }),
      persisted: true,
      source: "supabase",
    } satisfies RoomRuntimeMeta & { rooms: Awaited<ReturnType<typeof listSupabaseHocTapRooms>> };
  }

  return {
    rooms: listHocTapPublicRooms(),
    persisted: false,
    source: "memory",
  } satisfies RoomRuntimeMeta & { rooms: ReturnType<typeof listHocTapPublicRooms> };
}

export async function createHocTapRoomWithRuntime(
  session: ApiSession,
  input: HocTapRoomCreateInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      ...(await createSupabaseHocTapRoom({ userId: session.userId }, input)),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    ...createHocTapRoom(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function joinHocTapRoomWithRuntime(
  session: ApiSession,
  input: HocTapRoomJoinInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      ...(await joinSupabaseHocTapRoom({ userId: session.userId }, input)),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    ...joinHocTapRoom(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function getHocTapRoomWithRuntime(
  session: ApiSession,
  code: string,
  participantId?: string | null,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await getSupabaseHocTapRoomSnapshot(
        { userId: session.userId },
        code,
        participantId,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: getHocTapRoomSnapshot(code, participantId),
    persisted: false,
    source: "memory",
  } as const;
}

export async function startHocTapRoomWithRuntime(
  session: ApiSession,
  code: string,
  options: { hostToken?: string; participantId?: string | null },
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await startSupabaseHocTapRoom(
        { userId: session.userId },
        code,
        options.participantId,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: startHocTapRoom(code, {
      hostToken: options.hostToken,
      participantId: options.participantId ?? undefined,
    }),
    persisted: false,
    source: "memory",
  } as const;
}

export async function submitHocTapRoomAnswerWithRuntime(
  session: ApiSession,
  input: HocTapRoomAnswerInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await submitSupabaseHocTapRoomAnswer(
        { userId: session.userId },
        input,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: submitHocTapRoomAnswer(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function updateHocTapRoomSettingsWithRuntime(
  session: ApiSession,
  input: HocTapRoomUpdateSettingsInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await updateSupabaseHocTapRoomSettings(
        { userId: session.userId },
        input,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: updateHocTapRoomSettings(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function deleteHocTapRoomWithRuntime(
  session: ApiSession,
  input: HocTapRoomDeleteInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      ...(await deleteSupabaseHocTapRoom({ userId: session.userId }, input)),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    ...deleteHocTapRoom(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function leaveHocTapRoomWithRuntime(
  session: ApiSession,
  input: HocTapRoomLeaveInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      ...(await leaveSupabaseHocTapRoom({ userId: session.userId }, input)),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    ...leaveHocTapRoom(input),
    persisted: false,
    source: "memory",
  } as const;
}

export async function advanceHocTapRoomWithRuntime(
  session: ApiSession,
  code: string,
  options: { hostToken?: string; participantId?: string | null },
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await advanceSupabaseHocTapRoom(
        { userId: session.userId },
        code,
        options.participantId,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: advanceHocTapRoom(code, options.hostToken ?? ""),
    persisted: false,
    source: "memory",
  } as const;
}

export async function updateHocTapRoomQuestionsWithRuntime(
  session: ApiSession,
  input: HocTapRoomUpdateQuestionsInput,
) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    return {
      room: await updateSupabaseHocTapRoomQuestions(
        { userId: session.userId },
        input,
      ),
      persisted: true,
      source: "supabase",
    } as const;
  }

  return {
    room: updateHocTapRoomQuestions(input),
    persisted: false,
    source: "memory",
  } as const;
}
