import type { HocTapRoomParticipant } from "@/lib/hoc-tap-room-store";

export const DUCK_RACE_POINTS_PER_CORRECT = 100;
export const DUCK_RACE_SKIN_COUNT = 10;

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

export function getDuckRaceCorrectAnswerCount(
  score: number,
  pointsPerCorrect = DUCK_RACE_POINTS_PER_CORRECT,
): number {
  if (pointsPerCorrect <= 0) return 0;
  return Math.max(0, Math.floor(score / pointsPerCorrect));
}

export function getDuckRaceParticipantProgressPercent({
  score,
  questionCount,
}: {
  score: number;
  questionCount: number;
}): number {
  const maxPossibleScore = getDuckRaceMaxPossibleScore(questionCount);
  return getDuckRaceDistancePercent(score, maxPossibleScore);
}

export function applyDuckRaceScoreProgress(
  standings: DuckRaceStanding[],
  questionCount: number,
): DuckRaceStanding[] {
  return standings.map((participant) => ({
    ...participant,
    distancePercent: getDuckRaceParticipantProgressPercent({
      score: participant.score,
      questionCount,
    }),
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

export function buildDuckRaceStandings(
  participants: HocTapRoomParticipant[],
  questionCount: number,
): DuckRaceStanding[] {
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
      distancePercent: getDuckRaceParticipantProgressPercent({
        score: participant.score,
        questionCount,
      }),
      duckSkinIndex,
      duckName: participant.name,
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
