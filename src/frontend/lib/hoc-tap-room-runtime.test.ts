import { beforeEach, describe, expect, it, vi } from "vitest";

const serviceMocks = vi.hoisted(() => ({
  listSupabaseHocTapRooms: vi.fn(),
  getSupabaseHocTapRoomSnapshot: vi.fn(),
}));

const storeMocks = vi.hoisted(() => {
  class MockHocTapRoomError extends Error {
    code: string;

    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  }

  return {
    HocTapRoomError: MockHocTapRoomError,
    listHocTapPublicRooms: vi.fn(),
    getHocTapRoomSnapshot: vi.fn(),
    createHocTapRoom: vi.fn(),
    joinHocTapRoom: vi.fn(),
    startHocTapRoom: vi.fn(),
    submitHocTapRoomAnswer: vi.fn(),
    updateHocTapRoomSettings: vi.fn(),
    deleteHocTapRoom: vi.fn(),
    advanceHocTapRoom: vi.fn(),
    updateHocTapRoomQuestions: vi.fn(),
  };
});

vi.mock("@/lib/supabase/is-configured", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/hoc-tap-room-service", () => ({
  listSupabaseHocTapRooms: serviceMocks.listSupabaseHocTapRooms,
  createSupabaseHocTapRoom: vi.fn(),
  joinSupabaseHocTapRoom: vi.fn(),
  getSupabaseHocTapRoomSnapshot: serviceMocks.getSupabaseHocTapRoomSnapshot,
  startSupabaseHocTapRoom: vi.fn(),
  submitSupabaseHocTapRoomAnswer: vi.fn(),
  updateSupabaseHocTapRoomSettings: vi.fn(),
  deleteSupabaseHocTapRoom: vi.fn(),
  advanceSupabaseHocTapRoom: vi.fn(),
  updateSupabaseHocTapRoomQuestions: vi.fn(),
}));

vi.mock("@/lib/hoc-tap-room-store", () => ({
  HocTapRoomError: storeMocks.HocTapRoomError,
  listHocTapPublicRooms: storeMocks.listHocTapPublicRooms,
  getHocTapRoomSnapshot: storeMocks.getHocTapRoomSnapshot,
  createHocTapRoom: storeMocks.createHocTapRoom,
  joinHocTapRoom: storeMocks.joinHocTapRoom,
  startHocTapRoom: storeMocks.startHocTapRoom,
  submitHocTapRoomAnswer: storeMocks.submitHocTapRoomAnswer,
  updateHocTapRoomSettings: storeMocks.updateHocTapRoomSettings,
  deleteHocTapRoom: storeMocks.deleteHocTapRoom,
  advanceHocTapRoom: storeMocks.advanceHocTapRoom,
  updateHocTapRoomQuestions: storeMocks.updateHocTapRoomQuestions,
}));

import {
  getHocTapRoomWithRuntime,
  listHocTapRoomsWithRuntime,
} from "@/lib/hoc-tap-room-runtime";

describe("hoc-tap room runtime", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";
    vi.clearAllMocks();
  });

  it("falls back to memory rooms when the Supabase list runtime throws", async () => {
    serviceMocks.listSupabaseHocTapRooms.mockRejectedValueOnce(
      new Error('relation "hoc_tap_rooms" does not exist'),
    );
    storeMocks.listHocTapPublicRooms.mockReturnValueOnce([
      {
        code: "ABC123",
        quizId: "ai-marketing",
        title: "AI Marketing",
        category: "Marketing",
        isLocked: false,
        status: "waiting",
        mode: "classic",
        roomType: "host-review",
        hostMode: "human",
        phase: "waiting",
        hostName: "Lan Anh",
        hostAvatarUrl: "/avatar.png",
        participantCount: 1,
        maxPlayers: 20,
        questionCount: 10,
        createdAt: "2026-06-22T10:00:00.000Z",
        updatedAt: "2026-06-22T10:00:00.000Z",
      },
    ]);

    const response = await listHocTapRoomsWithRuntime({
      mode: "supabase",
      userId: "user-1",
    });

    expect(response).toMatchObject({
      persisted: false,
      source: "memory",
      rooms: [
        expect.objectContaining({
          code: "ABC123",
        }),
      ],
    });
  });

  it("falls back to memory snapshot when Supabase cannot find a room created in fallback mode", async () => {
    serviceMocks.getSupabaseHocTapRoomSnapshot.mockRejectedValueOnce(
      new storeMocks.HocTapRoomError(
        "ROOM_NOT_FOUND",
        "Không tìm thấy phòng trong Supabase runtime.",
      ),
    );
    storeMocks.getHocTapRoomSnapshot.mockReturnValueOnce({
      code: "ROOM42",
      quizId: "ai-marketing",
      title: "AI Marketing",
      category: "Marketing",
      isLocked: false,
      status: "waiting",
      mode: "classic",
      roomType: "host-review",
      hostMode: "human",
      phase: "waiting",
      hostName: "Lan Anh",
      hostParticipantId: "host-1",
      participantCount: 1,
      maxPlayers: 20,
      questionCount: 10,
      currentQuestionIndex: 0,
      questionEndsAt: null,
      phaseEndsAt: null,
      answeredPlayerCount: 0,
      createdAt: "2026-06-22T10:00:00.000Z",
      updatedAt: "2026-06-22T10:00:00.000Z",
      participants: [],
      currentQuestion: null,
      reviewQuestions: null,
      viewerAnswer: null,
      viewerParticipantId: "player-1",
      isHost: false,
      canManageRoom: false,
      canStart: false,
      leaderboard: [],
      roundTopFive: [],
      finalTopThree: [],
    });

    const response = await getHocTapRoomWithRuntime(
      { mode: "supabase", userId: "user-1" },
      "ROOM42",
      "player-1",
    );

    expect(response).toMatchObject({
      persisted: false,
      source: "memory",
      room: expect.objectContaining({
        code: "ROOM42",
        viewerParticipantId: "player-1",
      }),
    });
  });
});
