import type {
  HocTapRoomParticipant,
  HocTapRoomPhase,
  HocTapRoomStatus,
} from "@/lib/hoc-tap-room-store";

export const DUCK_RACE_POINTS_PER_CORRECT = 100;
export const DUCK_RACE_SKIN_COUNT = 10;
export const DUCK_RACE_DUCK_NAMES = [
  "Vịt Vàng",
  "Vịt Lá",
  "Vịt Biển",
  "Vịt Hồng",
  "Vịt Cam",
  "Vịt Tím",
  "Vịt Bạc",
  "Vịt Đốm",
  "Vịt Nắng",
  "Vịt Mây",
] as const;

export type DuckRaceStanding = HocTapRoomParticipant & {
  rank: number;
  distancePercent: number;
  duckSkinIndex: number;
  duckName: string;
};

export function getHocTapRoomMapThemeLabel(
  mapTheme: "classic" | "duck-race",
): string {
  return mapTheme === "duck-race" ? "Đua vịt" : "Classic";
}

export function getDuckRaceMaxPossibleScore(
  questionCount: number,
  pointsPerCorrect = DUCK_RACE_POINTS_PER_CORRECT,
): number {
  return Math.max(0, questionCount) * Math.max(0, pointsPerCorrect);
}

export function getDuckRaceDistancePercent(
  score: number,
  maxPossibleScore: number,
): number {
  if (maxPossibleScore <= 0) return 0;
  return Math.min(100, Math.max(0, (score / maxPossibleScore) * 100));
}

export function getDuckRaceQuestionProgressPercent({
  questionCount,
  currentQuestionIndex,
  phase,
  status,
}: {
  questionCount: number;
  currentQuestionIndex: number;
  phase: HocTapRoomPhase;
  status: HocTapRoomStatus;
}): number {
  if (questionCount <= 0 || status === "waiting" || phase === "waiting") {
    return 0;
  }
  if (status === "finished" || phase === "finished") {
    return 100;
  }

  const completedQuestions =
    phase === "question"
      ? currentQuestionIndex
      : Math.min(questionCount, currentQuestionIndex + 1);
  return Math.min(100, Math.max(0, (completedQuestions / questionCount) * 100));
}

export function applyDuckRaceQuestionProgress(
  standings: DuckRaceStanding[],
  progressPercent: number,
): DuckRaceStanding[] {
  const normalizedProgress = Math.min(100, Math.max(0, progressPercent));
  return standings.map((participant) => ({
    ...participant,
    distancePercent: normalizedProgress,
  }));
}

export function getDuckRaceSkinIndex(
  participantOrder: number | string,
  skinCount = DUCK_RACE_SKIN_COUNT,
): number {
  if (skinCount <= 0) return 1;
  if (typeof participantOrder === "number") {
    return (Math.max(0, Math.floor(participantOrder)) % skinCount) + 1;
  }

  let hash = 0;
  for (const char of participantOrder) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return (hash % skinCount) + 1;
}

export function getDuckRaceDuckName(skinIndex: number): string {
  const normalizedIndex =
    getDuckRaceSkinIndex(skinIndex - 1, DUCK_RACE_DUCK_NAMES.length) - 1;
  return DUCK_RACE_DUCK_NAMES[normalizedIndex] ?? "Vịt Đua";
}

export function buildDuckRaceStandings(
  participants: HocTapRoomParticipant[],
  questionCount: number,
): DuckRaceStanding[] {
  void questionCount;
  const duckOrderByParticipant = new Map<string, number>();
  participants
    .slice()
    .sort(
      (left, right) =>
        left.joinedAt.localeCompare(right.joinedAt) ||
        left.id.localeCompare(right.id),
    )
    .forEach((participant, index) => {
      duckOrderByParticipant.set(participant.id, index);
    });
  const players = participants
    .slice()
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.joinedAt.localeCompare(right.joinedAt) ||
        left.id.localeCompare(right.id),
    );
  let lastScore: number | null = null;
  let lastRank = 0;

  return players.map((participant, index) => {
    if (lastScore === null || participant.score !== lastScore) {
      lastRank = index + 1;
      lastScore = participant.score;
    }

    const duckSkinIndex = getDuckRaceSkinIndex(
      duckOrderByParticipant.get(participant.id) ?? index,
    );

    return {
      ...participant,
      rank: lastRank,
      distancePercent: 0,
      duckSkinIndex,
      duckName: getDuckRaceDuckName(duckSkinIndex),
    };
  });
}

export function getDuckRaceOutcomeLabel(
  standings: DuckRaceStanding[],
): string {
  const topScore = standings[0]?.score ?? 0;
  if (standings.length === 0 || topScore <= 0) {
    return "Chưa có người chơi nào ghi điểm trong session này.";
  }

  const winners = standings.filter((participant) => participant.rank === 1);
  const winnerNames = winners.map((participant) => participant.name).join(", ");
  const reachedFinish = winners.every(
    (participant) => participant.distancePercent >= 100,
  );

  if (winners.length === 1) {
    return reachedFinish
      ? `${winnerNames} dẫn đầu với ${topScore} điểm và chạm vạch đích.`
      : `${winnerNames} dẫn đầu cuộc đua với ${topScore} điểm.`;
  }

  return reachedFinish
    ? `${winnerNames} đồng hạng nhất với ${topScore} điểm tại vạch đích.`
    : `${winnerNames} đồng hạng nhất với ${topScore} điểm.`;
}
