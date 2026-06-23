import {
  getDemoHocTapQuizProgress,
  resolveHocTapLevelProgress,
} from "@/lib/hoc-tap-quiz-catalog";

export const HOC_TAP_OVERVIEW_DAYS = [7, 30] as const;
export type HocTapOverviewDays = (typeof HOC_TAP_OVERVIEW_DAYS)[number];

export type HocTapOverviewDaily = {
  date: string;
  quizAttempts: number;
  completedModules: number;
  studyMinutes: number;
  xpEarned: number;
  xpCumulative: number;
};

export type HocTapLeaderboardRow = {
  userId: string;
  name: string;
  departmentId: string;
  departmentLabel: string;
  totalXp: number;
  rank: number;
  isCurrentUser: boolean;
};

export type HocTapDepartmentLeaderboardRow = {
  departmentId: string;
  departmentLabel: string;
  totalXp: number;
  memberCount: number;
  rank: number;
};

export type HocTapOverviewResponse = {
  ok: boolean;
  range: {
    days: HocTapOverviewDays;
    from: string;
    to: string;
    previousFrom: string;
    previousTo: string;
    timezone: "Asia/Ho_Chi_Minh";
  };
  stats: {
    quizAttempts: { value: number; delta: number };
    completedQuizzes: number;
    studyMinutes: { value: number; delta: number };
    moduleProgress: { completed: number; inProgress: number };
  };
  audience: {
    type: "community" | "company";
    organizationId: string;
    name: string;
  };
  xp: {
    totalXp: number;
    level: number;
    currentXp: number;
    targetXp: number;
    rank: number | null;
    periodEarned: number;
    previousPeriodEarned: number;
  };
  attemptedQuizIds: string[];
  leaderboard: {
    individuals: HocTapLeaderboardRow[];
    departments: HocTapDepartmentLeaderboardRow[];
  };
  daily: HocTapOverviewDaily[];
};

export type HocTapOverviewQuizRow = {
  createdAt: string;
  quizId?: string | null;
};
export type HocTapOverviewProgressRow = {
  status: string;
  completedAt?: string | null;
};
export type HocTapOverviewStudyRow = {
  startedAt: string;
  durationSeconds: number;
};
export type HocTapOverviewPointRow = {
  createdAt: string;
  points: number;
};

const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEMO_STUDY_KEY = "ai_troly_demo_learning_study";

type OverviewRange = HocTapOverviewResponse["range"] & {
  fromMs: number;
  toExclusiveMs: number;
  previousFromMs: number;
};

export function isHocTapOverviewDays(value: number): value is HocTapOverviewDays {
  return HOC_TAP_OVERVIEW_DAYS.includes(value as HocTapOverviewDays);
}

export function buildHocTapOverviewRange(
  days: HocTapOverviewDays,
  now = new Date(),
): OverviewRange {
  const vietnamNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const toExclusiveMs =
    Date.UTC(
      vietnamNow.getUTCFullYear(),
      vietnamNow.getUTCMonth(),
      vietnamNow.getUTCDate() + 1,
    ) - VIETNAM_OFFSET_MS;
  const fromMs = toExclusiveMs - days * DAY_MS;
  const previousFromMs = fromMs - days * DAY_MS;

  return {
    days,
    from: toVietnamDateKey(fromMs),
    to: toVietnamDateKey(toExclusiveMs - 1),
    previousFrom: toVietnamDateKey(previousFromMs),
    previousTo: toVietnamDateKey(fromMs - 1),
    timezone: "Asia/Ho_Chi_Minh",
    fromMs,
    toExclusiveMs,
    previousFromMs,
  };
}

export function buildHocTapOverviewSummary(input: {
  days: HocTapOverviewDays;
  now?: Date;
  quizzes?: HocTapOverviewQuizRow[];
  progress?: HocTapOverviewProgressRow[];
  studySessions?: HocTapOverviewStudyRow[];
  points?: HocTapOverviewPointRow[];
  audience?: HocTapOverviewResponse["audience"];
  rank?: number | null;
  leaderboard?: HocTapOverviewResponse["leaderboard"];
}): HocTapOverviewResponse {
  const range = buildHocTapOverviewRange(input.days, input.now);
  const quizzes = input.quizzes ?? [];
  const progress = input.progress ?? [];
  const studySessions = input.studySessions ?? [];
  const points = input.points ?? [];
  const daily = new Map<string, HocTapOverviewDaily>();

  for (let offset = 0; offset < range.days; offset += 1) {
    const date = toVietnamDateKey(range.fromMs + offset * DAY_MS);
    daily.set(date, {
      date,
      quizAttempts: 0,
      completedModules: 0,
      studyMinutes: 0,
      xpEarned: 0,
      xpCumulative: 0,
    });
  }

  let currentQuizAttempts = 0;
  let previousQuizAttempts = 0;
  for (const row of quizzes) {
    const timestamp = Date.parse(row.createdAt);
    if (!Number.isFinite(timestamp)) continue;
    if (timestamp >= range.fromMs && timestamp < range.toExclusiveMs) {
      currentQuizAttempts += 1;
      const item = daily.get(toVietnamDateKey(timestamp));
      if (item) item.quizAttempts += 1;
    } else if (timestamp >= range.previousFromMs && timestamp < range.fromMs) {
      previousQuizAttempts += 1;
    }
  }

  for (const row of progress) {
    if (row.status !== "hoan-thanh" || !row.completedAt) continue;
    const timestamp = Date.parse(row.completedAt);
    if (timestamp >= range.fromMs && timestamp < range.toExclusiveMs) {
      const item = daily.get(toVietnamDateKey(timestamp));
      if (item) item.completedModules += 1;
    }
  }

  let currentStudySeconds = 0;
  let previousStudySeconds = 0;
  for (const row of studySessions) {
    const timestamp = Date.parse(row.startedAt);
    const duration = clampStudySeconds(row.durationSeconds);
    if (!Number.isFinite(timestamp) || duration <= 0) continue;
    if (timestamp >= range.fromMs && timestamp < range.toExclusiveMs) {
      currentStudySeconds += duration;
      const item = daily.get(toVietnamDateKey(timestamp));
      if (item) item.studyMinutes += duration / 60;
    } else if (timestamp >= range.previousFromMs && timestamp < range.fromMs) {
      previousStudySeconds += duration;
    }
  }

  const currentStudyMinutes = Math.round(currentStudySeconds / 60);
  const previousStudyMinutes = Math.round(previousStudySeconds / 60);
  let currentXp = 0;
  let previousXp = 0;
  let totalXp = 0;

  for (const row of points) {
    const timestamp = Date.parse(row.createdAt);
    const pointValue = Math.max(0, Math.round(row.points));
    if (!Number.isFinite(timestamp) || pointValue <= 0) continue;
    totalXp += pointValue;

    if (timestamp >= range.fromMs && timestamp < range.toExclusiveMs) {
      currentXp += pointValue;
      const item = daily.get(toVietnamDateKey(timestamp));
      if (item) item.xpEarned += pointValue;
    } else if (timestamp >= range.previousFromMs && timestamp < range.fromMs) {
      previousXp += pointValue;
    }
  }

  const dailyRows = [...daily.values()].map((row) => ({
    ...row,
    studyMinutes: Math.round(row.studyMinutes),
  }));
  let cumulativeXp = Math.max(0, totalXp - currentXp);
  for (const row of dailyRows) {
    cumulativeXp += row.xpEarned;
    row.xpCumulative = cumulativeXp;
  }

  const levelProgress = resolveHocTapLevelProgress(totalXp);
  const attemptedQuizIds = [
    ...new Set(
      quizzes
        .map((row) => row.quizId)
        .filter((quizId): quizId is string => Boolean(quizId)),
    ),
  ];

  return {
    ok: true,
    range: {
      days: range.days,
      from: range.from,
      to: range.to,
      previousFrom: range.previousFrom,
      previousTo: range.previousTo,
      timezone: range.timezone,
    },
    stats: {
      quizAttempts: {
        value: currentQuizAttempts,
        delta: currentQuizAttempts - previousQuizAttempts,
      },
      completedQuizzes: attemptedQuizIds.length,
      studyMinutes: {
        value: currentStudyMinutes,
        delta: currentStudyMinutes - previousStudyMinutes,
      },
      moduleProgress: {
        completed: progress.filter((row) => row.status === "hoan-thanh").length,
        inProgress: progress.filter((row) => row.status === "dang-hoc").length,
      },
    },
    audience: input.audience ?? {
      type: "community",
      organizationId: "demo-community",
      name: "Cộng đồng AI Trợ Lý",
    },
    xp: {
      totalXp: levelProgress.totalXp,
      level: levelProgress.level,
      currentXp: levelProgress.currentXp,
      targetXp: levelProgress.targetXp,
      rank: input.rank ?? null,
      periodEarned: currentXp,
      previousPeriodEarned: previousXp,
    },
    attemptedQuizIds,
    leaderboard: input.leaderboard ?? {
      individuals: [],
      departments: [],
    },
    daily: dailyRows,
  };
}

export function calculateStudyHeartbeatSeconds(
  lastSeenAt: string,
  now = new Date(),
): number {
  const elapsed = Math.floor((now.getTime() - Date.parse(lastSeenAt)) / 1000);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return 0;
  return Math.min(elapsed, 45);
}

export function addDemoStudySeconds(
  moduleId: string,
  seconds: number,
  at = new Date(),
): void {
  if (typeof window === "undefined") return;
  const safeSeconds = clampStudySeconds(seconds);
  if (!moduleId || safeSeconds <= 0) return;
  const rows = getDemoStudySessions();
  rows.push({ startedAt: at.toISOString(), durationSeconds: safeSeconds });
  try {
    window.localStorage.setItem(DEMO_STUDY_KEY, JSON.stringify(rows.slice(-500)));
    window.dispatchEvent(new Event("hoc-tap-overview-updated"));
  } catch {
    // Demo tracking is best effort in private/quota-limited browsers.
  }
}

export function getDemoStudySessions(): HocTapOverviewStudyRow[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DEMO_STUDY_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStudyRow).map((row) => ({
      startedAt: row.startedAt,
      durationSeconds: clampStudySeconds(row.durationSeconds),
    }));
  } catch {
    return [];
  }
}

export function buildDemoHocTapOverview(
  days: HocTapOverviewDays,
  now = new Date(),
): HocTapOverviewResponse {
  const demoProgress = getDemoHocTapQuizProgress();
  return buildHocTapOverviewSummary({
    days,
    now,
    quizzes: demoProgress.attempts.map((attempt) => ({
      createdAt: attempt.createdAt,
      quizId: attempt.quizId,
    })),
    points: demoProgress.attempts.map((attempt) => ({
      createdAt: attempt.createdAt,
      points: attempt.xpEarned,
    })),
    studySessions: getDemoStudySessions(),
  });
}

function clampStudySeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(28800, Math.max(0, Math.round(value)));
}

function isStudyRow(value: unknown): value is HocTapOverviewStudyRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HocTapOverviewStudyRow>;
  return typeof row.startedAt === "string" && typeof row.durationSeconds === "number";
}

function toVietnamDateKey(timestamp: number): string {
  return new Date(timestamp + VIETNAM_OFFSET_MS).toISOString().slice(0, 10);
}
