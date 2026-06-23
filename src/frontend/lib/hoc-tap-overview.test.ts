import { describe, expect, it } from "vitest";
import {
  buildDemoHocTapOverview,
  buildHocTapOverviewRange,
  buildHocTapOverviewSummary,
  calculateStudyHeartbeatSeconds,
} from "@/lib/hoc-tap-overview";

const NOW = new Date("2026-06-20T16:00:00.000Z");

describe("hoc-tap overview", () => {
  it("builds 7-day boundaries in Asia/Ho_Chi_Minh", () => {
    const range = buildHocTapOverviewRange(7, NOW);
    expect(range).toMatchObject({
      days: 7,
      from: "2026-06-14",
      to: "2026-06-20",
      previousFrom: "2026-06-07",
      previousTo: "2026-06-13",
      timezone: "Asia/Ho_Chi_Minh",
    });
  });

  it("aggregates current and previous periods without mixing metrics", () => {
    const summary = buildHocTapOverviewSummary({
      days: 7,
      now: NOW,
      quizzes: [
        { createdAt: "2026-06-20T01:00:00.000Z", quizId: "quiz-a" },
        { createdAt: "2026-06-18T01:00:00.000Z", quizId: "quiz-b" },
        { createdAt: "2026-06-10T01:00:00.000Z", quizId: "quiz-a" },
      ],
      progress: [
        { status: "hoan-thanh", completedAt: "2026-06-19T01:00:00.000Z" },
        { status: "hoan-thanh", completedAt: "2026-05-01T01:00:00.000Z" },
        { status: "dang-hoc" },
      ],
      studySessions: [
        { startedAt: "2026-06-20T01:00:00.000Z", durationSeconds: 1800 },
        { startedAt: "2026-06-11T01:00:00.000Z", durationSeconds: 600 },
      ],
      points: [
        { createdAt: "2026-06-20T01:00:00.000Z", points: 50 },
        { createdAt: "2026-06-10T01:00:00.000Z", points: 20 },
      ],
    });

    expect(summary.stats.quizAttempts).toEqual({ value: 2, delta: 1 });
    expect(summary.stats.studyMinutes).toEqual({ value: 30, delta: 20 });
    expect(summary.stats.moduleProgress).toEqual({ completed: 2, inProgress: 1 });
    expect(summary.stats.completedQuizzes).toBe(2);
    expect(summary.xp).toMatchObject({
      totalXp: 70,
      level: 1,
      currentXp: 70,
      periodEarned: 50,
      previousPeriodEarned: 20,
    });
    expect(summary.daily).toHaveLength(7);
    expect(summary.daily.find((row) => row.date === "2026-06-20")).toMatchObject({
      quizAttempts: 1,
      studyMinutes: 30,
      xpEarned: 50,
      xpCumulative: 70,
    });
  });

  it("returns stable empty-series values", () => {
    const summary = buildHocTapOverviewSummary({ days: 30, now: NOW });
    expect(summary.daily).toHaveLength(30);
    expect(summary.stats.quizAttempts).toEqual({ value: 0, delta: 0 });
    expect(summary.stats.studyMinutes).toEqual({ value: 0, delta: 0 });
  });

  it("caps heartbeat time so hidden tabs cannot inflate study time", () => {
    expect(
      calculateStudyHeartbeatSeconds(
        "2026-06-20T15:58:00.000Z",
        new Date("2026-06-20T16:00:00.000Z"),
      ),
    ).toBe(45);
    expect(
      calculateStudyHeartbeatSeconds(
        "2026-06-20T16:00:10.000Z",
        new Date("2026-06-20T16:00:00.000Z"),
      ),
    ).toBe(0);
  });

  it("starts demo mode at zero without generated fixtures", () => {
    const summary = buildDemoHocTapOverview(7, NOW);
    expect(summary.daily).toHaveLength(7);
    expect(summary.stats.quizAttempts.value).toBe(0);
    expect(summary.stats.studyMinutes.value).toBe(0);
    expect(summary.xp.totalXp).toBe(0);
    expect(summary.leaderboard.individuals).toEqual([]);
  });
});
