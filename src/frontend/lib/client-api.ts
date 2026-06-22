// Client helpers gọi API khi Supabase đã cấu hình.

import type { LearningModuleRecord } from "@/lib/learning-modules-data";
import type { AppAvatarChoice } from "@/lib/app-avatar";
import type {
  HocTapDepartmentOption,
  HocTapDepartmentSource,
} from "@/lib/hoc-tap-departments";
import type {
  HocTapPublicRoom,
  HocTapRoomAiProjectInput,
  HocTapRoomCreateResult,
  HocTapRoomEntryRole,
  HocTapRoomMode,
  HocTapRoomQuestionInput,
  HocTapRoomSnapshot,
  HocTapRoomType,
} from "@/lib/hoc-tap-room-store";
import {
  buildDemoHocTapOverview,
  type HocTapOverviewDays,
  type HocTapOverviewResponse,
} from "@/lib/hoc-tap-overview";
import type { TeamMember } from "@/lib/team-data";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export function isSupabaseBackend(): boolean {
  return isSupabaseConfigured();
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `HTTP ${res.status}`);
  }
  return data;
}

export type ProfileResponse = {
  ok: boolean;
  roleId: string | null;
  fullName: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  aiLevel?: number;
  avatar?: AppAvatarChoice | null;
  avatarUrl?: string | null;
};

export async function fetchProfile(): Promise<ProfileResponse> {
  return parseJson(await fetch("/api/profile"));
}

export async function updateProfile(payload: {
  roleId?: string;
  fullName?: string;
  phoneNumber?: string | null;
  aiLevel?: number;
  avatar?: AppAvatarChoice | null;
}): Promise<ProfileResponse> {
  return parseJson(
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export type ProgressMap = Record<string, "chua-hoc" | "dang-hoc" | "hoan-thanh">;

export async function fetchProgress(): Promise<{ ok: boolean; progress: ProgressMap }> {
  return parseJson(await fetch("/api/progress"));
}

export async function updateModuleProgress(
  moduleId: string,
  status: "chua-hoc" | "dang-hoc" | "hoan-thanh",
): Promise<{ ok: boolean; progress: ProgressMap }> {
  return parseJson(
    await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, status }),
    }),
  );
}

export type TimeLogItem = {
  id: string;
  hoursSaved: number;
  usefulness?: number;
  note?: string;
  loggedAt: string;
};

export async function fetchTimeLogs(): Promise<{
  ok: boolean;
  logs: TimeLogItem[];
  totalHours: number;
}> {
  return parseJson(await fetch("/api/nhat-ky"));
}

export async function createTimeLog(payload: {
  hoursSaved: number;
  usefulness?: number;
  note?: string;
}): Promise<{ ok: boolean; logs: TimeLogItem[]; totalHours: number }> {
  return parseJson(
    await fetch("/api/nhat-ky", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function submitQuizResult(payload: {
  roleId: string;
  score?: number;
  moduleId?: string;
  answers?: number[];
}): Promise<{
  ok: boolean;
  score?: number;
  correctCount?: number;
  questionCount?: number;
  reviewStatus?: string;
  gradingResultId?: string | null;
  gradingPersisted?: boolean;
  passed?: boolean;
}> {
  return parseJson(
    await fetch("/api/quiz-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export type QuizResultItem = {
  id: string;
  roleId: string;
  score: number;
  passed: boolean;
  createdAt: string;
};

export async function fetchQuizSummary(): Promise<{
  ok: boolean;
  averageScore: number;
  bestScore: number;
  count: number;
  results: QuizResultItem[];
}> {
  return parseJson(await fetch("/api/quiz-results"));
}

export async function fetchHocTapDepartments(): Promise<{
  ok: boolean;
  departments: HocTapDepartmentOption[];
  source: HocTapDepartmentSource;
  persisted: boolean;
}> {
  return parseJson(await fetch("/api/hoc-tap/departments"));
}

export async function fetchHocTapOverview(
  days: HocTapOverviewDays,
): Promise<HocTapOverviewResponse> {
  if (!isSupabaseBackend()) {
    return buildDemoHocTapOverview(days);
  }
  return parseJson(await fetch(`/api/hoc-tap/overview?days=${days}`));
}

export async function updateHocTapStudySession(
  payload:
    | { action: "start"; moduleId: string }
    | { action: "heartbeat" | "end"; sessionId: string },
): Promise<{
  ok: boolean;
  sessionId: string;
  startedAt?: string;
  durationSeconds: number;
  ended?: boolean;
  persisted: boolean;
}> {
  return parseJson(
    await fetch("/api/hoc-tap/study-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: payload.action === "end",
    }),
  );
}

export async function fetchHocTapRooms(): Promise<{
  ok: boolean;
  rooms: HocTapPublicRoom[];
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(await fetch("/api/hoc-tap/rooms"));
}

export type HocTapAiRoomDifficulty =
  | "Dễ"
  | "Trung bình"
  | "Khó"
  | "Thực chiến";

export type HocTapRoomPreviewPayload = {
  title: string;
  topic: string;
  context: string;
  questionCount: number;
  difficulty: HocTapAiRoomDifficulty;
  roomType: HocTapRoomType;
};

export async function previewHocTapRoomQuestions(
  payload: HocTapRoomPreviewPayload,
): Promise<{
  ok: boolean;
  title: string;
  topic: string;
  context: string;
  questionCount: number;
  difficulty: HocTapAiRoomDifficulty;
  roomType: HocTapRoomType;
  questions: HocTapRoomQuestionInput[];
  source: "openai" | "fallback";
  persisted: false;
}> {
  return parseJson(
    await fetch("/api/hoc-tap/rooms/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function createHocTapRoom(payload: {
  hostName: string;
  avatarSeed?: string;
  quizId?: string;
  aiProject?: HocTapRoomAiProjectInput;
  questions?: HocTapRoomQuestionInput[];
  mode: HocTapRoomMode;
  roomType?: HocTapRoomType;
  maxPlayers: number;
  entryRole?: HocTapRoomEntryRole;
  locked?: boolean;
}): Promise<
  {
    ok: boolean;
    persisted: boolean;
    source: "memory" | "supabase";
    questionSource?: "openai" | "fallback" | "selected";
  } & HocTapRoomCreateResult
> {
  return parseJson(
    await fetch("/api/hoc-tap/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function joinHocTapRoomByCode(payload: {
  code: string;
  playerName: string;
  avatarSeed?: string;
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  participantId: string;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch("/api/hoc-tap/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function fetchHocTapRoom(
  code: string,
  participantId?: string | null,
): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  const search = participantId
    ? `?participantId=${encodeURIComponent(participantId)}`
    : "";
  return parseJson(
    await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(code)}${search}`),
  );
}

export async function startHocTapRoomGame(payload: {
  code: string;
  hostToken?: string;
  participantId?: string;
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostToken: payload.hostToken,
        participantId: payload.participantId,
      }),
    }),
  );
}

export async function updateHocTapRoomSettings(payload: {
  code: string;
  locked: boolean;
  hostToken?: string;
  participantId?: string;
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locked: payload.locked,
        hostToken: payload.hostToken,
        participantId: payload.participantId,
      }),
    }),
  );
}

export async function deleteHocTapRoomGame(payload: {
  code: string;
  hostToken?: string;
  participantId?: string;
}): Promise<{
  ok: boolean;
  code: string;
  deleted: true;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostToken: payload.hostToken,
        participantId: payload.participantId,
      }),
    }),
  );
}

export async function submitHocTapRoomAnswer(payload: {
  code: string;
  participantId: string;
  questionIndex: number;
  answerIndex: number;
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(`/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participantId: payload.participantId,
        questionIndex: payload.questionIndex,
        answerIndex: payload.answerIndex,
      }),
    }),
  );
}

export async function advanceHocTapRoomGame(payload: {
  code: string;
  hostToken?: string;
  participantId?: string;
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(
      `/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}/advance`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostToken: payload.hostToken,
          participantId: payload.participantId,
        }),
      },
    ),
  );
}

export async function updateHocTapRoomQuestions(payload: {
  code: string;
  hostToken: string;
  questions: HocTapRoomQuestionInput[];
}): Promise<{
  ok: boolean;
  room: HocTapRoomSnapshot;
  persisted: boolean;
  source: "memory" | "supabase";
}> {
  return parseJson(
    await fetch(
      `/api/hoc-tap/rooms/${encodeURIComponent(payload.code)}/questions`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostToken: payload.hostToken,
          questions: payload.questions,
        }),
      },
    ),
  );
}

export async function fetchModules(
  roleId: string,
  aiLevel = 0,
): Promise<{ ok: boolean; modules: LearningModuleRecord[] }> {
  return parseJson(
    await fetch(
      `/api/modules?role_id=${encodeURIComponent(roleId)}&ai_level=${aiLevel}`,
    ),
  );
}

export async function fetchModule(
  moduleId: string,
): Promise<{ ok: boolean; module: LearningModuleRecord }> {
  return parseJson(
    await fetch(`/api/modules/${encodeURIComponent(moduleId)}`),
  );
}

export type LeadItem = {
  id: string;
  email: string;
  name: string | null;
  source: string;
  createdAt: string;
};

export async function fetchLeads(): Promise<{
  ok: boolean;
  leads: LeadItem[];
  total: number;
  persisted?: boolean;
  message?: string;
}> {
  return parseJson(await fetch("/api/leads"));
}

export async function fetchManagerTeam(): Promise<{
  ok: boolean;
  members: TeamMember[];
  total: number;
  organizationName: string;
  persisted?: boolean;
  message?: string;
}> {
  return parseJson(await fetch("/api/manager/team"));
}

export async function inviteManagerTeamMember(payload: {
  email: string;
  grantManagerAccess: boolean;
  // Gán sẵn phòng ban + vị trí trước khi mời (mục 2). API bỏ qua nếu chưa hỗ trợ.
  departmentId?: string;
  positionId?: string;
  positionName?: string;
}): Promise<{
  ok: boolean;
  member: TeamMember;
  persisted?: boolean;
  message: string;
}> {
  return parseJson(
    await fetch("/api/manager/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export type ManagerInviteLink = {
  id: string;
  organizationId: string;
  organizationName: string;
  createdBy: string;
  token: string;
  url: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

export async function fetchManagerInviteLink(): Promise<{
  ok: boolean;
  link: ManagerInviteLink | null;
  organizationName: string;
  persisted?: boolean;
  message?: string;
}> {
  return parseJson(await fetch("/api/manager/invite-links"));
}

export async function createManagerInviteLink(): Promise<{
  ok: boolean;
  link: ManagerInviteLink;
  organizationName: string;
  persisted?: boolean;
  message: string;
}> {
  return parseJson(
    await fetch("/api/manager/invite-links", {
      method: "POST",
    }),
  );
}

export async function rotateManagerInviteLink(): Promise<{
  ok: boolean;
  link: ManagerInviteLink;
  organizationName: string;
  persisted?: boolean;
  message: string;
}> {
  return parseJson(
    await fetch("/api/manager/invite-links/rotate", {
      method: "POST",
    }),
  );
}

export type PracticeRubricScore = {
  criteria: string;
  points: number;
  comment: string;
};

export type ManagerGradingQueueItem = {
  id: string;
  userId: string;
  employeeName: string | null;
  moduleId: string | null;
  moduleTitle: string | null;
  score: number;
  confidence: number;
  reviewStatus: "auto-approved" | "manager-review" | "needs-revision";
  feedback: string;
  rubricBreakdown: Array<{
    criterion: string;
    points: number;
    maxPoints: number;
    note: string;
  }>;
  evidence: string[];
  strengths: string[];
  improvements: string[];
  submittedAt: string;
  model: string | null;
};

export async function fetchManagerGradingQueue(): Promise<{
  ok: boolean;
  items: ManagerGradingQueueItem[];
  persisted?: boolean;
  message?: string;
}> {
  return parseJson(await fetch("/api/manager/grading"));
}

export async function submitManagerGradingReview(
  resultId: string,
  payload: {
    action: "accept" | "adjust" | "needs-revision";
    reason: string;
    adjustedScore?: number;
  },
): Promise<{
  ok: boolean;
  resultId: string;
  reviewStatus: string;
  finalScore: number;
  persisted?: boolean;
  message: string;
}> {
  return parseJson(
    await fetch(`/api/manager/grading/${encodeURIComponent(resultId)}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export type ManagerMemberRecommendations = {
  userId: string;
  employeeName: string;
  department: string | null;
  roleId: string | null;
  hasSnapshot: boolean;
  snapshotAt: string | null;
  engineVersion: string | null;
  topRecommendation: {
    moduleId: string;
    moduleTitle: string | null;
    score: number;
    reasonLabels: string[];
  } | null;
  recommendations: Array<{
    moduleId: string;
    moduleTitle: string | null;
    score: number;
    reasonLabels: string[];
  }>;
  assignmentStatus: "none" | "active" | "completed";
};

export async function fetchManagerRecommendations(): Promise<{
  ok: boolean;
  members: ManagerMemberRecommendations[];
  persisted?: boolean;
  message?: string;
}> {
  return parseJson(await fetch("/api/manager/recommendations"));
}

export type PracticeReview = {
  id?: string;
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  rubricScores?: PracticeRubricScore[];
  imageUrls?: string[];
  imageCount?: number;
  reviewedAt?: string;
  grading?: {
    rubricBreakdown: Array<{
      criterion: string;
      points: number;
      maxPoints: number;
      note: string;
    }>;
    evidence: string[];
    confidence: number;
    reviewStatus: "auto-approved" | "manager-review" | "needs-revision";
    rubricVersion: string;
    model: string | null;
  };
  gradingResultId?: string | null;
  gradingPersisted?: boolean;
  managerReviewReason?: string;
};

export type PathRecommendationItem = {
  moduleId: string;
  score: number;
  reasonCodes: string[];
  reasonLabels: string[];
  summary?: string;
  breakdown?: Record<string, number>;
};

export async function fetchPathRecommendations(payload?: {
  limit?: number;
  persist?: boolean;
  forcePersist?: boolean;
}): Promise<{
  ok: boolean;
  engineVersion: string;
  managerPriorityModuleIds?: string[];
  topRecommendation?: {
    moduleId: string;
    score: number;
    reasonLabels: string[];
    summary?: string;
  } | null;
  recommendations: PathRecommendationItem[];
}> {
  return parseJson(
    await fetch("/api/agents/recommender", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload ?? { limit: 5 }),
    }),
  );
}

export async function submitOpenTextGrading(payload: {
  moduleId?: string;
  prompt: string;
  answer: string;
  roleId?: string;
}): Promise<{
  ok: boolean;
  result: PracticeReview & {
    grading: NonNullable<PracticeReview["grading"]>;
  };
  gradingResultId: string | null;
  gradingPersisted: boolean;
}> {
  return parseJson(
    await fetch("/api/agents/grader", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export type PracticeHistoryStats = {
  attemptCount: number;
  bestScore: number;
  latestScore: number | null;
};

export async function fetchPracticeReview(
  moduleId: string,
): Promise<{
  ok: boolean;
  review: PracticeReview | null;
  history: PracticeReview[];
  stats: PracticeHistoryStats;
}> {
  return parseJson(
    await fetch(
      `/api/practice-review?moduleId=${encodeURIComponent(moduleId)}`,
    ),
  );
}

export async function submitPracticeReview(payload: {
  moduleId: string;
  images: Array<{ imageBase64: string; mimeType: string }>;
  answerText?: string;
}): Promise<{ ok: boolean; review: PracticeReview; entry: PracticeReview }> {
  return parseJson(
    await fetch("/api/practice-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function trackEvent(
  eventName: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseBackend()) return;
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, properties }),
    });
  } catch {
    // KPI tracking không chặn UX
  }
}

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
};

type OrganizationCurrentResponse = {
  ok: boolean;
  organization: OrganizationSummary | null;
  membership: { role: string; organizationId: string } | null;
  message?: string;
  entryPath?: string;
};

export async function fetchCurrentOrganization(): Promise<OrganizationCurrentResponse> {
  return parseJson(await fetch("/api/organizations/current"));
}

export async function createOrganization(payload: {
  name: string;
  slug?: string;
}): Promise<OrganizationCurrentResponse> {
  return parseJson(
    await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateCurrentOrganization(payload: {
  name?: string;
  logoUrl?: string | null;
}): Promise<OrganizationCurrentResponse> {
  return parseJson(
    await fetch("/api/organizations/current", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

import type { ResumeLesson } from "@/lib/resume-lesson";

export type ChatHistoryResponse = {
  ok: boolean;
  conversationId: string | null;
  coreContext: string | null;
  resumeLesson: ResumeLesson | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
};

export type ChatConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  createdAt: string;
};

export type ChatConversationsResponse = {
  ok: boolean;
  conversations: ChatConversationSummary[];
};

export async function fetchChatHistory(options?: {
  conversationId?: string | null;
  draft?: boolean;
}): Promise<ChatHistoryResponse> {
  const params = new URLSearchParams();
  if (options?.draft) {
    params.set("draft", "1");
  } else if (options?.conversationId) {
    params.set("conversation_id", options.conversationId);
  }
  const query = params.toString();
  return parseJson(await fetch(`/api/chat/history${query ? `?${query}` : ""}`));
}

export async function fetchChatConversations(): Promise<ChatConversationsResponse> {
  return parseJson(await fetch("/api/chat/conversations"));
}

export async function deleteChatConversation(
  conversationId: string,
): Promise<{ ok: boolean; deleted: boolean }> {
  return parseJson(
    await fetch(`/api/chat/conversations/${conversationId}`, {
      method: "DELETE",
    }),
  );
}

export type {
  AgentHealthCard,
  AgentHealthReport,
  AgentHealthStatus,
  AgentRuntimeMode,
} from "@/lib/agent-health";

export async function fetchAgentHealth(): Promise<
  import("@/lib/agent-health").AgentHealthReport
> {
  return parseJson(await fetch("/api/manager/agent-health"));
}
