import {
  getHocTapQuiz,
  type HocTapPlayableQuiz,
  type HocTapQuizQuestion,
} from "@/lib/hoc-tap-quiz-catalog";
import { buildDicebearAvatarUrl } from "@/lib/dicebear";

export type HocTapRoomStatus = "waiting" | "playing" | "finished";
export type HocTapRoomMode = "classic" | "team-battle";
export type HocTapRoomType = "host-review" | "ai-secret";
export type HocTapRoomEntryRole = "host" | "player";
export type HocTapRoomHostMode = "human" | "system";
export type HocTapRoomPhase =
  | "waiting"
  | "question"
  | "reveal"
  | "leaderboard"
  | "finished";

export type HocTapRoomAiProjectInput = {
  title: string;
  topic: string;
  context?: string;
  questionCount?: number;
  difficulty?: string;
};

export type HocTapRoomCreateInput = {
  hostName: string;
  avatarSeed?: string;
  quizId?: string;
  aiProject?: HocTapRoomAiProjectInput;
  questions?: HocTapRoomQuestionInput[];
  mode?: HocTapRoomMode;
  roomType?: HocTapRoomType;
  maxPlayers?: number;
  entryRole?: HocTapRoomEntryRole;
  locked?: boolean;
};

export type HocTapRoomJoinInput = {
  code: string;
  playerName: string;
  avatarSeed?: string;
};

export type HocTapRoomAnswerInput = {
  code: string;
  participantId: string;
  questionIndex: number;
  answerIndex: number;
};

export type HocTapRoomUpdateQuestionsInput = {
  code: string;
  hostToken: string;
  questions: HocTapRoomQuestionInput[];
};

export type HocTapRoomQuestionInput = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type HocTapRoomParticipant = {
  id: string;
  name: string;
  initials: string;
  avatarUrl: string;
  score: number;
  isHost: boolean;
  joinedAt: string;
};

export type HocTapRoomQuestionSnapshot = {
  id: string;
  question: string;
  options: string[];
  explanation?: string;
  correctIndex?: number;
};

export type HocTapRoomViewerAnswer = {
  questionIndex: number;
  answerIndex: number;
  revealed: boolean;
  isCorrect?: boolean;
  points?: number;
  explanation?: string;
  correctIndex?: number;
};

export type HocTapRoomSnapshot = {
  code: string;
  quizId: string;
  title: string;
  category: string;
  isLocked: boolean;
  status: HocTapRoomStatus;
  mode: HocTapRoomMode;
  roomType: HocTapRoomType;
  hostMode: HocTapRoomHostMode;
  phase: HocTapRoomPhase;
  hostName: string;
  hostParticipantId: string;
  participantCount: number;
  maxPlayers: number;
  questionCount: number;
  currentQuestionIndex: number;
  questionEndsAt: string | null;
  phaseEndsAt: string | null;
  answeredPlayerCount: number;
  createdAt: string;
  updatedAt: string;
  participants: HocTapRoomParticipant[];
  currentQuestion: HocTapRoomQuestionSnapshot | null;
  reviewQuestions: HocTapRoomQuestionSnapshot[] | null;
  viewerAnswer: HocTapRoomViewerAnswer | null;
  viewerParticipantId: string | null;
  isHost: boolean;
  canManageRoom: boolean;
  canStart: boolean;
  leaderboard: HocTapRoomParticipant[];
  roundTopFive: HocTapRoomParticipant[];
  finalTopThree: HocTapRoomParticipant[];
};

export type HocTapPublicRoom = {
  code: string;
  quizId: string;
  title: string;
  category: string;
  isLocked: boolean;
  status: HocTapRoomStatus;
  mode: HocTapRoomMode;
  roomType: HocTapRoomType;
  hostMode: HocTapRoomHostMode;
  phase: HocTapRoomPhase;
  hostName: string;
  hostAvatarUrl: string;
  participantCount: number;
  maxPlayers: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type HocTapRoomCreateResult = {
  room: HocTapRoomSnapshot;
  participantId: string;
  hostToken?: string;
};

export type HocTapRoomUpdateSettingsInput = {
  code: string;
  locked: boolean;
  hostToken?: string;
  participantId?: string;
};

export type HocTapRoomDeleteInput = {
  code: string;
  hostToken?: string;
  participantId?: string;
};

export type HocTapRoomJoinResult = {
  room: HocTapRoomSnapshot;
  participantId: string;
};

type ParticipantAnswer = {
  answerIndex: number;
  isCorrect: boolean;
  points: number;
};

type StoredParticipant = HocTapRoomParticipant & {
  answers: Record<number, ParticipantAnswer>;
};

type StoredRoom = {
  code: string;
  quizId: string;
  title: string;
  category: string;
  isLocked: boolean;
  hostParticipantId: string;
  hostToken: string | null;
  status: HocTapRoomStatus;
  mode: HocTapRoomMode;
  roomType: HocTapRoomType;
  hostMode: HocTapRoomHostMode;
  phase: HocTapRoomPhase;
  startControllerParticipantId: string | null;
  maxPlayers: number;
  currentQuestionIndex: number;
  phaseEndsAt: string | null;
  questionEndsAt: string | null;
  roundTopFive: HocTapRoomParticipant[];
  finalTopThree: HocTapRoomParticipant[];
  questions: HocTapQuizQuestion[];
  createdAt: string;
  updatedAt: string;
  participants: StoredParticipant[];
};

type StoreState = {
  rooms: Map<string, StoredRoom>;
};

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_CODE_LENGTH = 6;
const DEFAULT_MAX_PLAYERS = 20;
const MIN_MAX_PLAYERS = 2;
const MAX_MAX_PLAYERS = 50;
const ANSWER_POINTS = 100;
const AI_PROJECT_QUIZ_ID = "ai-project";
const SYSTEM_HOST_NAME = "AI Host";
const QUESTION_DURATION_MS = 60_000;
const REVEAL_DURATION_MS = 5_000;
const LEADERBOARD_DURATION_MS = 4_000;

const globalRoomState = globalThis as typeof globalThis & {
  __hocTapRoomStore?: StoreState;
};

function getStoreState(): StoreState {
  if (!globalRoomState.__hocTapRoomStore) {
    globalRoomState.__hocTapRoomStore = { rooms: new Map() };
  }
  return globalRoomState.__hocTapRoomStore;
}

export function createHocTapRoom(
  input: HocTapRoomCreateInput,
): HocTapRoomCreateResult {
  const displayName = normalizeDisplayName(input.hostName);
  const avatarSeed = normalizeAvatarSeed(input.avatarSeed);
  const roomType = input.roomType ?? "host-review";
  const roomContent = resolveRoomContent(input, roomType);
  const entryRole = input.entryRole ?? "host";
  const hostMode: HocTapRoomHostMode =
    entryRole === "player" ? "system" : "human";
  const state = getStoreState();
  const now = new Date().toISOString();
  const hostParticipantId = createId("player");
  const hostToken = hostMode === "human" ? createId("host") : null;
  const participants: StoredParticipant[] = [
    {
      id: hostParticipantId,
      name: hostMode === "system" ? SYSTEM_HOST_NAME : displayName,
      initials:
        hostMode === "system"
          ? getInitials(SYSTEM_HOST_NAME)
          : getInitials(displayName),
      avatarUrl: buildParticipantAvatarUrl(
        hostMode === "system" ? hostParticipantId : avatarSeed ?? hostParticipantId,
      ),
      score: 0,
      isHost: true,
      joinedAt: now,
      answers: {},
    },
  ];
  let participantId = hostParticipantId;

  if (entryRole === "player" && hostMode === "system") {
    participantId = createId("player");
    participants.push({
      id: participantId,
      name: displayName,
      initials: getInitials(displayName),
      avatarUrl: buildParticipantAvatarUrl(avatarSeed ?? participantId),
      score: 0,
      isHost: false,
      joinedAt: now,
      answers: {},
    });
  }

  const room: StoredRoom = {
    code: generateUniqueRoomCode(state.rooms),
    quizId: roomContent.quizId,
    title: roomContent.title,
    category: roomContent.category,
    isLocked: input.locked ?? false,
    hostParticipantId,
    hostToken,
    status: "waiting",
    mode: input.mode ?? "classic",
    roomType,
    hostMode,
    phase: "waiting",
    startControllerParticipantId:
      hostMode === "system" ? participantId : null,
    maxPlayers: clampMaxPlayers(input.maxPlayers),
    currentQuestionIndex: 0,
    phaseEndsAt: null,
    questionEndsAt: null,
    roundTopFive: [],
    finalTopThree: [],
    questions:
      roomType === "ai-secret"
        ? shuffleQuestions(roomContent.questions)
        : cloneQuestions(roomContent.questions),
    createdAt: now,
    updatedAt: now,
    participants,
  };

  state.rooms.set(room.code, room);

  return {
    room: serializeRoom(room, participantId),
    participantId,
    hostToken: room.hostToken ?? undefined,
  };
}

export function joinHocTapRoom(
  input: HocTapRoomJoinInput,
): HocTapRoomJoinResult {
  const code = normalizeRoomCode(input.code);
  const room = getRequiredRoom(code);
  settleRoomState(room);
  const name = normalizeDisplayName(input.playerName);
  const avatarSeed = normalizeAvatarSeed(input.avatarSeed);

  if (room.status === "finished") {
    throw new HocTapRoomError(
      "ROOM_FINISHED",
      "Phòng này đã kết thúc. Hãy tạo phòng mới để chơi lại.",
    );
  }

  const existing = room.participants.find(
    (participant) =>
      normalizeSearch(participant.name) === normalizeSearch(name),
  );

  if (existing) {
    if (avatarSeed) {
      existing.avatarUrl = buildParticipantAvatarUrl(avatarSeed);
      room.updatedAt = new Date().toISOString();
    }
    return {
      room: serializeRoom(room, existing.id),
      participantId: existing.id,
    };
  }

  if (getPlayers(room).length >= room.maxPlayers) {
    throw new HocTapRoomError("ROOM_FULL", "Phòng đã đủ người chơi.");
  }

  const now = new Date().toISOString();
  const participant: StoredParticipant = {
    id: createId("player"),
    name,
    initials: getInitials(name),
    avatarUrl: "",
    score: 0,
    isHost: false,
    joinedAt: now,
    answers: {},
  };

  participant.avatarUrl = buildParticipantAvatarUrl(avatarSeed ?? participant.id);

  room.participants.push(participant);
  room.updatedAt = now;

  return {
    room: serializeRoom(room, participant.id),
    participantId: participant.id,
  };
}

export function getHocTapRoomSnapshot(
  code: string,
  participantId?: string | null,
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(code));
  settleRoomState(room);
  return serializeRoom(room, participantId ?? null);
}

export function listHocTapPublicRooms(): HocTapPublicRoom[] {
  const rooms = [...getStoreState().rooms.values()]
    .map((room) => {
      settleRoomState(room);
      return room;
    })
    .filter((room) => room.status !== "finished")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return rooms.map((room) => {
    return {
      code: room.code,
      quizId: room.quizId,
      title: room.title,
      category: room.category,
      isLocked: room.isLocked,
      status: room.status,
      mode: room.mode,
      roomType: room.roomType,
      hostMode: room.hostMode,
      phase: room.phase,
      hostName: getHost(room).name,
      hostAvatarUrl: getHost(room).avatarUrl,
      participantCount: getPlayers(room).length,
      maxPlayers: room.maxPlayers,
      questionCount: room.questions.length,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  });
}

export function startHocTapRoom(
  code: string,
  options: {
    hostToken?: string;
    participantId?: string;
  },
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(code));
  settleRoomState(room);
  assertRoomController(room, options, "Chỉ người tạo phòng mới bắt đầu được phòng này.");

  if (room.status !== "waiting") {
    throw new HocTapRoomError(
      "ROOM_NOT_WAITING",
      "Phòng đã bắt đầu hoặc đã kết thúc.",
    );
  }
  if (getPlayers(room).length === 0) {
    throw new HocTapRoomError(
      "ROOM_EMPTY",
      "Cần ít nhất 1 người chơi trước khi bắt đầu.",
    );
  }
  startQuestionPhase(room);

  return serializeRoom(
    room,
    resolveViewerIdForControllerAction(room, options),
  );
}

export function submitHocTapRoomAnswer(
  input: HocTapRoomAnswerInput,
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(input.code));
  settleRoomState(room);

  if (room.status !== "playing" || room.phase !== "question") {
    throw new HocTapRoomError("ROOM_NOT_PLAYING", "Phòng chưa ở trạng thái chơi.");
  }

  if (input.questionIndex !== room.currentQuestionIndex) {
    throw new HocTapRoomError(
      "QUESTION_MISMATCH",
      "Câu hỏi hiện tại đã thay đổi. Hãy tải lại phòng.",
    );
  }

  const participant = room.participants.find(
    (item) => item.id === input.participantId,
  );

  if (!participant) {
    throw new HocTapRoomError(
      "PLAYER_NOT_FOUND",
      "Bạn chưa tham gia phòng này.",
    );
  }
  if (participant.isHost) {
    throw new HocTapRoomError(
      "HOST_CANNOT_ANSWER",
      "Host chỉ điều khiển phòng và không tham gia trả lời.",
    );
  }

  const question = getQuestionAt(room.questions, room.currentQuestionIndex);
  const answerIndex = Number(input.answerIndex);
  if (
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex >= question.options.length
  ) {
    throw new HocTapRoomError("INVALID_ANSWER", "Đáp án không hợp lệ.");
  }

  if (!participant.answers[room.currentQuestionIndex]) {
    const isCorrect = answerIndex === question.correctIndex;
    const points = isCorrect ? ANSWER_POINTS : 0;
    participant.answers[room.currentQuestionIndex] = {
      answerIndex,
      isCorrect,
      points,
    };
    participant.score += points;
    room.updatedAt = new Date().toISOString();

    if (haveAllPlayersAnswered(room, room.currentQuestionIndex)) {
      openRevealPhase(room);
    }
  }

  settleRoomState(room);
  return serializeRoom(room, participant.id);
}

export function advanceHocTapRoom(
  code: string,
  hostToken: string,
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(code));
  settleRoomState(room);
  assertHostToken(room, hostToken);

  if (room.hostMode !== "human") {
    throw new HocTapRoomError(
      "FORBIDDEN",
      "Phòng hệ thống không cần host chuyển thủ công.",
    );
  }
  if (room.status === "waiting") {
    return startHocTapRoom(code, { hostToken });
  }

  if (room.status !== "playing") {
    throw new HocTapRoomError("ROOM_NOT_PLAYING", "Phòng chưa bắt đầu.");
  }

  forceAdvancePhase(room);
  return serializeRoom(room, room.hostParticipantId);
}

export function updateHocTapRoomQuestions(
  input: HocTapRoomUpdateQuestionsInput,
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(input.code));
  settleRoomState(room);
  assertHostToken(room, input.hostToken);

  if (room.status !== "waiting") {
    throw new HocTapRoomError(
      "ROOM_NOT_WAITING",
      "Chỉ có thể sửa bộ câu hỏi trước khi phòng bắt đầu.",
    );
  }
  if (room.roomType !== "host-review") {
    throw new HocTapRoomError(
      "FORBIDDEN",
      "Phòng bí mật không cho xem hoặc sửa bộ câu hỏi trước.",
    );
  }

  room.questions = normalizeQuestionInputs(input.questions);
  room.currentQuestionIndex = 0;
  room.updatedAt = new Date().toISOString();
  return serializeRoom(room, room.hostParticipantId);
}

export function updateHocTapRoomSettings(
  input: HocTapRoomUpdateSettingsInput,
): HocTapRoomSnapshot {
  const room = getRequiredRoom(normalizeRoomCode(input.code));
  settleRoomState(room);
  assertRoomController(room, input);
  room.isLocked = input.locked;
  room.updatedAt = new Date().toISOString();
  return serializeRoom(room, resolveViewerIdForControllerAction(room, input));
}

export function deleteHocTapRoom(
  input: HocTapRoomDeleteInput,
): { code: string } {
  const code = normalizeRoomCode(input.code);
  const room = getRequiredRoom(code);
  settleRoomState(room);
  assertRoomController(room, input);
  getStoreState().rooms.delete(code);
  return { code };
}

export function resetHocTapRoomStoreForTests() {
  getStoreState().rooms.clear();
}

export class HocTapRoomError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "INVALID_QUIZ"
      | "ROOM_NOT_FOUND"
      | "ROOM_FULL"
      | "ROOM_FINISHED"
      | "ROOM_NOT_WAITING"
      | "ROOM_NOT_PLAYING"
      | "ROOM_EMPTY"
      | "QUESTION_MISMATCH"
      | "PLAYER_NOT_FOUND"
      | "HOST_CANNOT_ANSWER"
      | "INVALID_ANSWER"
      | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "HocTapRoomError";
  }
}

function serializeRoom(
  room: StoredRoom,
  viewerParticipantId: string | null,
): HocTapRoomSnapshot {
  const viewer = viewerParticipantId
    ? room.participants.find((participant) => participant.id === viewerParticipantId)
    : null;
  const question =
    room.status === "playing" &&
    (room.phase === "question" ||
      room.phase === "reveal" ||
      room.phase === "leaderboard")
      ? getQuestionAt(room.questions, room.currentQuestionIndex)
      : null;
  const answer = viewer?.answers[room.currentQuestionIndex] ?? null;
  const isHost = viewer?.isHost ?? false;
  const canManageRoom = canViewerManageRoom(room, viewerParticipantId);
  const isAnswerRevealVisible =
    room.phase === "reveal" || room.phase === "leaderboard";
  const currentQuestion =
    question && room.status === "playing"
      ? serializeQuestion(
          question,
          isAnswerRevealVisible || (isHost && room.roomType === "host-review"),
        )
      : null;
  const leaderboard = buildLeaderboard(room);
  const answeredPlayerCount =
    room.status === "playing" &&
    (room.phase === "question" ||
      room.phase === "reveal" ||
      room.phase === "leaderboard")
      ? countAnsweredPlayers(room, room.currentQuestionIndex)
      : 0;

  return {
    code: room.code,
    quizId: room.quizId,
    title: room.title,
    category: room.category,
    isLocked: room.isLocked,
    status: room.status,
    mode: room.mode,
    roomType: room.roomType,
    hostMode: room.hostMode,
    phase: room.phase,
    hostName: getHost(room).name,
    hostParticipantId: room.hostParticipantId,
    participantCount: getPlayers(room).length,
    maxPlayers: room.maxPlayers,
    questionCount: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex,
    questionEndsAt: room.questionEndsAt,
    phaseEndsAt: room.phaseEndsAt,
    answeredPlayerCount,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    participants: room.participants.map(stripAnswers),
    currentQuestion,
    reviewQuestions:
      isHost &&
      room.hostMode === "human" &&
      room.roomType === "host-review" &&
      room.status === "waiting"
        ? room.questions.map((item) => serializeQuestion(item, true))
        : null,
    viewerAnswer:
      answer && question
        ? {
            questionIndex: room.currentQuestionIndex,
            answerIndex: answer.answerIndex,
            revealed: isAnswerRevealVisible,
            isCorrect: isAnswerRevealVisible ? answer.isCorrect : undefined,
            points: isAnswerRevealVisible ? answer.points : undefined,
            explanation: isAnswerRevealVisible
              ? question.explanation
              : undefined,
            correctIndex: isAnswerRevealVisible
              ? question.correctIndex
              : undefined,
          }
        : null,
    viewerParticipantId: viewer?.id ?? viewerParticipantId,
    isHost,
    canManageRoom,
    canStart: room.status === "waiting" && canManageRoom,
    leaderboard,
    roundTopFive: room.roundTopFive.map((participant) => ({ ...participant })),
    finalTopThree: room.finalTopThree.map((participant) => ({ ...participant })),
  };
}

function serializeQuestion(
  question: HocTapQuizQuestion,
  includeAnswer: boolean,
): HocTapRoomQuestionSnapshot {
  return {
    id: question.question,
    question: question.question,
    options: question.options,
    explanation: includeAnswer ? question.explanation : undefined,
    correctIndex: includeAnswer ? question.correctIndex : undefined,
  };
}

function stripAnswers(participant: StoredParticipant): HocTapRoomParticipant {
  return {
    id: participant.id,
    name: participant.name,
    initials: participant.initials,
    avatarUrl: participant.avatarUrl,
    score: participant.score,
    isHost: participant.isHost,
    joinedAt: participant.joinedAt,
  };
}

function settleRoomState(room: StoredRoom) {
  let changed = true;
  let safety = 0;
  while (changed && safety < 10) {
    changed = false;
    safety += 1;
    const now = Date.now();

    if (
      room.status === "playing" &&
      room.phase === "question" &&
      (haveAllPlayersAnswered(room, room.currentQuestionIndex) ||
        (room.questionEndsAt !== null &&
          now >= Date.parse(room.questionEndsAt)))
    ) {
      openRevealPhase(room, now);
      changed = true;
      continue;
    }

    if (
      room.status === "playing" &&
      room.phase === "reveal" &&
      room.phaseEndsAt &&
      now >= Date.parse(room.phaseEndsAt)
    ) {
      openLeaderboardPhase(room, now);
      changed = true;
      continue;
    }

    if (
      room.status === "playing" &&
      room.phase === "leaderboard" &&
      room.phaseEndsAt &&
      now >= Date.parse(room.phaseEndsAt)
    ) {
      movePastLeaderboard(room, now);
      changed = true;
    }
  }
}

function forceAdvancePhase(room: StoredRoom) {
  const now = Date.now();
  if (room.status === "playing" && room.phase === "question") {
    openRevealPhase(room, now);
    return;
  }
  if (room.status === "playing" && room.phase === "reveal") {
    openLeaderboardPhase(room, now);
    return;
  }
  if (room.status === "playing" && room.phase === "leaderboard") {
    movePastLeaderboard(room, now);
  }
}

function startQuestionPhase(room: StoredRoom, now = Date.now()) {
  room.status = "playing";
  room.phase = "question";
  room.phaseEndsAt = new Date(now + QUESTION_DURATION_MS).toISOString();
  room.questionEndsAt = room.phaseEndsAt;
  room.roundTopFive = [];
  room.updatedAt = new Date(now).toISOString();
}

function openRevealPhase(room: StoredRoom, now = Date.now()) {
  room.status = "playing";
  room.phase = "reveal";
  room.questionEndsAt = null;
  room.phaseEndsAt = new Date(now + REVEAL_DURATION_MS).toISOString();
  room.updatedAt = new Date(now).toISOString();
}

function openLeaderboardPhase(room: StoredRoom, now = Date.now()) {
  room.status = "playing";
  room.phase = "leaderboard";
  room.questionEndsAt = null;
  room.phaseEndsAt = new Date(now + LEADERBOARD_DURATION_MS).toISOString();
  room.roundTopFive = buildLeaderboard(room).slice(0, 5);
  room.updatedAt = new Date(now).toISOString();
}

function movePastLeaderboard(room: StoredRoom, now = Date.now()) {
  if (room.currentQuestionIndex >= room.questions.length - 1) {
    finishRoom(room, now);
    return;
  }
  room.currentQuestionIndex += 1;
  startQuestionPhase(room, now);
}

function finishRoom(room: StoredRoom, now = Date.now()) {
  room.status = "finished";
  room.phase = "finished";
  room.phaseEndsAt = null;
  room.questionEndsAt = null;
  room.roundTopFive = buildLeaderboard(room).slice(0, 5);
  room.finalTopThree = buildLeaderboard(room).slice(0, 3);
  room.updatedAt = new Date(now).toISOString();
}

function haveAllPlayersAnswered(room: StoredRoom, questionIndex: number): boolean {
  const players = getPlayers(room);
  return players.length > 0 && players.every((player) => player.answers[questionIndex]);
}

function countAnsweredPlayers(room: StoredRoom, questionIndex: number): number {
  return getPlayers(room).filter((player) => player.answers[questionIndex]).length;
}

function buildLeaderboard(room: StoredRoom): HocTapRoomParticipant[] {
  return getPlayers(room)
    .slice()
    .sort((a, b) => b.score - a.score || a.joinedAt.localeCompare(b.joinedAt))
    .map(stripAnswers);
}

function buildParticipantAvatarUrl(seed: string): string {
  return buildDicebearAvatarUrl(seed);
}

function getRequiredRoom(code: string): StoredRoom {
  const room = getStoreState().rooms.get(code);
  if (!room) {
    throw new HocTapRoomError(
      "ROOM_NOT_FOUND",
      "Không tìm thấy phòng. Kiểm tra lại mã phòng hoặc tạo phòng mới.",
    );
  }
  return room;
}

function resolvePlayableQuiz(quizId: string): HocTapPlayableQuiz {
  const quiz = getHocTapQuiz(quizId);
  if (!quiz) {
    throw new HocTapRoomError(
      "INVALID_QUIZ",
      "Bộ quiz này chưa sẵn sàng để tạo phòng.",
    );
  }
  return quiz;
}

function resolveRoomContent(
  input: HocTapRoomCreateInput,
  roomType: HocTapRoomType,
): {
  quizId: string;
  title: string;
  category: string;
  questions: HocTapQuizQuestion[];
} {
  if (input.aiProject) {
    return {
      quizId: AI_PROJECT_QUIZ_ID,
      title: normalizeRoomTitle(input.aiProject.title),
      category: normalizeRoomCategory(input.aiProject.topic),
      questions: normalizeQuestionInputs(input.questions ?? [], 3),
    };
  }

  const quiz = resolvePlayableQuiz(input.quizId ?? "");
  return {
    quizId: quiz.id,
    title: quiz.title,
    category: quiz.category,
    questions:
      roomType === "ai-secret"
        ? shuffleQuestions(quiz.questions)
        : cloneQuestions(quiz.questions),
  };
}

function getQuestionAt(
  questions: HocTapQuizQuestion[],
  questionIndex: number,
): HocTapQuizQuestion {
  const question = questions[questionIndex];
  if (!question) {
    throw new HocTapRoomError("INVALID_INPUT", "Câu hỏi không tồn tại.");
  }
  return question;
}

function getPlayers(room: StoredRoom): StoredParticipant[] {
  return room.participants.filter((participant) => !participant.isHost);
}

function cloneQuestions(questions: HocTapQuizQuestion[]): HocTapQuizQuestion[] {
  return questions.map((question) => ({
    ...question,
    options: [...question.options],
  }));
}

function shuffleQuestions(
  questions: HocTapQuizQuestion[],
): HocTapQuizQuestion[] {
  const shuffled = cloneQuestions(questions);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

function normalizeQuestionInputs(
  questions: HocTapRoomQuestionInput[],
  minQuestions = 1,
): HocTapQuizQuestion[] {
  if (
    !Array.isArray(questions) ||
    questions.length < minQuestions ||
    questions.length > 30
  ) {
    throw new HocTapRoomError(
      "INVALID_INPUT",
      `Bộ câu hỏi cần từ ${minQuestions} đến 30 câu.`,
    );
  }

  return questions.map((item, index) => {
    const question = item.question.trim().replace(/\s+/g, " ");
    const options = item.options.map((option) =>
      option.trim().replace(/\s+/g, " "),
    );
    if (question.length < 5 || question.length > 500) {
      throw new HocTapRoomError(
        "INVALID_INPUT",
        `Câu ${index + 1} cần từ 5 đến 500 ký tự.`,
      );
    }
    if (
      options.length < 2 ||
      options.length > 6 ||
      options.some((option) => option.length < 1 || option.length > 300)
    ) {
      throw new HocTapRoomError(
        "INVALID_INPUT",
        `Câu ${index + 1} cần từ 2 đến 6 đáp án hợp lệ.`,
      );
    }
    if (
      !Number.isInteger(item.correctIndex) ||
      item.correctIndex < 0 ||
      item.correctIndex >= options.length
    ) {
      throw new HocTapRoomError(
        "INVALID_INPUT",
        `Đáp án đúng của câu ${index + 1} không hợp lệ.`,
      );
    }

    return {
      question,
      options,
      correctIndex: item.correctIndex,
      explanation:
        item.explanation?.trim().slice(0, 600) ||
        `Đáp án đúng là lựa chọn ${item.correctIndex + 1}.`,
    };
  });
}

function getHost(room: StoredRoom): StoredParticipant {
  return (
    room.participants.find((participant) => participant.id === room.hostParticipantId) ??
    room.participants[0]
  );
}

function assertHostToken(room: StoredRoom, hostToken: string) {
  if (!hostToken || hostToken !== room.hostToken) {
    throw new HocTapRoomError("FORBIDDEN", "Chỉ host mới thực hiện được thao tác này.");
  }
}

function assertRoomController(
  room: StoredRoom,
  options: { hostToken?: string; participantId?: string },
  systemMessage = "Chỉ người tạo phòng mới thực hiện được thao tác này.",
) {
  if (room.hostMode === "human") {
    assertHostToken(room, options.hostToken ?? "");
    return;
  }

  if (options.participantId !== room.startControllerParticipantId) {
    throw new HocTapRoomError("FORBIDDEN", systemMessage);
  }
}

function canViewerManageRoom(
  room: StoredRoom,
  viewerParticipantId: string | null,
): boolean {
  if (!viewerParticipantId) return false;
  if (room.hostMode === "human") {
    return viewerParticipantId === room.hostParticipantId;
  }
  return viewerParticipantId === room.startControllerParticipantId;
}

function resolveViewerIdForControllerAction(
  room: StoredRoom,
  options: { participantId?: string },
): string | null {
  if (room.hostMode === "system") {
    return options.participantId ?? null;
  }
  return room.hostParticipantId;
}

function normalizeRoomCode(code: string): string {
  const normalized = code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (normalized.length !== ROOM_CODE_LENGTH) {
    throw new HocTapRoomError("INVALID_INPUT", "Mã phòng phải gồm 6 ký tự.");
  }
  return normalized;
}

function normalizeDisplayName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 40) {
    throw new HocTapRoomError(
      "INVALID_INPUT",
      "Tên hiển thị cần từ 2 đến 40 ký tự.",
    );
  }
  return normalized;
}

function normalizeAvatarSeed(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 120);
  return normalized || null;
}

function normalizeRoomTitle(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 90);
  if (normalized.length < 2) {
    throw new HocTapRoomError(
      "INVALID_INPUT",
      "Tên phòng cần từ 2 ký tự.",
    );
  }
  return normalized;
}

function normalizeRoomCategory(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 140);
  if (normalized.length < 2) {
    throw new HocTapRoomError(
      "INVALID_INPUT",
      "Chủ đề project cần từ 2 ký tự.",
    );
  }
  return normalized;
}

function clampMaxPlayers(value: number | undefined): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_PLAYERS;
  return Math.min(
    MAX_MAX_PLAYERS,
    Math.max(MIN_MAX_PLAYERS, Math.floor(value ?? DEFAULT_MAX_PLAYERS)),
  );
}

function generateUniqueRoomCode(rooms: Map<string, StoredRoom>): string {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
      ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)),
    ).join("");
    if (!rooms.has(code)) return code;
  }

  throw new HocTapRoomError(
    "INVALID_INPUT",
    "Chưa tạo được mã phòng. Vui lòng thử lại.",
  );
}

function createId(prefix: string): string {
  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${randomPart}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : first;
  return `${first}${last}`.toUpperCase();
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN")
    .trim();
}
