import { describe, expect, it } from "vitest";
import {
  clearHocTapRoomIdentity,
  getHocTapRoomIdentityStorageKey,
  readHocTapRoomIdentity,
  saveHocTapRoomIdentity,
} from "@/lib/hoc-tap-room-identity";

function createMemoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  };
}

describe("hoc-tap room identity", () => {
  it("uses the same account-scoped key for create and room screens", () => {
    const storage = createMemoryStorage();
    saveHocTapRoomIdentity(
      "ab-12",
      "demo-user",
      {
        participantId: "host-player",
        hostToken: "host-token",
      },
      storage,
    );

    expect(readHocTapRoomIdentity("AB12", "demo-user", storage)).toEqual({
      participantId: "host-player",
      hostToken: "host-token",
    });
    expect(
      storage.values.has(
        getHocTapRoomIdentityStorageKey("AB12", "demo-user"),
      ),
    ).toBe(true);
  });

  it("migrates the legacy room key without dropping the host token", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "ai_troly_hoc_tap_room_AB12",
      JSON.stringify({
        participantId: "host-player",
        hostToken: "host-token",
      }),
    );

    expect(readHocTapRoomIdentity("AB12", "demo-user", storage)).toEqual({
      participantId: "host-player",
      hostToken: "host-token",
    });
    expect(storage.getItem("ai_troly_hoc_tap_room_AB12")).toBeNull();
  });

  it("recovers identity saved under a display-name alias after email hydrate", () => {
    const storage = createMemoryStorage();
    saveHocTapRoomIdentity(
      "AB12",
      "demo user",
      {
        participantId: "host-player",
        hostToken: "host-token",
      },
      storage,
    );

    expect(
      readHocTapRoomIdentity(
        "AB12",
        "demo@example.com",
        ["demo user"],
        storage,
      ),
    ).toEqual({
      participantId: "host-player",
      hostToken: "host-token",
    });
    expect(
      storage.values.has(
        getHocTapRoomIdentityStorageKey("AB12", "demo@example.com"),
      ),
    ).toBe(true);
  });

  it("clears both current and legacy keys", () => {
    const storage = createMemoryStorage();
    saveHocTapRoomIdentity(
      "AB12",
      "demo-user",
      { participantId: "player" },
      storage,
    );
    storage.setItem(
      "ai_troly_hoc_tap_room_AB12",
      JSON.stringify({ participantId: "legacy" }),
    );

    clearHocTapRoomIdentity("AB12", "demo-user", storage);

    expect(storage.values.size).toBe(0);
  });
});
