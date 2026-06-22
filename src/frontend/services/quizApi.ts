import type {
  HocTapRoomCreateResult,
  HocTapRoomMode,
} from "@/lib/hoc-tap-room-store";

export interface CreateRoomRequest {
  hostName: string;
  topic: string;
  quizId?: string;
  mode: "classic" | "team_battle" | HocTapRoomMode;
  maxPlayers?: number;
}

export async function createRoom(data: CreateRoomRequest): Promise<{
  success: boolean;
  data: HocTapRoomCreateResult & { roomCode: string };
  error?: string;
}> {
  const response = await fetch("/api/hoc-tap/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      hostName: data.hostName,
      quizId: data.quizId ?? resolveQuizIdFromTopic(data.topic),
      mode: normalizeMode(data.mode),
      maxPlayers: data.maxPlayers ?? 20,
    }),
  });
  const payload = (await response.json()) as
    | ({ ok: true } & HocTapRoomCreateResult)
    | { error?: { message?: string } };

  if (!response.ok || !("ok" in payload)) {
    const errorPayload = payload as { error?: { message?: string } };
    return {
      success: false,
      data: emptyCreateResult(),
      error: errorPayload.error?.message ?? "Không thể tạo phòng.",
    };
  }

  return {
    success: true,
    data: {
      ...payload,
      roomCode: payload.room.code,
    },
  };
}

export async function joinRoomApi(data: {
  roomCode: string;
  playerName: string;
}) {
  const response = await fetch("/api/hoc-tap/rooms/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: data.roomCode, playerName: data.playerName }),
  });
  const payload = await response.json();
  return response.ok ? payload : { success: false, error: payload.error?.message };
}

export async function validateRoomCode(code: string) {
  const response = await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(code)}`);
  const payload = await response.json();
  return response.ok ? { success: true, data: payload.room } : { success: false };
}

export async function getRoomInfo(code: string) {
  const response = await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(code)}`);
  const payload = await response.json();
  return response.ok ? payload : { success: false, error: payload.error?.message };
}

export async function getPublicRooms() {
  const response = await fetch("/api/hoc-tap/rooms");
  const payload = await response.json();
  return response.ok ? payload : { success: false, error: payload.error?.message };
}

function normalizeMode(mode: CreateRoomRequest["mode"]): HocTapRoomMode {
  return mode === "team_battle" || mode === "team-battle"
    ? "team-battle"
    : "classic";
}

function resolveQuizIdFromTopic(topic: string): string {
  const normalized = topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN");

  if (normalized.includes("marketing")) return "ai-marketing";
  if (normalized.includes("sale") || normalized.includes("ban hang")) {
    return "ai-ban-hang";
  }
  if (normalized.includes("ke toan")) return "ai-ke-toan";
  if (normalized.includes("hr") || normalized.includes("hanh chinh")) {
    return "ai-hanh-chinh-hr";
  }
  return "ai-van-phong";
}

function emptyCreateResult(): HocTapRoomCreateResult & { roomCode: string } {
  return {
    roomCode: "",
    participantId: "",
    hostToken: "",
    room: {
      code: "",
      quizId: "",
      title: "",
      category: "",
      isLocked: false,
      status: "waiting",
      mode: "classic",
      roomType: "host-review",
      hostMode: "human",
      phase: "waiting",
      hostName: "",
      hostParticipantId: "",
      participantCount: 0,
      maxPlayers: 0,
      questionCount: 0,
      currentQuestionIndex: 0,
      questionEndsAt: null,
      phaseEndsAt: null,
      answeredPlayerCount: 0,
      createdAt: "",
      updatedAt: "",
      participants: [],
      currentQuestion: null,
      reviewQuestions: null,
      viewerAnswer: null,
      viewerParticipantId: null,
      isHost: false,
      canManageRoom: false,
      canStart: false,
      leaderboard: [],
      roundTopFive: [],
      finalTopThree: [],
    },
  };
}
