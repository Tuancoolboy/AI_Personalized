import { randomUUID } from "crypto";
import {
  getHocTapQuiz,
  type HocTapPlayableQuiz,
  type HocTapQuizQuestion,
} from "@/lib/hoc-tap-quiz-catalog";
import { buildAvatarUrl } from "@/lib/app-avatar";
import { slugifyOrganizationName } from "@/lib/organization-slug";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  HocTapRoomError,
  type HocTapPublicRoom,
  type HocTapRoomAnswerInput,
  type HocTapRoomCreateInput,
  type HocTapRoomCreateResult,
  type HocTapRoomHostMode,
  type HocTapRoomJoinInput,
  type HocTapRoomJoinResult,
  type HocTapRoomParticipant,
  type HocTapRoomPhase,
  type HocTapRoomQuestionInput,
  type HocTapRoomQuestionSnapshot,
  type HocTapRoomSnapshot,
  type HocTapRoomStatus,
  type HocTapRoomType,
  type HocTapRoomUpdateQuestionsInput,
  type HocTapRoomUpdateSettingsInput,
  type HocTapRoomDeleteInput,
  type HocTapRoomViewerAnswer,
} from "@/lib/hoc-tap-room-store";

type ServiceSession = {
  userId: string;
};

type MembershipRow = {
  organization_id: string;
};

type RoomRow = {
  id: string;
  code: string;
  organization_id: string;
  created_by_user_id: string;
  quiz_id: string;
  title: string;
  category: string;
  status: HocTapRoomStatus;
  phase: HocTapRoomPhase;
  mode: "classic" | "team-battle";
  room_type: HocTapRoomType;
  host_mode: HocTapRoomHostMode;
  locked: boolean;
  max_players: number;
  questions_json: HocTapQuizQuestion[];
  current_question_index: number;
  phase_ends_at: string | null;
  question_ends_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type ParticipantRow = {
  id: string;
  room_id: string;
  organization_id: string;
  user_id: string | null;
  display_name: string;
  avatar_choice: string | null;
  score: number;
  is_host: boolean;
  joined_at: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
};

type AnswerRow = {
  id: string;
  room_id: string;
  participant_id: string;
  organization_id: string;
  question_index: number;
  answer_index: number;
  is_correct: boolean;
  points: number;
  created_at: string;
  updated_at: string;
};

type LoadedRoom = {
  room: RoomRow;
  participants: ParticipantRow[];
  answers: AnswerRow[];
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
const ACTIVE_ROOM_RETENTION_MS = 12 * 60 * 60 * 1000;
const FINISHED_ROOM_RETENTION_MS = 24 * 60 * 60 * 1000;
const COMMUNITY_ORGANIZATION_NAME = "AI Tro Ly Community";
const COMMUNITY_ORGANIZATION_SLUG =
  slugifyOrganizationName(COMMUNITY_ORGANIZATION_NAME);

export async function listSupabaseHocTapRooms(
  session: ServiceSession,
): Promise<HocTapPublicRoom[]> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  await cleanupExpiredRooms(organizationId);

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("hoc_tap_rooms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("last_activity_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rooms = await Promise.all(
    ((data ?? []) as RoomRow[]).map(async (row) => {
      const loaded = await loadRoomById(row.id, organizationId);
      return loaded ? await settleRoomState(loaded) : null;
    }),
  );

  return rooms
    .filter((loaded): loaded is LoadedRoom => Boolean(loaded))
    .filter((loaded) => loaded.room.status !== "finished")
    .map(serializePublicRoom);
}

export async function createSupabaseHocTapRoom(
  session: ServiceSession,
  input: HocTapRoomCreateInput,
): Promise<HocTapRoomCreateResult> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const displayName = normalizeDisplayName(input.hostName);
  const avatarChoice = normalizeAvatarChoice(input.avatarSeed);
  const roomType = input.roomType ?? "host-review";
  const roomContent = resolveRoomContent(input, roomType);
  const entryRole = input.entryRole ?? "host";
  const hostMode: HocTapRoomHostMode =
    entryRole === "player" ? "system" : "human";
  const code = await generateUniqueRoomCode();
  const now = new Date().toISOString();
  const roomId = randomUUID();
  const hostParticipantId = randomUUID();
  let participantId = hostParticipantId;

  const supabase = createSupabaseServiceClient();
  const { error: roomError } = await supabase.from("hoc_tap_rooms").insert({
    id: roomId,
    code,
    organization_id: organizationId,
    created_by_user_id: session.userId,
    quiz_id: roomContent.quizId,
    title: roomContent.title,
    category: roomContent.category,
    status: "waiting",
    phase: "waiting",
    mode: input.mode ?? "classic",
    room_type: roomType,
    host_mode: hostMode,
    locked: input.locked ?? false,
    max_players: clampMaxPlayers(input.maxPlayers),
    questions_json: roomContent.questions,
    current_question_index: 0,
    phase_ends_at: null,
    question_ends_at: null,
    last_activity_at: now,
    created_at: now,
    updated_at: now,
  });

  if (roomError) {
    throw new Error(roomError.message);
  }

  const participantRows = [
    {
      id: hostParticipantId,
      room_id: roomId,
      organization_id: organizationId,
      user_id: hostMode === "human" ? session.userId : null,
      display_name: hostMode === "system" ? SYSTEM_HOST_NAME : displayName,
      avatar_choice: hostMode === "human" ? avatarChoice : null,
      score: 0,
      is_host: true,
      joined_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    },
  ];

  if (hostMode === "system") {
    participantId = randomUUID();
    participantRows.push({
      id: participantId,
      room_id: roomId,
      organization_id: organizationId,
      user_id: session.userId,
      display_name: displayName,
      avatar_choice: avatarChoice,
      score: 0,
      is_host: false,
      joined_at: now,
      last_seen_at: now,
      created_at: now,
      updated_at: now,
    });
  }

  const { error: participantError } = await supabase
    .from("hoc_tap_room_participants")
    .insert(participantRows);

  if (participantError) {
    throw new Error(participantError.message);
  }

  const loaded = await loadRoomByCode(code, organizationId);
  if (!loaded) {
    throw new HocTapRoomError(
      "ROOM_NOT_FOUND",
      "Không tải lại được phòng vừa tạo.",
    );
  }

  const room = serializeRoom(
    loaded,
    session.userId,
    participantId,
  );
  return {
    room,
    participantId,
  };
}

export async function joinSupabaseHocTapRoom(
  session: ServiceSession,
  input: HocTapRoomJoinInput,
): Promise<HocTapRoomJoinResult> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const code = normalizeRoomCode(input.code);
  const name = normalizeDisplayName(input.playerName);
  const avatarChoice = normalizeAvatarChoice(input.avatarSeed);
  const loaded = await requireLoadedRoom(code, organizationId);
  const settled = await settleRoomState(loaded);

  if (settled.room.status === "finished") {
    throw new HocTapRoomError(
      "ROOM_FINISHED",
      "Phòng này đã kết thúc. Hãy tạo phòng mới để chơi lại.",
    );
  }

  const existing =
    settled.participants.find((participant) => participant.user_id === session.userId) ??
    null;
  if (existing) {
    await updateParticipant(existing.id, {
      display_name: name,
      avatar_choice: avatarChoice,
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const refreshed = await requireLoadedRoom(code, organizationId);
    return {
      room: serializeRoom(refreshed, session.userId, existing.id),
      participantId: existing.id,
    };
  }

  if (getPlayers(settled).length >= settled.room.max_players) {
    throw new HocTapRoomError("ROOM_FULL", "Phòng đã đủ người chơi.");
  }

  const participantId = randomUUID();
  const now = new Date().toISOString();
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("hoc_tap_room_participants").insert({
    id: participantId,
    room_id: settled.room.id,
    organization_id: settled.room.organization_id,
    user_id: session.userId,
    display_name: name,
    avatar_choice: avatarChoice,
    score: 0,
    is_host: false,
    joined_at: now,
    last_seen_at: now,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(error.message);
  }

  await touchRoom(settled.room.id);
  const refreshed = await requireLoadedRoom(code, organizationId);
  return {
    room: serializeRoom(refreshed, session.userId, participantId),
    participantId,
  };
}

export async function getSupabaseHocTapRoomSnapshot(
  session: ServiceSession,
  code: string,
  participantId?: string | null,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(code, organizationId);
  const settled = await settleRoomState(loaded);
  return serializeRoom(settled, session.userId, participantId ?? null);
}

export async function startSupabaseHocTapRoom(
  session: ServiceSession,
  code: string,
  participantId?: string | null,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(code, organizationId);
  const settled = await settleRoomState(loaded);
  assertRoomController(settled, session.userId);

  if (settled.room.status !== "waiting") {
    throw new HocTapRoomError(
      "ROOM_NOT_WAITING",
      "Phòng đã bắt đầu hoặc đã kết thúc.",
    );
  }
  if (getPlayers(settled).length === 0) {
    throw new HocTapRoomError(
      "ROOM_EMPTY",
      "Cần ít nhất 1 người chơi trước khi bắt đầu.",
    );
  }

  await updateRoom(settled.room.id, startQuestionPatch());
  const refreshed = await requireLoadedRoom(code, organizationId);
  return serializeRoom(refreshed, session.userId, participantId ?? null);
}

export async function submitSupabaseHocTapRoomAnswer(
  session: ServiceSession,
  input: HocTapRoomAnswerInput,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(input.code, organizationId);
  const settled = await settleRoomState(loaded);

  if (settled.room.status !== "playing" || settled.room.phase !== "question") {
    throw new HocTapRoomError("ROOM_NOT_PLAYING", "Phòng chưa ở trạng thái chơi.");
  }

  if (input.questionIndex !== settled.room.current_question_index) {
    throw new HocTapRoomError(
      "QUESTION_MISMATCH",
      "Câu hỏi hiện tại đã thay đổi. Hãy tải lại phòng.",
    );
  }

  const participant = settled.participants.find(
    (item) => item.id === input.participantId && item.user_id === session.userId,
  );

  if (!participant) {
    throw new HocTapRoomError(
      "PLAYER_NOT_FOUND",
      "Bạn chưa tham gia phòng này.",
    );
  }
  if (participant.is_host) {
    throw new HocTapRoomError(
      "HOST_CANNOT_ANSWER",
      "Host chỉ điều khiển phòng và không tham gia trả lời.",
    );
  }

  const question = getQuestionAt(
    settled.room.questions_json,
    settled.room.current_question_index,
  );
  const answerIndex = Number(input.answerIndex);
  if (
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex >= question.options.length
  ) {
    throw new HocTapRoomError("INVALID_ANSWER", "Đáp án không hợp lệ.");
  }

  const existing = settled.answers.find(
    (answer) =>
      answer.participant_id === participant.id &&
      answer.question_index === settled.room.current_question_index,
  );

  if (!existing) {
    const isCorrect = answerIndex === question.correctIndex;
    const points = isCorrect ? ANSWER_POINTS : 0;
    const now = new Date().toISOString();
    const supabase = createSupabaseServiceClient();
    const { error: answerError } = await supabase
      .from("hoc_tap_room_answers")
      .insert({
        id: randomUUID(),
        room_id: settled.room.id,
        participant_id: participant.id,
        organization_id: settled.room.organization_id,
        question_index: settled.room.current_question_index,
        answer_index: answerIndex,
        is_correct: isCorrect,
        points,
        created_at: now,
        updated_at: now,
      });

    if (answerError) {
      throw new Error(answerError.message);
    }

    await updateParticipant(participant.id, {
      score: participant.score + points,
      last_seen_at: now,
      updated_at: now,
    });
    await touchRoom(settled.room.id, now);
  }

  const refreshed = await requireLoadedRoom(input.code, organizationId);
  const next = await settleRoomState(refreshed);
  return serializeRoom(next, session.userId, participant.id);
}

export async function updateSupabaseHocTapRoomSettings(
  session: ServiceSession,
  input: HocTapRoomUpdateSettingsInput,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(input.code, organizationId);
  assertRoomController(loaded, session.userId);
  await updateRoom(loaded.room.id, {
    locked: input.locked,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  });
  const refreshed = await requireLoadedRoom(input.code, organizationId);
  return serializeRoom(refreshed, session.userId, input.participantId ?? null);
}

export async function deleteSupabaseHocTapRoom(
  session: ServiceSession,
  input: HocTapRoomDeleteInput,
): Promise<{ code: string }> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(input.code, organizationId);
  assertRoomController(loaded, session.userId);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("hoc_tap_rooms")
    .delete()
    .eq("id", loaded.room.id);

  if (error) {
    throw new Error(error.message);
  }

  return { code: loaded.room.code };
}

export async function advanceSupabaseHocTapRoom(
  session: ServiceSession,
  code: string,
  participantId?: string | null,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(code, organizationId);
  const settled = await settleRoomState(loaded);
  assertRoomController(settled, session.userId);

  if (settled.room.host_mode !== "human") {
    throw new HocTapRoomError(
      "FORBIDDEN",
      "Phòng hệ thống không cần host chuyển thủ công.",
    );
  }
  if (settled.room.status === "waiting") {
    return startSupabaseHocTapRoom(session, code, participantId);
  }

  if (settled.room.status !== "playing") {
    throw new HocTapRoomError("ROOM_NOT_PLAYING", "Phòng chưa bắt đầu.");
  }

  await updateRoom(settled.room.id, forceAdvancePatch(settled));
  const refreshed = await requireLoadedRoom(code, organizationId);
  const next = await settleRoomState(refreshed);
  return serializeRoom(next, session.userId, participantId ?? null);
}

export async function updateSupabaseHocTapRoomQuestions(
  session: ServiceSession,
  input: HocTapRoomUpdateQuestionsInput,
): Promise<HocTapRoomSnapshot> {
  const organizationId = await resolveRoomOrganizationId(session.userId);
  const loaded = await requireLoadedRoom(input.code, organizationId);
  assertRoomController(loaded, session.userId);

  if (loaded.room.status !== "waiting") {
    throw new HocTapRoomError(
      "ROOM_NOT_WAITING",
      "Chỉ có thể sửa bộ câu hỏi trước khi phòng bắt đầu.",
    );
  }
  if (loaded.room.room_type !== "host-review") {
    throw new HocTapRoomError(
      "FORBIDDEN",
      "Phòng bí mật không cho xem hoặc sửa bộ câu hỏi trước.",
    );
  }

  await updateRoom(loaded.room.id, {
    questions_json: normalizeQuestionInputs(input.questions),
    current_question_index: 0,
    updated_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
  });
  const refreshed = await requireLoadedRoom(input.code, organizationId);
  return serializeRoom(refreshed, session.userId, null);
}

async function settleRoomState(loaded: LoadedRoom): Promise<LoadedRoom> {
  let current = loaded;
  let changed = true;
  let safety = 0;
  while (changed && safety < 10) {
    changed = false;
    safety += 1;
    const now = Date.now();
    const answeredPlayerCount = countAnsweredPlayers(
      current,
      current.room.current_question_index,
    );
    const playerCount = getPlayers(current).length;

    if (
      current.room.status === "playing" &&
      current.room.phase === "question" &&
      ((playerCount > 0 && answeredPlayerCount >= playerCount) ||
        (current.room.question_ends_at !== null &&
          now >= Date.parse(current.room.question_ends_at)))
    ) {
      await updateRoom(current.room.id, openRevealPatch(now));
      current = await requireLoadedRoom(
        current.room.code,
        current.room.organization_id,
      );
      changed = true;
      continue;
    }

    if (
      current.room.status === "playing" &&
      current.room.phase === "reveal" &&
      current.room.phase_ends_at &&
      now >= Date.parse(current.room.phase_ends_at)
    ) {
      await updateRoom(current.room.id, openLeaderboardPatch(now));
      current = await requireLoadedRoom(
        current.room.code,
        current.room.organization_id,
      );
      changed = true;
      continue;
    }

    if (
      current.room.status === "playing" &&
      current.room.phase === "leaderboard" &&
      current.room.phase_ends_at &&
      now >= Date.parse(current.room.phase_ends_at)
    ) {
      await updateRoom(current.room.id, movePastLeaderboardPatch(current, now));
      current = await requireLoadedRoom(
        current.room.code,
        current.room.organization_id,
      );
      changed = true;
    }
  }
  return current;
}

function serializeRoom(
  loaded: LoadedRoom,
  userId: string,
  requestedParticipantId: string | null,
): HocTapRoomSnapshot {
  void requestedParticipantId;
  const viewer =
    loaded.participants.find((participant) => participant.user_id === userId) ?? null;
  const viewerParticipantId = viewer?.id ?? null;
  const isHost = viewer?.is_host ?? false;
  const canManageRoom = loaded.room.created_by_user_id === userId;
  const question =
    loaded.room.status === "playing" &&
    (loaded.room.phase === "question" ||
      loaded.room.phase === "reveal" ||
      loaded.room.phase === "leaderboard")
      ? getQuestionAt(loaded.room.questions_json, loaded.room.current_question_index)
      : null;
  const answer =
    viewer && question
      ? loaded.answers.find(
          (item) =>
            item.participant_id === viewer.id &&
            item.question_index === loaded.room.current_question_index,
        ) ?? null
      : null;
  const isAnswerRevealVisible =
    loaded.room.phase === "reveal" || loaded.room.phase === "leaderboard";
  const currentQuestion =
    question && loaded.room.status === "playing"
      ? serializeQuestion(
          question,
          isAnswerRevealVisible || (canManageRoom && loaded.room.room_type === "host-review"),
        )
      : null;
  const leaderboard = buildLeaderboard(loaded);
  const answeredPlayerCount =
    loaded.room.status === "playing"
      ? countAnsweredPlayers(loaded, loaded.room.current_question_index)
      : 0;
  const hostParticipant =
    loaded.participants.find((participant) => participant.is_host) ??
    loaded.participants[0];
  const viewerAnswer: HocTapRoomViewerAnswer | null =
    answer && question
      ? {
          questionIndex: loaded.room.current_question_index,
          answerIndex: answer.answer_index,
          revealed: isAnswerRevealVisible,
          isCorrect: isAnswerRevealVisible ? answer.is_correct : undefined,
          points: isAnswerRevealVisible ? answer.points : undefined,
          explanation: isAnswerRevealVisible ? question.explanation : undefined,
          correctIndex: isAnswerRevealVisible ? question.correctIndex : undefined,
        }
      : null;

  return {
    code: loaded.room.code,
    quizId: loaded.room.quiz_id,
    title: loaded.room.title,
    category: loaded.room.category,
    isLocked: loaded.room.locked,
    status: loaded.room.status,
    mode: loaded.room.mode,
    roomType: loaded.room.room_type,
    hostMode: loaded.room.host_mode,
    phase: loaded.room.phase,
    hostName: hostParticipant?.display_name ?? SYSTEM_HOST_NAME,
    hostParticipantId: hostParticipant?.id ?? "",
    participantCount: getPlayers(loaded).length,
    maxPlayers: loaded.room.max_players,
    questionCount: loaded.room.questions_json.length,
    currentQuestionIndex: loaded.room.current_question_index,
    questionEndsAt: loaded.room.question_ends_at,
    phaseEndsAt: loaded.room.phase_ends_at,
    answeredPlayerCount,
    createdAt: loaded.room.created_at,
    updatedAt: loaded.room.updated_at,
    participants: loaded.participants.map(serializeParticipant),
    currentQuestion,
    reviewQuestions:
      canManageRoom &&
      loaded.room.host_mode === "human" &&
      loaded.room.room_type === "host-review" &&
      loaded.room.status === "waiting"
        ? loaded.room.questions_json.map((item) => serializeQuestion(item, true))
        : null,
    viewerAnswer,
    viewerParticipantId,
    isHost,
    canManageRoom,
    canStart: loaded.room.status === "waiting" && canManageRoom,
    leaderboard,
    roundTopFive: leaderboard.slice(0, 5),
    finalTopThree:
      loaded.room.status === "finished" ? leaderboard.slice(0, 3) : [],
  };
}

function serializePublicRoom(loaded: LoadedRoom): HocTapPublicRoom {
  const host =
    loaded.participants.find((participant) => participant.is_host) ??
    loaded.participants[0];
  return {
    code: loaded.room.code,
    quizId: loaded.room.quiz_id,
    title: loaded.room.title,
    category: loaded.room.category,
    isLocked: loaded.room.locked,
    status: loaded.room.status,
    mode: loaded.room.mode,
    roomType: loaded.room.room_type,
    hostMode: loaded.room.host_mode,
    phase: loaded.room.phase,
    hostName: host?.display_name ?? SYSTEM_HOST_NAME,
    hostAvatarUrl: buildParticipantAvatarUrl(
      host?.avatar_choice ?? null,
      host?.display_name ?? SYSTEM_HOST_NAME,
    ),
    participantCount: getPlayers(loaded).length,
    maxPlayers: loaded.room.max_players,
    questionCount: loaded.room.questions_json.length,
    createdAt: loaded.room.created_at,
    updatedAt: loaded.room.updated_at,
  };
}

function serializeParticipant(participant: ParticipantRow): HocTapRoomParticipant {
  return {
    id: participant.id,
    name: participant.display_name,
    initials: getInitials(participant.display_name),
    avatarUrl: buildParticipantAvatarUrl(
      participant.avatar_choice,
      participant.display_name,
    ),
    score: participant.score,
    isHost: participant.is_host,
    joinedAt: participant.joined_at,
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

async function cleanupExpiredRooms(organizationId: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const now = Date.now();
  const activeCutoff = new Date(now - ACTIVE_ROOM_RETENTION_MS).toISOString();
  const finishedCutoff = new Date(now - FINISHED_ROOM_RETENTION_MS).toISOString();

  await supabase
    .from("hoc_tap_rooms")
    .delete()
    .eq("organization_id", organizationId)
    .in("status", ["waiting", "playing"])
    .lt("last_activity_at", activeCutoff);

  await supabase
    .from("hoc_tap_rooms")
    .delete()
    .eq("organization_id", organizationId)
    .eq("status", "finished")
    .lt("last_activity_at", finishedCutoff);
}

async function resolveRoomOrganizationId(userId: string): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const row = ((data ?? []) as MembershipRow[])[0];
  return row?.organization_id ?? ensureCommunityOrganizationId();
}

async function ensureCommunityOrganizationId(): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: selectError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", COMMUNITY_ORGANIZATION_SLUG)
    .maybeSingle();

  if (selectError) {
    throw new Error(selectError.message);
  }
  if (existing?.id) {
    return existing.id;
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("organizations")
    .insert({
      name: COMMUNITY_ORGANIZATION_NAME,
      slug: COMMUNITY_ORGANIZATION_SLUG,
      status: "active",
      settings_json: {
        hocTapMode: "community",
      },
      created_by: null,
      updated_at: now,
    })
    .select("id")
    .maybeSingle();

  if (!insertError && inserted?.id) {
    return inserted.id;
  }

  const { data: retryExisting, error: retryError } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", COMMUNITY_ORGANIZATION_SLUG)
    .maybeSingle();

  if (retryError) {
    throw new Error(retryError.message);
  }
  if (!retryExisting?.id) {
    throw new Error(
      insertError?.message ||
        "Không tạo được community organization cho phòng học tập.",
    );
  }

  return retryExisting.id;
}

async function generateUniqueRoomCode(): Promise<string> {
  const supabase = createSupabaseServiceClient();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
      ROOM_CODE_ALPHABET.charAt(Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)),
    ).join("");
    const { data, error } = await supabase
      .from("hoc_tap_rooms")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (error && !error.message.includes("0 rows")) {
      throw new Error(error.message);
    }
    if (!data) return code;
  }

  throw new HocTapRoomError(
    "INVALID_INPUT",
    "Chưa tạo được mã phòng. Vui lòng thử lại.",
  );
}

async function loadRoomByCode(
  code: string,
  organizationId: string,
): Promise<LoadedRoom | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("hoc_tap_rooms")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("code", normalizeRoomCode(code))
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return loadRoomById((data as RoomRow).id, organizationId);
}

async function loadRoomById(
  roomId: string,
  organizationId: string,
): Promise<LoadedRoom | null> {
  const supabase = createSupabaseServiceClient();
  const [{ data: roomData, error: roomError }, { data: participantsData, error: participantsError }, { data: answersData, error: answersError }] =
    await Promise.all([
      supabase
        .from("hoc_tap_rooms")
        .select("*")
        .eq("id", roomId)
        .eq("organization_id", organizationId)
        .maybeSingle(),
      supabase
        .from("hoc_tap_room_participants")
        .select("*")
        .eq("room_id", roomId)
        .eq("organization_id", organizationId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("hoc_tap_room_answers")
        .select("*")
        .eq("room_id", roomId)
        .eq("organization_id", organizationId),
    ]);

  if (roomError) throw new Error(roomError.message);
  if (participantsError) throw new Error(participantsError.message);
  if (answersError) throw new Error(answersError.message);
  if (!roomData) return null;

  return {
    room: normalizeRoomRow(roomData as RoomRow),
    participants: (participantsData ?? []) as ParticipantRow[],
    answers: (answersData ?? []) as AnswerRow[],
  };
}

async function requireLoadedRoom(
  code: string,
  organizationId: string,
): Promise<LoadedRoom> {
  const loaded = await loadRoomByCode(code, organizationId);
  if (!loaded) {
    throw new HocTapRoomError(
      "ROOM_NOT_FOUND",
      "Không tìm thấy phòng. Kiểm tra lại mã phòng hoặc tạo phòng mới.",
    );
  }
  return loaded;
}

function normalizeRoomRow(room: RoomRow): RoomRow {
  return {
    ...room,
    questions_json: Array.isArray(room.questions_json)
      ? room.questions_json
      : [],
  };
}

async function updateRoom(roomId: string, patch: Record<string, unknown>) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("hoc_tap_rooms")
    .update(patch)
    .eq("id", roomId);
  if (error) {
    throw new Error(error.message);
  }
}

async function updateParticipant(
  participantId: string,
  patch: Record<string, unknown>,
) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("hoc_tap_room_participants")
    .update(patch)
    .eq("id", participantId);
  if (error) {
    throw new Error(error.message);
  }
}

async function touchRoom(roomId: string, at = new Date().toISOString()) {
  await updateRoom(roomId, {
    updated_at: at,
    last_activity_at: at,
  });
}

function startQuestionPatch(now = Date.now()) {
  const iso = new Date(now).toISOString();
  const endsAt = new Date(now + QUESTION_DURATION_MS).toISOString();
  return {
    status: "playing",
    phase: "question",
    phase_ends_at: endsAt,
    question_ends_at: endsAt,
    updated_at: iso,
    last_activity_at: iso,
  };
}

function openRevealPatch(now = Date.now()) {
  const iso = new Date(now).toISOString();
  return {
    status: "playing",
    phase: "reveal",
    question_ends_at: null,
    phase_ends_at: new Date(now + REVEAL_DURATION_MS).toISOString(),
    updated_at: iso,
    last_activity_at: iso,
  };
}

function openLeaderboardPatch(now = Date.now()) {
  const iso = new Date(now).toISOString();
  return {
    status: "playing",
    phase: "leaderboard",
    question_ends_at: null,
    phase_ends_at: new Date(now + LEADERBOARD_DURATION_MS).toISOString(),
    updated_at: iso,
    last_activity_at: iso,
  };
}

function movePastLeaderboardPatch(loaded: LoadedRoom, now = Date.now()) {
  if (loaded.room.current_question_index >= loaded.room.questions_json.length - 1) {
    const iso = new Date(now).toISOString();
    return {
      status: "finished",
      phase: "finished",
      question_ends_at: null,
      phase_ends_at: null,
      updated_at: iso,
      last_activity_at: iso,
    };
  }
  return {
    ...startQuestionPatch(now),
    current_question_index: loaded.room.current_question_index + 1,
  };
}

function forceAdvancePatch(loaded: LoadedRoom) {
  const now = Date.now();
  if (loaded.room.status === "playing" && loaded.room.phase === "question") {
    return openRevealPatch(now);
  }
  if (loaded.room.status === "playing" && loaded.room.phase === "reveal") {
    return openLeaderboardPatch(now);
  }
  if (loaded.room.status === "playing" && loaded.room.phase === "leaderboard") {
    return movePastLeaderboardPatch(loaded, now);
  }
  return startQuestionPatch(now);
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

function getPlayers(loaded: LoadedRoom): ParticipantRow[] {
  return loaded.participants.filter((participant) => !participant.is_host);
}

function countAnsweredPlayers(
  loaded: LoadedRoom,
  questionIndex: number,
): number {
  const playerIds = new Set(getPlayers(loaded).map((participant) => participant.id));
  return loaded.answers.filter(
    (answer) =>
      answer.question_index === questionIndex &&
      playerIds.has(answer.participant_id),
  ).length;
}

function buildLeaderboard(loaded: LoadedRoom): HocTapRoomParticipant[] {
  return getPlayers(loaded)
    .slice()
    .sort((a, b) => b.score - a.score || a.joined_at.localeCompare(b.joined_at))
    .map(serializeParticipant);
}

function buildParticipantAvatarUrl(
  avatarChoice: string | null,
  displayName: string,
): string {
  return buildAvatarUrl(avatarChoice, displayName);
}

function assertRoomController(loaded: LoadedRoom, userId: string) {
  if (loaded.room.created_by_user_id !== userId) {
    throw new HocTapRoomError(
      "FORBIDDEN",
      "Chỉ người tạo phòng mới thực hiện được thao tác này.",
    );
  }
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

function normalizeAvatarChoice(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 160);
  return normalized || null;
}

function normalizeRoomTitle(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ").slice(0, 90);
  if (normalized.length < 2) {
    throw new HocTapRoomError("INVALID_INPUT", "Tên phòng cần từ 2 ký tự.");
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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) : first;
  return `${first}${last}`.toUpperCase();
}
