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

  it("throws the Supabase list error in real mode instead of falling back to memory", async () => {
    serviceMocks.listSupabaseHocTapRooms.mockRejectedValueOnce(
      new Error('relation "hoc_tap_rooms" does not exist'),
    );

    await expect(
      listHocTapRoomsWithRuntime({
        mode: "supabase",
        userId: "user-1",
      }),
    ).rejects.toThrow('relation "hoc_tap_rooms" does not exist');
    expect(storeMocks.listHocTapPublicRooms).not.toHaveBeenCalled();
  });

  it("throws the Supabase snapshot error in real mode instead of falling back to memory", async () => {
    serviceMocks.getSupabaseHocTapRoomSnapshot.mockRejectedValueOnce(
      new storeMocks.HocTapRoomError(
        "ROOM_NOT_FOUND",
        "Không tìm thấy phòng trong Supabase runtime.",
      ),
    );

    await expect(
      getHocTapRoomWithRuntime(
        { mode: "supabase", userId: "user-1" },
        "ROOM42",
        "player-1",
      ),
    ).rejects.toThrow("Không tìm thấy phòng trong Supabase runtime.");
    expect(storeMocks.getHocTapRoomSnapshot).not.toHaveBeenCalled();
  });
});
