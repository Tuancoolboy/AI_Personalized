// Lưu trữ tạm trong localStorage khi chưa có Supabase (demo mode).
// Khi cấu hình Supabase thật → các hàm trong /lib/supabase/* sẽ thay thế.

import type { AssessmentResult } from "./assessment";
import type { LearningProfile } from "./learning-profile";

const KEYS = {
  profile: "ai_troly_demo_profile",
  progress: "ai_troly_demo_progress",
  timeLogs: "ai_troly_demo_time_logs",
  quizResults: "ai_troly_demo_quiz_results",
} as const;

export type DemoProfile = {
  roleId: string;
  fullName?: string;
  assessment?: AssessmentResult;
  dailyTasks?: string[];
  learningProfile?: LearningProfile;
  createdAt: string;
};

export type DemoProgress = {
  // moduleId -> status
  [moduleId: string]: "chua-hoc" | "dang-hoc" | "hoan-thanh";
};

export type DemoTimeLog = {
  id: string;
  hoursSaved: number;
  usefulness?: number;
  note?: string;
  loggedAt: string;
};

export type DemoQuizResult = {
  id: string;
  roleId: string;
  score: number; // 0-100
  passed: boolean;
  createdAt: string;
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode errors
  }
}

// PROFILE
export function getDemoProfile(): DemoProfile | null {
  return read<DemoProfile | null>(KEYS.profile, null);
}

export function saveDemoProfile(profile: DemoProfile): void {
  write(KEYS.profile, profile);
}

export function clearDemoData(): void {
  if (typeof window === "undefined") return;
  for (const key of Object.values(KEYS)) {
    window.localStorage.removeItem(key);
  }
}

// PROGRESS
export function getDemoProgress(): DemoProgress {
  return read<DemoProgress>(KEYS.progress, {});
}

export function setModuleStatus(
  moduleId: string,
  status: "chua-hoc" | "dang-hoc" | "hoan-thanh",
): DemoProgress {
  const current = getDemoProgress();
  const next = { ...current, [moduleId]: status };
  write(KEYS.progress, next);
  return next;
}

// TIME LOGS
export function getDemoTimeLogs(): DemoTimeLog[] {
  return read<DemoTimeLog[]>(KEYS.timeLogs, []);
}

export function addDemoTimeLog(
  hoursSaved: number,
  usefulness?: number,
  note?: string,
): DemoTimeLog[] {
  const logs = getDemoTimeLogs();
  const newLog: DemoTimeLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    hoursSaved,
    usefulness,
    note,
    loggedAt: new Date().toISOString(),
  };
  const next = [newLog, ...logs];
  write(KEYS.timeLogs, next);
  return next;
}

export function getTotalHoursSaved(): number {
  return getDemoTimeLogs().reduce((sum, log) => sum + log.hoursSaved, 0);
}

// QUIZ RESULTS
export function getDemoQuizResults(): DemoQuizResult[] {
  return read<DemoQuizResult[]>(KEYS.quizResults, []);
}

export function addDemoQuizResult(
  roleId: string,
  score: number,
): DemoQuizResult[] {
  const results = getDemoQuizResults();
  const newResult: DemoQuizResult = {
    id: `quiz-${Date.now()}`,
    roleId,
    score,
    passed: score >= 70,
    createdAt: new Date().toISOString(),
  };
  const next = [newResult, ...results];
  write(KEYS.quizResults, next);
  return next;
}

export function getAverageQuizScore(): number {
  const results = getDemoQuizResults();
  if (results.length === 0) return 0;
  return Math.round(
    results.reduce((sum, r) => sum + r.score, 0) / results.length,
  );
}
