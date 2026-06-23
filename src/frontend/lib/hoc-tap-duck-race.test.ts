import { describe, expect, it } from "vitest";
import {
  DUCK_RACE_DUCK_NAMES,
  applyDuckRaceQuestionProgress,
  buildDuckRaceStandings,
  getDuckRaceDuckName,
  getDuckRaceDistancePercent,
  getDuckRaceMaxPossibleScore,
  getDuckRaceOutcomeLabel,
  getDuckRaceQuestionProgressPercent,
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

  it("moves every duck one equal segment for each completed question", () => {
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
    const progress = (phase: "waiting" | "question" | "reveal" | "finished", index: number) =>
      getDuckRaceQuestionProgressPercent({
        questionCount: 3,
        currentQuestionIndex: index,
        phase,
        status: phase === "waiting" ? "waiting" : phase === "finished" ? "finished" : "playing",
      });

    expect(progress("waiting", 0)).toBe(0);
    expect(progress("question", 0)).toBe(0);
    expect(progress("reveal", 0)).toBeCloseTo(100 / 3);
    expect(progress("question", 1)).toBeCloseTo(100 / 3);
    expect(progress("reveal", 1)).toBeCloseTo(200 / 3);
    expect(progress("finished", 2)).toBe(100);
    expect(
      applyDuckRaceQuestionProgress(base, progress("finished", 2)).map(
        (participant) => participant.distancePercent,
      ),
    ).toEqual([100, 100]);
    expect(base.map((participant) => participant.rank)).toEqual([1, 2]);
    expect(base.map((participant) => participant.distancePercent)).toEqual([0, 0]);
  });

  it("cycles duck skins and names when players exceed available duck sprites", () => {
    expect(getDuckRaceSkinIndex(0)).toBe(1);
    expect(getDuckRaceSkinIndex(DUCK_RACE_DUCK_NAMES.length)).toBe(1);
    expect(getDuckRaceDuckName(1)).toBe("Vịt Vàng");

    const participants = Array.from({ length: DUCK_RACE_DUCK_NAMES.length + 2 }, (_, index) => ({
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
      duckName: "Vịt Vàng",
    });
    expect(byId.get(`p${DUCK_RACE_DUCK_NAMES.length + 1}`)).toMatchObject({
      duckSkinIndex: 1,
      duckName: "Vịt Vàng",
    });
    expect(byId.get(`p${DUCK_RACE_DUCK_NAMES.length + 2}`)).toMatchObject({
      duckSkinIndex: 2,
      duckName: "Vịt Lá",
    });
  });

  it("keeps a playable human host, sorts players, and assigns shared ranks", () => {
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
          id: "host",
          name: "Host",
          initials: "HT",
          avatarUrl: "",
          score: 900,
          isHost: true,
          joinedAt: "2026-06-23T09:59:00.000Z",
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

    expect(standings.map((item) => item.id)).toEqual([
      "host",
      "p2",
      "p1",
      "p3",
    ]);
    expect(standings.map((item) => item.rank)).toEqual([1, 2, 3, 3]);
    expect(standings.map((item) => item.distancePercent)).toEqual([
      0,
      0,
      0,
      0,
    ]);
    expect(
      applyDuckRaceQuestionProgress(standings, 75).map(
        (item) => item.distancePercent,
      ),
    ).toEqual([75, 75, 75, 75]);
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

    expect(getDuckRaceOutcomeLabel(applyDuckRaceQuestionProgress(solo, 100)))
      .toContain("chạm vạch đích");
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
