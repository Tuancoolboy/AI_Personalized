import { describe, expect, it } from "vitest";
import {
  DUCK_RACE_SKIN_COUNT,
  applyDuckRaceScoreProgress,
  buildDuckRaceStandings,
  getDuckRaceCorrectAnswerCount,
  getDuckRaceDistancePercent,
  getDuckRaceMaxPossibleScore,
  getDuckRaceOutcomeLabel,
  getDuckRaceParticipantProgressPercent,
  getDuckRaceSkinIndex,
  getHocTapRoomMapThemeLabel,
} from "@/lib/hoc-tap-duck-race";

describe("hoc-tap duck race helpers", () => {
  it("builds max score from question count", () => {
    expect(getDuckRaceMaxPossibleScore(5)).toBe(500);
    expect(getDuckRaceMaxPossibleScore(0)).toBe(0);
  });

  it("clamps distance percent into race bounds", () => {
    expect(getDuckRaceDistancePercent(0, 500)).toBe(0);
    expect(getDuckRaceDistancePercent(250, 500)).toBe(50);
    expect(getDuckRaceDistancePercent(800, 500)).toBe(100);
  });

  it("moves each duck by its own correct-answer progress", () => {
    const base = buildDuckRaceStandings(
      [
        {
          id: "p1",
          name: "Lan",
          initials: "LA",
          avatarUrl: "",
          score: 100,
          isHost: false,
          joinedAt: "2026-06-23T10:00:00.000Z",
        },
        {
          id: "p2",
          name: "Minh",
          initials: "MH",
          avatarUrl: "",
          score: 0,
          isHost: false,
          joinedAt: "2026-06-23T10:01:00.000Z",
        },
      ],
      3,
    );

    expect(getDuckRaceCorrectAnswerCount(250)).toBe(2);
    expect(
      getDuckRaceParticipantProgressPercent({
        score: 100,
        questionCount: 3,
      }),
    ).toBeCloseTo(100 / 3);
    expect(
      getDuckRaceParticipantProgressPercent({
        score: 300,
        questionCount: 3,
      }),
    ).toBe(100);
    const scoreProgress = applyDuckRaceScoreProgress(base, 3).map(
      (participant) => participant.distancePercent,
    );
    expect(scoreProgress[0]).toBeCloseTo(100 / 3);
    expect(scoreProgress[1]).toBe(0);
    expect(base.map((participant) => participant.rank)).toEqual([1, 2]);
    expect(base[0]?.distancePercent).toBeCloseTo(100 / 3);
    expect(base[1]?.distancePercent).toBe(0);
  });

  it("cycles duck skins and labels ducks with user names", () => {
    expect(getDuckRaceSkinIndex(0)).toBe(1);
    expect(getDuckRaceSkinIndex(DUCK_RACE_SKIN_COUNT)).toBe(1);

    const participants = Array.from({ length: DUCK_RACE_SKIN_COUNT + 2 }, (_, index) => ({
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      initials: `P${index + 1}`,
      avatarUrl: "",
      score: 0,
      isHost: false,
      joinedAt: `2026-06-23T10:${String(index).padStart(2, "0")}:00.000Z`,
    }));
    const standings = buildDuckRaceStandings(participants, 3);
    const byId = new Map(standings.map((standing) => [standing.id, standing]));

    expect(byId.get("p1")).toMatchObject({
      duckSkinIndex: 1,
      duckName: "Player 1",
    });
    expect(byId.get(`p${DUCK_RACE_SKIN_COUNT + 1}`)).toMatchObject({
      duckSkinIndex: 1,
      duckName: "Player 11",
    });
    expect(byId.get(`p${DUCK_RACE_SKIN_COUNT + 2}`)).toMatchObject({
      duckSkinIndex: 2,
      duckName: "Player 12",
    });
  });

  it("sorts players, assigns shared ranks, and keeps per-score distance", () => {
    const standings = buildDuckRaceStandings(
      [
        {
          id: "p1",
          name: "Lan",
          initials: "LA",
          avatarUrl: "",
          score: 200,
          isHost: false,
          joinedAt: "2026-06-23T10:00:00.000Z",
        },
        {
          id: "p2",
          name: "Minh",
          initials: "MH",
          avatarUrl: "",
          score: 300,
          isHost: false,
          joinedAt: "2026-06-23T10:01:00.000Z",
        },
        {
          id: "p3",
          name: "An",
          initials: "AN",
          avatarUrl: "",
          score: 200,
          isHost: false,
          joinedAt: "2026-06-23T10:02:00.000Z",
        },
      ],
      4,
    );

    expect(standings.map((item) => item.id)).toEqual(["p2", "p1", "p3"]);
    expect(standings.map((item) => item.rank)).toEqual([1, 2, 2]);
    expect(standings.map((item) => item.distancePercent)).toEqual([
      75,
      50,
      50,
    ]);
  });

  it("describes solo winners, ties, and scoreless sessions accurately", () => {
    const solo = buildDuckRaceStandings(
      [
        {
          id: "p1",
          name: "Lan",
          initials: "LA",
          avatarUrl: "",
          score: 300,
          isHost: false,
          joinedAt: "2026-06-23T10:00:00.000Z",
        },
      ],
      3,
    );
    const tie = buildDuckRaceStandings(
      [
        {
          id: "p1",
          name: "Lan",
          initials: "LA",
          avatarUrl: "",
          score: 200,
          isHost: false,
          joinedAt: "2026-06-23T10:00:00.000Z",
        },
        {
          id: "p2",
          name: "Minh",
          initials: "MH",
          avatarUrl: "",
          score: 200,
          isHost: false,
          joinedAt: "2026-06-23T10:01:00.000Z",
        },
      ],
      3,
    );
    const scoreless = buildDuckRaceStandings(
      [
        {
          id: "p3",
          name: "An",
          initials: "AN",
          avatarUrl: "",
          score: 0,
          isHost: false,
          joinedAt: "2026-06-23T10:02:00.000Z",
        },
      ],
      3,
    );

    expect(getDuckRaceOutcomeLabel(solo)).toContain("chạm vạch đích");
    expect(getDuckRaceOutcomeLabel(tie)).toBe(
      "Lan, Minh đồng hạng nhất với 200 điểm.",
    );
    expect(getDuckRaceOutcomeLabel(scoreless)).toBe(
      "Chưa có người chơi nào ghi điểm trong session này.",
    );
  });

  it("returns the correct map label", () => {
    expect(getHocTapRoomMapThemeLabel("classic")).toBe("Classic");
    expect(getHocTapRoomMapThemeLabel("duck-race")).toBe("Đua vịt");
  });
});
