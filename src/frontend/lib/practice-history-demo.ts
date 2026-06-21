import type { PracticeReview } from "@/lib/client-api";

const PREFIX = "ai_troly_practice_history_";

export function getDemoPracticeHistory(moduleId: string): PracticeReview[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${PREFIX}${moduleId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PracticeReview[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDemoPracticeHistory(
  moduleId: string,
  entry: PracticeReview,
): PracticeReview[] {
  const prev = getDemoPracticeHistory(moduleId);
  const next = [entry, ...prev].slice(0, 20);
  localStorage.setItem(`${PREFIX}${moduleId}`, JSON.stringify(next));
  return next;
}

export function demoPracticeStats(history: PracticeReview[]) {
  const scores = history.map((h) => h.score);
  return {
    attemptCount: history.length,
    bestScore: scores.length > 0 ? Math.max(...scores) : 0,
    latestScore: history[0]?.score ?? null,
  };
}
