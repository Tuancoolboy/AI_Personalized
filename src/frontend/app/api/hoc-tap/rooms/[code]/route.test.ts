import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({ userId: "demo-user" })),
}));

import {
  createHocTapRoom,
  getHocTapRoomSnapshot,
  joinHocTapRoom,
  resetHocTapRoomStoreForTests,
} from "@/lib/hoc-tap-room-store";
import {
  DELETE as DELETE_ROOM,
  PATCH,
} from "./route";
import { POST as LEAVE_ROOM } from "./leave/route";
import { POST as START_ROOM } from "./start/route";

describe("/api/hoc-tap/rooms/[code]", () => {
  beforeEach(() => {
    resetHocTapRoomStoreForTests();
  });

  it("locks a human-hosted room via PATCH", async () => {
    const created = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });

    const response = await PATCH(
      new Request(`http://localhost/api/hoc-tap/rooms/${created.room.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked: true,
          hostToken: created.hostToken,
        }),
      }),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      room: {
        code: created.room.code,
        isLocked: true,
      },
    });
  });

  it("uses participantId to lock a system-hosted room", async () => {
    const created = createHocTapRoom({
      hostName: "Lan Anh",
      quizId: "ai-ban-hang",
      entryRole: "player",
    });

    const response = await PATCH(
      new Request(`http://localhost/api/hoc-tap/rooms/${created.room.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked: true,
          participantId: created.participantId,
        }),
      }),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      room: {
        code: created.room.code,
        isLocked: true,
        canManageRoom: true,
      },
    });
  });

  it("rejects non-controller system-hosted room updates", async () => {
    const created = createHocTapRoom({
      hostName: "Lan Anh",
      quizId: "ai-ban-hang",
      entryRole: "player",
    });
    const joined = joinHocTapRoom({
      code: created.room.code,
      playerName: "Minh",
    });

    const response = await PATCH(
      new Request(`http://localhost/api/hoc-tap/rooms/${created.room.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locked: true,
          participantId: joined.participantId,
        }),
      }),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(403);
  });

  it("deletes a room via DELETE", async () => {
    const created = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });

    const response = await DELETE_ROOM(
      new Request(`http://localhost/api/hoc-tap/rooms/${created.room.code}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostToken: created.hostToken,
        }),
      }),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: created.room.code,
      deleted: true,
    });
  });

  it("starts and locks a room via POST /start", async () => {
    const created = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });

    const response = await START_ROOM(
      new Request(
        `http://localhost/api/hoc-tap/rooms/${created.room.code}/start`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostToken: created.hostToken,
            participantId: created.participantId,
          }),
        },
      ),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      room: {
        code: created.room.code,
        status: "playing",
        isLocked: true,
      },
    });
  });

  it("lets a player leave via POST /leave without deleting the room", async () => {
    const created = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });
    const joined = joinHocTapRoom({
      code: created.room.code,
      playerName: "Lan Anh",
    });

    const response = await LEAVE_ROOM(
      new Request(
        `http://localhost/api/hoc-tap/rooms/${created.room.code}/leave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: joined.participantId,
          }),
        },
      ),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: created.room.code,
      roomDeleted: false,
    });
    expect(getHocTapRoomSnapshot(created.room.code).participantCount).toBe(1);
  });

  it("deletes the room when the host leaves via POST /leave", async () => {
    const created = createHocTapRoom({
      hostName: "Host One",
      quizId: "ai-marketing",
    });

    const response = await LEAVE_ROOM(
      new Request(
        `http://localhost/api/hoc-tap/rooms/${created.room.code}/leave`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantId: created.participantId,
            hostToken: created.hostToken,
          }),
        },
      ),
      { params: Promise.resolve({ code: created.room.code }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      code: created.room.code,
      roomDeleted: true,
    });
    expect(() => getHocTapRoomSnapshot(created.room.code)).toThrow(
      "Không tìm thấy phòng",
    );
  });
});
