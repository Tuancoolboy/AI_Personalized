import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatAudience } from "@/lib/chat-types";
import {
  selectManagerMembership,
  type ManagerMembershipRow,
} from "@/lib/manager-membership";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import type { ResumeLesson } from "@/lib/resume-lesson";
import { resolveResumeLesson } from "@/lib/resume-lesson";
import { getRole, ROLES } from "@/lib/roles";
import {
  metadataFullName,
  resolveFullDisplayName,
  buildFriendlyAddress,
} from "@/lib/display-name";
import { summarizeChatSessionTitle } from "@/lib/chat-session-title";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import type { RoleId } from "@/lib/openai";
import { ROLE_LABEL } from "@/lib/openai";
import {
  fetchOrgAssessmentSignals,
  formatOrgAssessmentSignals,
} from "@/lib/manager-analytics-summary";
import {
  sanitizeChatTranscriptLine,
  sanitizePromptContextText,
} from "@/lib/chat-prompt-safety";

const MEMORY_REFRESH_MIN_MS = 5 * 60 * 1000;
const MEMORY_REFRESH_MIN_TURNS = 3;
const RECENT_HISTORY_LIMIT = 6;
const memoryRefreshInflight = new Map<string, Promise<void>>();

async function claimMemoryRefreshSlot(
  supabase: SupabaseClient,
  userId: string,
  audience: ChatAudience,
  existing: { core_context: string | null; updated_at: string | null } | null,
): Promise<string | null> {
  const claimAt = new Date().toISOString();

  if (existing?.updated_at) {
    const { data, error } = await supabase
      .from("chat_memories")
      .update({ updated_at: claimAt })
      .eq("user_id", userId)
      .eq("audience", audience)
      .eq("updated_at", existing.updated_at)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return null;
    }
    return claimAt;
  }

  const { error } = await supabase.from("chat_memories").insert({
    user_id: userId,
    audience,
    core_context: "",
    updated_at: claimAt,
  });

  if (error) {
    if (error.code === "23505") {
      return null;
    }
    console.error("[chat-memory-refresh-claim]", error.message);
    return null;
  }

  return claimAt;
}

type OpenAIMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function loadCoreContext(
  userId: string,
  audience: ChatAudience,
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("chat_memories")
    .select("core_context")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();
  return data?.core_context ?? "";
}

export async function loadResumeLesson(
  userId: string,
  roleId: RoleId,
): Promise<ResumeLesson | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("module_progress")
    .select("module_id, status")
    .eq("user_id", userId);

  const progressByModuleId: Record<string, string> = {};
  for (const row of data ?? []) {
    progressByModuleId[row.module_id] = row.status;
  }

  return resolveResumeLesson(roleId, progressByModuleId);
}

export async function loadRecentChatMessages(
  conversationId: string,
  limit = RECENT_HISTORY_LIMIT,
): Promise<OpenAIMessage[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data?.length) return [];

  return [...data]
    .reverse()
    .filter(
      (row): row is OpenAIMessage =>
        (row.role === "user" || row.role === "assistant") &&
        typeof row.content === "string",
    );
}

const DEFAULT_CONVERSATION_TITLES: Record<ChatAudience, string> = {
  manager: "Trợ lý quản lý",
  employee: "Trợ lý học tập",
};

function truncateTitle(text: string, max = 50): string {
  return summarizeChatSessionTitle(text, max);
}

export async function refineConversationTitle(
  userId: string,
  conversationId: string,
  userMessage: string,
): Promise<void> {
  const client = getOpenAIClient();
  if (!client) return;

  try {
    const res = await client.chat.completions.create({
      model: getOpenAIModel(),
      max_tokens: 24,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            'Tóm tắt YÊU CẦU người dùng thành tiêu đề sidebar tiếng Việt (3–8 từ). Không trích nguyên câu hỏi, không dấu hỏi, không ngoặc kép. Ví dụ: "Báo cáo marketing tháng này", "Tiến độ học tập". Chỉ trả về tiêu đề.',
        },
        { role: "user", content: userMessage },
      ],
    });

    const aiTitle = res.choices[0]?.message?.content
      ?.trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\?+$/, "");
    if (!aiTitle || aiTitle.length > 60) return;

    const supabase = await createSupabaseServerClient();
    await supabase
      .from("chat_conversations")
      .update({ title: aiTitle })
      .eq("id", conversationId)
      .eq("user_id", userId);
  } catch {
    // heuristic title already saved — fail open
  }
}

export async function createConversation(
  userId: string,
  audience: ChatAudience,
  title?: string,
): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: created, error } = await supabase
    .from("chat_conversations")
    .insert({
      user_id: userId,
      audience,
      title: title?.trim() || DEFAULT_CONVERSATION_TITLES[audience],
    })
    .select("id")
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message ?? "Không tạo được conversation");
  }
  return created.id;
}

export async function listConversations(
  userId: string,
  audience: ChatAudience,
): Promise<
  Array<{
    id: string;
    title: string;
    updatedAt: string;
    createdAt: string;
  }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("chat_conversations")
    .select("id, title, updated_at, created_at")
    .eq("user_id", userId)
    .eq("audience", audience)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return (
    data?.map((row) => ({
      id: row.id,
      title:
        row.title?.trim() ||
        DEFAULT_CONVERSATION_TITLES[audience],
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })) ?? []
  );
}

export async function deleteConversation(
  userId: string,
  conversationId: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("chat_conversations")
    .delete()
    .eq("id", conversationId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getOrCreateConversation(
  userId: string,
  audience: ChatAudience,
  conversationId?: string | null,
  options?: { forceNew?: boolean; initialTitle?: string },
): Promise<string> {
  if (options?.forceNew) {
    return createConversation(userId, audience, options.initialTitle);
  }

  const supabase = await createSupabaseServerClient();

  if (conversationId) {
    const { data: existing } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .eq("audience", audience)
      .maybeSingle();
    if (existing?.id) return existing.id;
  }

  const { data: latest } = await supabase
    .from("chat_conversations")
    .select("id")
    .eq("user_id", userId)
    .eq("audience", audience)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.id) return latest.id;

  return createConversation(userId, audience);
}

export async function saveChatTurn(
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantMessage: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  const currentTitle = conversation?.title?.trim() ?? "";
  const isDefaultTitle =
    !currentTitle ||
    currentTitle === DEFAULT_CONVERSATION_TITLES.employee ||
    currentTitle === DEFAULT_CONVERSATION_TITLES.manager;

  await supabase.from("chat_messages").insert([
    {
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: userMessage,
    },
    {
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: assistantMessage,
    },
  ]);

  const updatePayload: { updated_at: string; title?: string } = {
    updated_at: now,
  };
  if (isDefaultTitle) {
    updatePayload.title = truncateTitle(userMessage);
  }

  await supabase
    .from("chat_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export async function saveUserMessageOnly(
  userId: string,
  conversationId: string,
  userMessage: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const { data: conversation } = await supabase
    .from("chat_conversations")
    .select("title")
    .eq("id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  const currentTitle = conversation?.title?.trim() ?? "";
  const isDefaultTitle =
    !currentTitle ||
    currentTitle === DEFAULT_CONVERSATION_TITLES.employee ||
    currentTitle === DEFAULT_CONVERSATION_TITLES.manager;

  await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "user",
    content: userMessage,
  });

  const updatePayload: { updated_at: string; title?: string } = {
    updated_at: now,
  };
  if (isDefaultTitle) {
    updatePayload.title = truncateTitle(userMessage);
  }

  await supabase
    .from("chat_conversations")
    .update(updatePayload)
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export async function appendAssistantReply(
  userId: string,
  conversationId: string,
  assistantMessage: string,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  await supabase.from("chat_messages").insert({
    conversation_id: conversationId,
    user_id: userId,
    role: "assistant",
    content: assistantMessage,
  });

  await supabase
    .from("chat_conversations")
    .update({ updated_at: now })
    .eq("id", conversationId)
    .eq("user_id", userId);
}

export async function loadChatHistory(
  userId: string,
  audience: ChatAudience,
  conversationId?: string | null,
): Promise<{
  conversationId: string | null;
  coreContext: string | null;
  resumeLesson: ResumeLesson | null;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: string;
  }>;
}> {
  const supabase = await createSupabaseServerClient();

  const { data: memory } = await supabase
    .from("chat_memories")
    .select("core_context")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();

  let resumeLesson: ResumeLesson | null = null;
  if (audience === "employee") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", userId)
      .maybeSingle();
    const roleId = profile?.role_id as RoleId | null;
    if (roleId && roleId in ROLES) {
      resumeLesson = await loadResumeLesson(userId, roleId);
    }
  }

  let resolvedConversationId = conversationId ?? null;

  if (resolvedConversationId) {
    const { data: owned } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("id", resolvedConversationId)
      .eq("user_id", userId)
      .eq("audience", audience)
      .maybeSingle();
    if (!owned?.id) {
      resolvedConversationId = null;
    }
  }

  if (!resolvedConversationId) {
    const { data: latest } = await supabase
      .from("chat_conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("audience", audience)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedConversationId = latest?.id ?? null;
  }

  if (!resolvedConversationId) {
    return {
      conversationId: null,
      coreContext: memory?.core_context ?? null,
      resumeLesson,
      messages: [],
    };
  }

  const { data: rows } = await supabase
    .from("chat_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", resolvedConversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return {
    conversationId: resolvedConversationId,
    coreContext: memory?.core_context ?? null,
    resumeLesson,
    messages:
      rows
        ?.filter(
          (row) => row.role === "user" || row.role === "assistant",
        )
        .map((row) => ({
          id: row.id,
          role: row.role as "user" | "assistant",
          content: row.content,
          createdAt: row.created_at,
        })) ?? [],
  };
}

function countModulesForRole(roleId: string): number {
  const role = getRole(roleId);
  return role?.modules.length ?? 0;
}

function moduleTitle(moduleId: string, roleId: string | null): string {
  if (!roleId) return moduleId;
  const role = getRole(roleId);
  const mod = role?.modules.find((m) => m.id === moduleId);
  return mod?.title ?? moduleId;
}

async function aggregateProgressForUser(
  supabase: SupabaseClient,
  userId: string,
  roleId: string | null,
): Promise<{
  completed: number;
  total: number;
  percent: number;
  currentModule: string | null;
  avgQuiz: number | null;
  totalHours: number;
}> {
  const totalModules = roleId ? countModulesForRole(roleId) : 0;

  const [{ data: progressRows }, { data: quizRows }, { data: timeRows }] =
    await Promise.all([
      supabase
        .from("module_progress")
        .select("module_id, status")
        .eq("user_id", userId),
      supabase
        .from("quiz_results")
        .select("score, role_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("time_logs")
        .select("hours_saved")
        .eq("user_id", userId),
    ]);

  const completed =
    progressRows?.filter((row) => row.status === "hoan-thanh").length ?? 0;
  const inProgress = progressRows?.find((row) => row.status === "dang-hoc");
  const percent =
    totalModules > 0 ? Math.round((completed / totalModules) * 100) : 0;

  const bestByRole = new Map<string, number>();
  for (const row of quizRows ?? []) {
    const prev = bestByRole.get(row.role_id);
    if (prev === undefined || row.score > prev) {
      bestByRole.set(row.role_id, row.score);
    }
  }
  const scores = [...bestByRole.values()];
  const avgQuiz =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

  const totalHours =
    timeRows?.reduce((sum, row) => sum + Number(row.hours_saved), 0) ?? 0;

  return {
    completed,
    total: totalModules,
    percent,
    currentModule: inProgress
      ? moduleTitle(inProgress.module_id, roleId)
      : null,
    avgQuiz,
    totalHours: Math.round(totalHours * 10) / 10,
  };
}

export async function getEmployeeProgressSummary(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role_id, ai_level")
    .eq("id", userId)
    .maybeSingle();

  const roleId = (profile?.role_id as RoleId | null) ?? null;
  const stats = await aggregateProgressForUser(supabase, userId, roleId);

  const roleLabel = roleId ? ROLE_LABEL[roleId] : "Chưa chọn vai trò";
  const name = profile?.full_name?.trim() || "Nhân viên";

  const lines = [
    `- Tên: ${name}`,
    `- Vai trò: ${roleLabel}`,
    `- Cấp AI (self-assessment): ${profile?.ai_level ?? 0}/5`,
    `- Hoàn thành lộ trình: ${stats.completed}/${stats.total} module (${stats.percent}%)`,
  ];

  if (stats.currentModule) {
    lines.push(`- Module đang học: ${stats.currentModule}`);
  } else if (stats.total > 0 && stats.completed < stats.total) {
    lines.push("- Module đang học: chưa bắt đầu module tiếp theo");
  }

  if (stats.avgQuiz !== null) {
    lines.push(`- Điểm quiz TB (theo vai trò): ${stats.avgQuiz}/100`);
  }

  lines.push(`- Tổng giờ tiết kiệm (nhật ký): ${stats.totalHours} giờ`);

  return lines.join("\n");
}

export async function getTeamAnalysisSummary(
  managerUserId: string,
): Promise<string> {
  const authClient = await createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user || user.id !== managerUserId) {
    return "Không xác thực được quản lý.";
  }

  const { data: managerMembershipRows, error: membershipError } = await authClient
    .from("organization_members")
    .select(
      "organization_id, member_role, updated_at, created_at, organizations(name)",
    )
    .eq("user_id", managerUserId)
    .in("member_role", ["manager", "owner"]);

  if (membershipError) {
    console.warn("[team-analysis-summary]", membershipError.message);
    return "Không đọc được quyền quản lý.";
  }

  const managerMembership = selectManagerMembership(
    (managerMembershipRows as ManagerMembershipRow[] | null) ?? [],
  );

  if (!managerMembership?.organizationId) {
    return "Chưa có quyền quản lý tổ chức — không đọc được dữ liệu team.";
  }

  const organizationId = managerMembership.organizationId;

  const { data: memberRows, error: memberError } = await authClient
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("member_role", "employee");

  if (memberError) {
    console.warn("[team-analysis-summary]", memberError.message);
    return "Không đọc được danh sách nhân viên.";
  }

  const scopedEmployeeIds = [
    ...new Set(
      (memberRows ?? [])
        .map((row) => row.user_id)
        .filter((id): id is string => typeof id === "string" && id !== managerUserId),
    ),
  ];

  if (scopedEmployeeIds.length === 0) {
    return "Chưa có nhân viên nào trong tổ chức của bạn.";
  }

  // Cross-user progress/profile reads still need service role until manager RLS
  // policies exist on profiles/module_progress/quiz_results/time_logs (BE-08 follow-up).
  let serviceClient: SupabaseClient;
  try {
    serviceClient = createSupabaseServiceClient();
  } catch {
    return "Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY — không đọc được dữ liệu team.";
  }

  const { data: profiles } = await serviceClient
    .from("profiles")
    .select("id, full_name, role_id, ai_level")
    .in("id", scopedEmployeeIds);

  const profileMap = new Map(
    (profiles ?? [])
      .filter((profile) => scopedEmployeeIds.includes(profile.id))
      .map((profile) => [profile.id, profile]),
  );

  const summaries: string[] = [];

  for (const userId of scopedEmployeeIds) {
    const profile = profileMap.get(userId);
    const roleId = (profile?.role_id as string | null) ?? null;
    if (!roleId || !ROLES[roleId]) continue;

    const stats = await aggregateProgressForUser(serviceClient, userId, roleId);
    const name = profile?.full_name?.trim() || "Chưa có tên";
    const roleShort = getRole(roleId)?.shortLabel ?? roleId;

    let status = "Ổn định";
    if (stats.percent < 30) status = "Chậm — cần kèm";
    else if (stats.percent < 60) status = "Đang tiến bộ";

    summaries.push(
      `• ${name} (${roleShort}): ${stats.percent}% hoàn thành (${stats.completed}/${stats.total}), quiz TB ${stats.avgQuiz ?? "—"}/100, ${stats.totalHours}h tiết kiệm — ${status}`,
    );
  }

  if (summaries.length === 0) {
    return "Có tài khoản nhân viên nhưng chưa ai hoàn thành onboarding/chọn vai trò.";
  }

  const signals = await fetchOrgAssessmentSignals(
    serviceClient,
    organizationId,
    scopedEmployeeIds,
  );
  const signalBlock = formatOrgAssessmentSignals(signals);
  const detailBlock = `CHI TIẾT TỪNG NHÂN VIÊN:\n${summaries.join("\n")}`;

  if (signalBlock) {
    return `${signalBlock}\n\n${detailBlock}`;
  }

  return summaries.join("\n");
}

export async function refreshCoreContext(
  userId: string,
  audience: ChatAudience,
  recentMessages: OpenAIMessage[],
): Promise<void> {
  const inflightKey = `${userId}:${audience}`;
  const inflight = memoryRefreshInflight.get(inflightKey);
  if (inflight) {
    await inflight;
    return;
  }

  const task = refreshCoreContextOnce(userId, audience, recentMessages);
  memoryRefreshInflight.set(inflightKey, task);
  try {
    await task;
  } finally {
    memoryRefreshInflight.delete(inflightKey);
  }
}

async function refreshCoreContextOnce(
  userId: string,
  audience: ChatAudience,
  recentMessages: OpenAIMessage[],
): Promise<void> {
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("chat_memories")
    .select("core_context, updated_at")
    .eq("user_id", userId)
    .eq("audience", audience)
    .maybeSingle();

  const lastUpdated = existing?.updated_at
    ? new Date(existing.updated_at).getTime()
    : 0;
  const elapsed = Date.now() - lastUpdated;
  const turnCount = recentMessages.length;

  if (
    existing?.core_context &&
    elapsed < MEMORY_REFRESH_MIN_MS &&
    turnCount < MEMORY_REFRESH_MIN_TURNS
  ) {
    return;
  }

  const claimAt = await claimMemoryRefreshSlot(
    supabase,
    userId,
    audience,
    existing,
  );
  if (!claimAt) {
    return;
  }

  const { getOpenAIClient, getOpenAIModel } = await import("@/lib/openai");
  const client = getOpenAIClient();
  if (!client) return;

  const profile = await resolveProfileBasics(userId);
  const friendly = buildFriendlyAddress(profile.fullName);

  const transcript = recentMessages
    .slice(-6)
    .map(
      (msg) =>
        `${msg.role === "user" ? "User" : "Assistant"}: ${sanitizeChatTranscriptLine(msg.content)}`,
    )
    .join("\n");

  const priorContext = sanitizePromptContextText(existing?.core_context ?? "", 800);

  const audienceLabel =
    audience === "manager" ? "quản lý phân tích team" : "nhân viên học AI";

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      max_tokens: 220,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `Bạn tóm tắt trí nhớ dài hạn cho trợ lý AI (${audienceLabel}). User tên ${profile.fullName}, gọi thân mật "${friendly}" — KHÔNG viết "anh/chị". Viết tiếng Việt, tối đa 180 từ, gồm: chủ đề quan tâm, tiến độ/module đã học, yêu cầu chưa xong, gợi ý bước tiếp theo. Không lưu dữ liệu nhạy cảm. KHÔNG dùng markdown, dấu « », hay ** in đậm — chỉ plain text.`,
        },
        {
          role: "user",
          content: `Core context cũ:\n${priorContext || "(trống)"}\n\nHội thoại mới:\n${transcript}`,
        },
      ],
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    if (!summary) return;

    const sanitizedSummary = sanitizePromptContextText(summary, 900);

    const { data: saved, error: saveError } = await supabase
      .from("chat_memories")
      .update({
        core_context: sanitizedSummary,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("audience", audience)
      .eq("updated_at", claimAt)
      .select("id")
      .maybeSingle();

    if (saveError) {
      console.error("[chat-memory-refresh-save]", saveError.message);
      return;
    }

    if (!saved) {
      // Lost claim to another instance — skip overwrite.
      return;
    }
  } catch (err) {
    if (!existing?.core_context && claimAt) {
      await supabase
        .from("chat_memories")
        .delete()
        .eq("user_id", userId)
        .eq("audience", audience)
        .eq("updated_at", claimAt);
    }
    console.error("[chat-memory-refresh]", err);
  }
}

export async function resolveProfileBasics(userId: string): Promise<{
  fullName: string;
  roleId: RoleId | null;
}> {
  const supabase = await createSupabaseServerClient();
  const [{ data }, { data: authData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  const roleId =
    data?.role_id && data.role_id in ROLES
      ? (data.role_id as RoleId)
      : null;

  const fullName = resolveFullDisplayName({
    profileFullName: data?.full_name,
    metadataFullName: metadataFullName(authData.user?.user_metadata),
    email: authData.user?.email,
    fallback: "bạn",
  });

  return {
    fullName,
    roleId,
  };
}
