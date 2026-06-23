import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  client: null as ReturnType<typeof createFakeSupabase> | null,
  userId: "host-user",
  audiences: {
    "host-user": "org-1",
    "player-user": "org-1",
    "outside-user": "org-2",
  } as Record<string, string>,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => {
    if (!mockSupabase.client) {
      throw new Error("Fake Supabase client chưa được khởi tạo.");
    }
    return mockSupabase.client;
  },
}));

vi.mock("@/lib/hoc-tap-audience", () => ({
  resolveHocTapAudience: async () => {
    const organizationId = mockSupabase.audiences[mockSupabase.userId];
    if (!organizationId) throw new Error("Audience not configured");
    return {
      organizationId,
      organizationName:
        organizationId === "community-org" ? "Cộng đồng AI Trợ Lý" : organizationId,
      type: organizationId === "community-org" ? "community" : "company",
      departmentId: "khac",
    };
  },
}));

import {
  createSupabaseHocTapRoom,
  getSupabaseHocTapRoomSnapshot,
  joinSupabaseHocTapRoom,
  listSupabaseHocTapRooms,
} from "@/lib/hoc-tap-room-service";

type TableName =
  | "organization_members"
  | "hoc_tap_rooms"
  | "hoc_tap_room_participants"
  | "hoc_tap_room_answers";

type FakeDb = Record<TableName, Record<string, unknown>[]>;

function createFakeSupabase(seed?: Partial<FakeDb>) {
  const tables: FakeDb = {
    organization_members: seed?.organization_members?.map(cloneRow) ?? [],
    hoc_tap_rooms: seed?.hoc_tap_rooms?.map(cloneRow) ?? [],
    hoc_tap_room_participants:
      seed?.hoc_tap_room_participants?.map(cloneRow) ?? [],
    hoc_tap_room_answers: seed?.hoc_tap_room_answers?.map(cloneRow) ?? [],
  };

  class FakeQueryBuilder {
    private filters: Array<(row: Record<string, unknown>) => boolean> = [];
    private orderBy:
      | { field: string; ascending: boolean }
      | null = null;
    private limitCount: number | null = null;
    private patch: Record<string, unknown> | null = null;

    constructor(
      private readonly table: TableName,
      private readonly action: "select" | "update" | "delete",
    ) {}

    eq(field: string, value: unknown) {
      this.filters.push((row) => row[field] === value);
      return this;
    }

    in(field: string, values: unknown[]) {
      this.filters.push((row) => values.includes(row[field]));
      return this;
    }

    lt(field: string, value: unknown) {
      this.filters.push((row) => {
        const rowValue = row[field];
        if (typeof rowValue !== "string" || typeof value !== "string") {
          return false;
        }
        return rowValue < value;
      });
      return this;
    }

    order(field: string, options?: { ascending?: boolean }) {
      this.orderBy = { field, ascending: options?.ascending ?? true };
      return this;
    }

    limit(count: number) {
      this.limitCount = count;
      return this;
    }

    update(patch: Record<string, unknown>) {
      this.patch = patch;
      return this;
    }

    async maybeSingle() {
      const rows = this.runSelect();
      return { data: rows[0] ?? null, error: null };
    }

    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: Record<string, unknown>[] | null; error: null }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | null,
    ) {
      return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
    }

    private execute() {
      if (this.action === "select") {
        return { data: this.runSelect(), error: null };
      }
      if (this.action === "update") {
        for (const row of this.matchingRows()) {
          Object.assign(row, this.patch ?? {});
        }
        return { data: null, error: null };
      }

      const survivors = tables[this.table].filter(
        (row) => !this.filters.every((filter) => filter(row)),
      );
      tables[this.table] = survivors;
      return { data: null, error: null };
    }

    private matchingRows() {
      return tables[this.table].filter((row) =>
        this.filters.every((filter) => filter(row)),
      );
    }

    private runSelect() {
      const rows = this.matchingRows().map(cloneRow);
      if (this.orderBy) {
        rows.sort((a, b) => compareValues(
          a[this.orderBy!.field],
          b[this.orderBy!.field],
          this.orderBy!.ascending,
        ));
      }
      return this.limitCount === null ? rows : rows.slice(0, this.limitCount);
    }
  }

  return {
    from(table: TableName) {
      return {
        select: () => new FakeQueryBuilder(table, "select"),
        insert: async (payload: Record<string, unknown> | Record<string, unknown>[]) => {
          const rows = Array.isArray(payload) ? payload : [payload];
          tables[table].push(...rows.map(cloneRow));
          return { data: null, error: null };
        },
        update: (patch: Record<string, unknown>) =>
          new FakeQueryBuilder(table, "update").update(patch),
        delete: () => new FakeQueryBuilder(table, "delete"),
      };
    },
    getRows(table: TableName) {
      return tables[table].map(cloneRow);
    },
    async rpc(
      name: string,
      args: Record<string, unknown>,
    ): Promise<{ data: Record<string, unknown> | null; error: null }> {
      if (name === "join_hoc_tap_room_by_code") {
        const room = tables.hoc_tap_rooms.find(
          (row) => row.code === args.room_code,
        );
        if (
          !room ||
          room.organization_id !== mockSupabase.audiences[mockSupabase.userId]
        ) {
          return { data: { error_code: "ROOM_NOT_FOUND" }, error: null };
        }

        const existing = tables.hoc_tap_room_participants.find(
          (row) =>
            row.room_id === room.id &&
            row.user_id === mockSupabase.userId,
        );
        if (existing) {
          existing.display_name = args.player_name;
          existing.avatar_choice = args.player_avatar_choice;
          return {
            data: {
              room_id: room.id,
              organization_id: room.organization_id,
              participant_id: existing.id,
            },
            error: null,
          };
        }

        const participantId = String(args.requested_participant_id);
        const now = new Date().toISOString();
        tables.hoc_tap_room_participants.push({
          id: participantId,
          room_id: room.id,
          organization_id: room.organization_id,
          user_id: mockSupabase.userId,
          display_name: args.player_name,
          avatar_choice: args.player_avatar_choice,
          score: 0,
          is_host: false,
          joined_at: now,
          last_seen_at: now,
          created_at: now,
          updated_at: now,
        });
        return {
          data: {
            room_id: room.id,
            organization_id: room.organization_id,
            participant_id: participantId,
          },
          error: null,
        };
      }

      return { data: null, error: null };
    },
  };
}

function cloneRow<T extends Record<string, unknown>>(row: T): T {
  return structuredClone(row);
}

function compareValues(
  left: unknown,
  right: unknown,
  ascending: boolean,
): number {
  const normalizedLeft = String(left ?? "");
  const normalizedRight = String(right ?? "");
  if (normalizedLeft === normalizedRight) return 0;
  const base = normalizedLeft < normalizedRight ? -1 : 1;
  return ascending ? base : -base;
}

describe("hoc-tap room service", () => {
  beforeEach(() => {
    mockSupabase.userId = "host-user";
    mockSupabase.audiences = {
      "host-user": "org-1",
      "player-user": "org-1",
      "outside-user": "org-2",
      "community-a": "community-org",
      "community-b": "community-org",
    };
    mockSupabase.client = createFakeSupabase({
      organization_members: [
        { organization_id: "org-1", user_id: "host-user" },
        { organization_id: "org-1", user_id: "player-user" },
      ],
    });
  });

  it("keeps locked rooms visible in the live list and still lets teammates join by code", async () => {
    const created = await createSupabaseHocTapRoom(
      { userId: "host-user" },
      {
        hostName: "Host One",
        quizId: "ai-marketing",
        mode: "classic",
        locked: true,
      },
    );

    const rooms = await listSupabaseHocTapRooms({ userId: "player-user" });

    expect(rooms).toEqual([
      expect.objectContaining({
        code: created.room.code,
        isLocked: true,
        participantCount: 0,
      }),
    ]);

    mockSupabase.userId = "player-user";
    const joined = await joinSupabaseHocTapRoom(
      { userId: "player-user" },
      {
        code: created.room.code,
        playerName: "Lan Anh",
      },
    );

    expect(joined.room.participantCount).toBe(1);
    expect(joined.room.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: joined.participantId,
          name: "Lan Anh",
          isHost: false,
        }),
      ]),
    );
  });

  it("reuses the same participant row when the same user rejoins a room", async () => {
    const created = await createSupabaseHocTapRoom(
      { userId: "host-user" },
      {
        hostName: "Host One",
        quizId: "ai-marketing",
        mode: "classic",
      },
    );

    mockSupabase.userId = "player-user";
    const firstJoin = await joinSupabaseHocTapRoom(
      { userId: "player-user" },
      {
        code: created.room.code,
        playerName: "Lan Anh",
        avatarSeed: "dicebear:lan-anh::option-3",
      },
    );

    const secondJoin = await joinSupabaseHocTapRoom(
      { userId: "player-user" },
      {
        code: created.room.code,
        playerName: "Lan Anh",
        avatarSeed: "alohe:vibrent_7",
      },
    );

    const participantRows = mockSupabase.client!
      .getRows("hoc_tap_room_participants")
      .filter((row) => row.user_id === "player-user");

    expect(secondJoin.participantId).toBe(firstJoin.participantId);
    expect(
      participantRows.filter((row) => row.user_id === "player-user"),
    ).toHaveLength(1);
    expect(
      secondJoin.room.participants.find(
        (participant) => participant.id === firstJoin.participantId,
      )?.avatarUrl,
    ).toContain("vibrent_7");
  });

  it("blocks an account from another company even when it knows the room code", async () => {
    const created = await createSupabaseHocTapRoom(
      { userId: "host-user" },
      {
        hostName: "Host One",
        quizId: "ai-marketing",
        mode: "classic",
      },
    );

    mockSupabase.userId = "outside-user";
    await expect(
      joinSupabaseHocTapRoom(
        { userId: "outside-user" },
        {
          code: created.room.code,
          playerName: "Khách ngoài công ty",
        },
      ),
    ).rejects.toMatchObject({
      code: "ROOM_NOT_FOUND",
    });
    expect(
      mockSupabase.client!
        .getRows("hoc_tap_room_participants")
        .some((row) => row.user_id === "outside-user"),
    ).toBe(false);
  });

  it("lets personal accounts share the community room audience", async () => {
    mockSupabase.userId = "community-a";
    const created = await createSupabaseHocTapRoom(
      { userId: "community-a" },
      {
        hostName: "Cộng đồng A",
        quizId: "ai-marketing",
        mode: "classic",
      },
    );

    mockSupabase.userId = "community-b";
    const rooms = await listSupabaseHocTapRooms({ userId: "community-b" });
    expect(rooms.map((room) => room.code)).toContain(created.room.code);

    const joined = await joinSupabaseHocTapRoom(
      { userId: "community-b" },
      {
        code: created.room.code,
        playerName: "Cộng đồng B",
      },
    );
    expect(joined.room.viewerParticipantId).toBe(joined.participantId);
  });

  it("does not trust a stale participant id from another account", async () => {
    const created = await createSupabaseHocTapRoom(
      { userId: "host-user" },
      {
        hostName: "Host One",
        quizId: "ai-marketing",
        mode: "classic",
      },
    );

    const snapshot = await getSupabaseHocTapRoomSnapshot(
      { userId: "player-user" },
      created.room.code,
      created.participantId,
    );

    expect(snapshot.viewerParticipantId).toBeNull();
    expect(snapshot.isHost).toBe(false);
    expect(snapshot.canManageRoom).toBe(false);
  });
});
