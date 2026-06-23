import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
  listHocTapRoomsWithRuntime: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({
    mode: "supabase",
    userId: "user-1",
  })),
}));

vi.mock("@/lib/hoc-tap-room-runtime", () => ({
  listHocTapRoomsWithRuntime: runtimeMocks.listHocTapRoomsWithRuntime,
  createHocTapRoomWithRuntime: vi.fn(),
}));

import { GET } from "./route";

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
});
