import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260623023753_hoc_tap_real_xp_audience.sql",
  ),
  "utf8",
);
const mapThemeMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260623093000_hoc_tap_room_map_theme.sql",
  ),
  "utf8",
);
const humanHostMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260623133848_hoc_tap_human_host_player.sql",
  ),
  "utf8",
);
const roomLifecycleMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260623145414_hoc_tap_room_leave_and_start_lock.sql",
  ),
  "utf8",
);
const hostSpectatorCapacityMigration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260623163938_hoc_tap_room_host_spectator_capacity.sql",
  ),
  "utf8",
);

describe("hoc-tap real XP migration contract", () => {
  it("keeps quiz XP server-only and idempotent", () => {
    expect(migration).toContain("quiz_results_user_attempt_key");
    expect(migration).toContain(
      "current_user_id::text || ':' || p_attempt_id::text",
    );
    expect(migration).toContain("and quiz_source = 'learning'");
    expect(migration).toContain(
      "grant execute on function public.record_hoc_tap_quiz_attempt",
    );
    expect(migration).toContain("to service_role;");
    expect(migration).toContain(
      "revoke all on function public.record_hoc_tap_quiz_attempt",
    );
    expect(migration).toContain(
      "drop policy if exists points_ledger_insert_own",
    );
    expect(migration).toContain(
      "'xp_earned', 0,\n      'total_xp', total_xp",
    );
  });

  it("isolates room list, create, preview and join by current audience", () => {
    expect(migration).toContain(
      "organization_id = public.current_hoc_tap_audience_org_id()",
    );
    expect(migration).toContain("rooms.organization_id = audience_id");
    expect(migration).toContain("'ROOM_NOT_FOUND'");
    expect(migration).not.toContain(
      "rooms.code = normalized_code\n  for update;",
    );
  });

  it("does not create community membership rows", () => {
    expect(migration).toContain("'ai-tro-ly-community'");
    expect(migration).toContain(
      "and organizations.name = 'Tổ chức mặc định';",
    );
    expect(migration).not.toMatch(
      /insert\s+into\s+public\.organization_members/i,
    );
  });

  it("adds a room map theme column and returns it in preview payloads", () => {
    expect(mapThemeMigration).toContain(
      "add column if not exists map_theme text not null default 'classic'",
    );
    expect(mapThemeMigration).toContain(
      "check (map_theme in ('classic', 'duck-race'))",
    );
    expect(mapThemeMigration).toContain("'map_theme', rooms.map_theme");
  });

  it("overrides room preview and capacity to exclude spectator hosts", () => {
    expect(humanHostMigration).toContain("rooms.host_mode = 'human'");
    expect(hostSpectatorCapacityMigration).toContain(
      "and not players.is_host",
    );
    expect(hostSpectatorCapacityMigration).toContain(
      "and not participants.is_host",
    );
    expect(hostSpectatorCapacityMigration).not.toContain(
      "target_room.host_mode = 'human'",
    );
  });

  it("allows a participant to leave and blocks new joins after the room starts", () => {
    expect(roomLifecycleMigration).toContain(
      "hoc_tap_room_participants_delete_self",
    );
    expect(roomLifecycleMigration).toContain("user_id = auth.uid()");
    expect(roomLifecycleMigration).toContain("target_room.status <> 'waiting'");
    expect(roomLifecycleMigration).toContain("'ROOM_LOCKED'");
  });
});
