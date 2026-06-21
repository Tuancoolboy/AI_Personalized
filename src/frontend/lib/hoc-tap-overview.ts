export const HOC_TAP_OVERVIEW_DAYS = [7, 30] as const;
export type HocTapOverviewDays = (typeof HOC_TAP_OVERVIEW_DAYS)[number];

export type HocTapOverviewDaily = {
  date: string;
  quizAttempts: number;
  completedModules: number;
  studyMinutes: number;
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
    studyMinutes: { value: number; delta: number };
    moduleProgress: { completed: number; inProgress: number };
  };
  daily: HocTapOverviewDaily[];
};

export type HocTapOverviewQuizRow = { createdAt: string };
export type HocTapOverviewProgressRow = {
  status: string;
  completedAt?: string | null;
};
export type HocTapOverviewStudyRow = {
  startedAt: string;
  durationSeconds: number;
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
}): HocTapOverviewResponse {
  const range = buildHocTapOverviewRange(input.days, input.now);
  const quizzes = input.quizzes ?? [];
  const progress = input.progress ?? [];
  const studySessions = input.studySessions ?? [];
  const daily = new Map<string, HocTapOverviewDaily>();

  for (let offset = 0; offset < range.days; offset += 1) {
    const date = toVietnamDateKey(range.fromMs + offset * DAY_MS);
    daily.set(date, { date, quizAttempts: 0, completedModules: 0, studyMinutes: 0 });
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

  const dailyRows = [...daily.values()].map((row) => ({
    ...row,
    studyMinutes: Math.round(row.studyMinutes),
  }));
  const currentStudyMinutes = Math.round(currentStudySeconds / 60);
  const previousStudyMinutes = Math.round(previousStudySeconds / 60);

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
      studyMinutes: {
        value: currentStudyMinutes,
        delta: currentStudyMinutes - previousStudyMinutes,
      },
      moduleProgress: {
        completed: progress.filter((row) => row.status === "hoan-thanh").length,
        inProgress: progress.filter((row) => row.status === "dang-hoc").length,
      },
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
  const range = buildHocTapOverviewRange(days, now);
  const stored = getDemoStudySessions();
  const studySessions = stored.length > 0 ? stored : buildDemoStudyFixture(range, now);
  const quizzes = [1, 2, 3, 5, 6].map((daysAgo) => ({
    createdAt: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
  }));
  const progress: HocTapOverviewProgressRow[] = [
    { status: "hoan-thanh", completedAt: new Date(now.getTime() - DAY_MS).toISOString() },
    { status: "hoan-thanh", completedAt: new Date(now.getTime() - 4 * DAY_MS).toISOString() },
    { status: "dang-hoc" },
  ];
  return buildHocTapOverviewSummary({ days, now, quizzes, progress, studySessions });
}

function buildDemoStudyFixture(range: OverviewRange, now: Date): HocTapOverviewStudyRow[] {
  const minutes = [36, 51, 45, 80, 36, 52, 47];
  return minutes.map((durationMinutes, index) => ({
    startedAt: new Date(
      Math.max(range.fromMs, now.getTime() - (minutes.length - index - 1) * DAY_MS),
    ).toISOString(),
    durationSeconds: durationMinutes * 60,
  }));
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
