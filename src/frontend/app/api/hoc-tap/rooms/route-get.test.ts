import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
  listHocTapRoomsWithRuntime: vi.fn(),
  createHocTapRoomWithRuntime: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({
    mode: "supabase",
    userId: "user-1",
  })),
}));

vi.mock("@/lib/hoc-tap-room-runtime", () => ({
  listHocTapRoomsWithRuntime: runtimeMocks.listHocTapRoomsWithRuntime,
  createHocTapRoomWithRuntime: runtimeMocks.createHocTapRoomWithRuntime,
}));

import { HocTapRoomError } from "@/lib/hoc-tap-room-store";
import { GET, POST } from "./route";

describe("GET /api/hoc-tap/rooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a mapped JSON error when room listing throws", async () => {
    runtimeMocks.listHocTapRoomsWithRuntime.mockRejectedValueOnce(
      new Error('relation "hoc_tap_rooms" does not exist'),
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INTERNAL_ERROR",
        message: "Phòng quiz tạm thời chưa phản hồi.",
      },
    });
  });

  it("returns conflict when the current creator already has an active room", async () => {
    runtimeMocks.createHocTapRoomWithRuntime.mockRejectedValueOnce(
      new HocTapRoomError(
        "ACTIVE_ROOM_EXISTS",
        "Bạn đã có một phòng đang mở. Hãy rời & xoá phòng cũ trước khi tạo phòng mới.",
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/hoc-tap/rooms", {
        method: "POST",
        body: JSON.stringify({
          hostName: "Demo User",
          quizId: "ai-marketing",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "CONFLICT",
        message:
          "Bạn đã có một phòng đang mở. Hãy rời & xoá phòng cũ trước khi tạo phòng mới.",
      },
    });
  });
});
