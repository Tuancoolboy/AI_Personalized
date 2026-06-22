import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSupabase = vi.hoisted(() => ({
  client: null as ReturnType<typeof createFakeSupabase> | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: () => {
    if (!mockSupabase.client) {
      throw new Error("Fake Supabase client chưa được khởi tạo.");
    }
    return mockSupabase.client;
  },
}));

import {
  createSupabaseHocTapRoom,
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
});
