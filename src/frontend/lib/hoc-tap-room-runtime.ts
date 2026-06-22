import type { ApiSession } from "@/lib/api-auth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  advanceSupabaseHocTapRoom,
  createSupabaseHocTapRoom,
  deleteSupabaseHocTapRoom,
  getSupabaseHocTapRoomSnapshot,
  joinSupabaseHocTapRoom,
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
  HocTapRoomError,
  joinHocTapRoom,
  listHocTapPublicRooms,
  startHocTapRoom,
  submitHocTapRoomAnswer,
  updateHocTapRoomQuestions,
  updateHocTapRoomSettings,
  type HocTapRoomAnswerInput,
  type HocTapRoomCreateInput,
  type HocTapRoomDeleteInput,
  type HocTapRoomJoinInput,
  type HocTapRoomUpdateQuestionsInput,
  type HocTapRoomUpdateSettingsInput,
} from "@/lib/hoc-tap-room-store";

type RoomRuntimeMeta = {
  persisted: boolean;
  source: "memory" | "supabase";
};

function shouldFallbackToMemoryRuntime(error: unknown): boolean {
  if (error instanceof HocTapRoomError) {
    return error.code === "FORBIDDEN" || error.code === "ROOM_NOT_FOUND";
  }
  return error instanceof Error;
}

function logRoomRuntimeFallback(action: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[hoc-tap-rooms:${action}] Supabase room runtime unavailable, fallback to memory: ${message}`,
  );
}

function shouldUseSupabaseRoomRuntime(session: ApiSession): boolean {
  return (
    session.mode === "supabase" &&
    isSupabaseConfigured() &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export async function listHocTapRoomsWithRuntime(session: ApiSession) {
  if (shouldUseSupabaseRoomRuntime(session)) {
    try {
      return {
        rooms: await listSupabaseHocTapRooms({ userId: session.userId }),
        persisted: true,
        source: "supabase",
      } satisfies RoomRuntimeMeta & { rooms: Awaited<ReturnType<typeof listSupabaseHocTapRooms>> };
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("list", error);
    }
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
    try {
      return {
        ...(await createSupabaseHocTapRoom({ userId: session.userId }, input)),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("create", error);
    }
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
    try {
      return {
        ...(await joinSupabaseHocTapRoom({ userId: session.userId }, input)),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("join", error);
    }
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
    try {
      return {
        room: await getSupabaseHocTapRoomSnapshot(
          { userId: session.userId },
          code,
          participantId,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("get", error);
    }
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
    try {
      return {
        room: await startSupabaseHocTapRoom(
          { userId: session.userId },
          code,
          options.participantId,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("start", error);
    }
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
    try {
      return {
        room: await submitSupabaseHocTapRoomAnswer(
          { userId: session.userId },
          input,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("answer", error);
    }
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
    try {
      return {
        room: await updateSupabaseHocTapRoomSettings(
          { userId: session.userId },
          input,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("settings", error);
    }
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
    try {
      return {
        ...(await deleteSupabaseHocTapRoom({ userId: session.userId }, input)),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("delete", error);
    }
  }

  return {
    ...deleteHocTapRoom(input),
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
    try {
      return {
        room: await advanceSupabaseHocTapRoom(
          { userId: session.userId },
          code,
          options.participantId,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("advance", error);
    }
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
    try {
      return {
        room: await updateSupabaseHocTapRoomQuestions(
          { userId: session.userId },
          input,
        ),
        persisted: true,
        source: "supabase",
      } as const;
    } catch (error) {
      if (!shouldFallbackToMemoryRuntime(error)) {
        throw error;
      }
      logRoomRuntimeFallback("questions", error);
    }
  }

  return {
    room: updateHocTapRoomQuestions(input),
    persisted: false,
    source: "memory",
  } as const;
}
