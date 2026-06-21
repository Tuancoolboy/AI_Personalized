import type { SupabaseClient } from "@supabase/supabase-js";
import { RECOMMENDER_ENGINE_VERSION } from "@/lib/agents/recommender";
import {
  getOpenAIModel,
  getRateLimitPerDay,
  isOpenAIConfigured,
} from "@/lib/openai";
import type { ManagerMembership } from "@/lib/manager-membership";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export type AgentHealthStatus =
  | "healthy"
  | "degraded"
  | "inactive"
  | "unavailable";

export type AgentRuntimeMode = "live" | "demo" | "partial";

export type AgentHealthMetric = {
  label: string;
  value: string;
};

export type AgentHealthCard = {
  id: "tutor" | "grader" | "recommender" | "manager-analytics";
  label: string;
  subtitle: string;
  runtimeMode: AgentRuntimeMode;
  status: AgentHealthStatus;
  lastActivityAt: string | null;
  callsLast7Days: number;
  callsLast30Days: number;
  metrics: AgentHealthMetric[];
  issues: string[];
  links: Array<{ href: string; label: string }>;
};

export type AgentHealthReport = {
  generatedAt: string;
  organizationId: string | null;
  organizationName: string;
  persisted: boolean;
  message?: string;
  platform: {
    supabaseConfigured: boolean;
    openaiConfigured: boolean;
    openaiModel: string;
    rateLimitPerDay: number;
  };
  agents: AgentHealthCard[];
};

type OrgMembers = {
  allUserIds: string[];
  employeeUserIds: string[];
  managerUserIds: string[];
};

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Chưa có";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "Chưa có";
  const diffMs = Date.now() - then;
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) return "Vừa xong";
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hôm qua";
  return `${diffDays} ngày trước`;
}

function isMissingTable(message: string, table: string): boolean {
  return new RegExp(`${table}|does not exist`, "i").test(message);
}

export function resolveAgentStatus(input: {
  runtimeMode: AgentRuntimeMode;
  callsLast7Days: number;
  callsLast30Days: number;
  unavailable?: boolean;
  issues?: string[];
}): AgentHealthStatus {
  if (input.unavailable) return "unavailable";
  if (input.callsLast30Days === 0) return "inactive";
  if (
    input.runtimeMode !== "live" ||
    input.callsLast7Days === 0 ||
    (input.issues?.length ?? 0) > 0
  ) {
    return "degraded";
  }
  return "healthy";
}

function platformSnapshot() {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    openaiConfigured: isOpenAIConfigured(),
    openaiModel: getOpenAIModel(),
    rateLimitPerDay: getRateLimitPerDay(),
  };
}

export function buildDemoAgentHealthReport(
  membership: ManagerMembership,
): AgentHealthReport {
  const now = new Date().toISOString();
  const openai = isOpenAIConfigured();

  return {
    generatedAt: now,
    organizationId: membership.organizationId,
    organizationName: membership.organizationName,
    persisted: false,
    message:
      "Dữ liệu demo — bật Supabase + migrations 0012/0019/0020 để xem số liệu thật theo tổ chức.",
    platform: platformSnapshot(),
    agents: [
      {
        id: "tutor",
        label: "Trợ lý AI (nhân viên)",
        subtitle: "Agent 1 · Gia sư cá nhân theo vai trò",
        runtimeMode: openai ? "partial" : "demo",
        status: openai ? "degraded" : "unavailable",
        lastActivityAt: now,
        callsLast7Days: 12,
        callsLast30Days: 48,
        metrics: [
          { label: "Lượt chat 7 ngày", value: "12" },
          { label: "Người dùng active", value: "3 / 5 NV" },
          { label: "Giới hạn/ngày", value: String(getRateLimitPerDay()) },
          { label: "Lần cuối", value: formatRelativeTime(now) },
        ],
        issues: openai
          ? ["Đang dùng dữ liệu demo, chưa aggregate Supabase"]
          : ["Thiếu OPENAI_API_KEY — fallback canned"],
        links: [
          { href: "/tro-ly", label: "Mở trợ lý AI" },
          { href: "/quan-ly/nhan-vien", label: "Xem nhân viên" },
        ],
      },
      {
        id: "grader",
        label: "Chấm điểm & đánh giá",
        subtitle: "Agent 2 · Quiz rule-based + AI thực hành/tự luận",
        runtimeMode: openai ? "partial" : "demo",
        status: "degraded",
        lastActivityAt: now,
        callsLast7Days: 5,
        callsLast30Days: 18,
        metrics: [
          { label: "Bài chấm 7 ngày", value: "5" },
          { label: "Chờ quản lý duyệt", value: "1" },
          { label: "Điểm TB", value: "74" },
          { label: "Tin cậy TB", value: "81%" },
        ],
        issues: ["Demo queue — migration 0020 để persist thật"],
        links: [
          { href: "/quan-ly/bai-lam", label: "Hàng đợi duyệt" },
          { href: "/lo-trinh", label: "Bài thực hành NV" },
        ],
      },
      {
        id: "recommender",
        label: "Gợi ý lộ trình",
        subtitle: "Agent 3 · Engine rule-based v1",
        runtimeMode: "partial",
        status: "degraded",
        lastActivityAt: now,
        callsLast7Days: 8,
        callsLast30Days: 22,
        metrics: [
          { label: "Snapshot 7 ngày", value: "8" },
          { label: "NV có gợi ý", value: "4 / 5" },
          { label: "Engine", value: RECOMMENDER_ENGINE_VERSION },
          { label: "Lần cuối", value: formatRelativeTime(now) },
        ],
        issues: ["Demo snapshot — cần migration 0019"],
        links: [
          { href: "/quan-ly/phan-cong", label: "Gợi ý theo NV" },
          { href: "/lo-trinh", label: "Xem lộ trình NV" },
        ],
      },
      {
        id: "manager-analytics",
        label: "Trợ lý quản lý",
        subtitle: "Agent 4 · Chat + phân tích đội",
        runtimeMode: openai ? "partial" : "demo",
        status: openai ? "degraded" : "unavailable",
        lastActivityAt: now,
        callsLast7Days: 3,
        callsLast30Days: 9,
        metrics: [
          { label: "Phiên chat QL 7 ngày", value: "3" },
          { label: "Tin nhắn manager", value: "14" },
          { label: "Nguồn team data", value: "Demo" },
          { label: "Lần cuối", value: formatRelativeTime(now) },
        ],
        issues: openai
          ? ["Demo analytics — cần membership Supabase thật"]
          : ["Thiếu OPENAI_API_KEY cho chat quản lý"],
        links: [
          { href: "/quan-ly", label: "Dashboard đội" },
          { href: "/tro-ly", label: "Chat quản lý" },
        ],
      },
    ],
  };
}

async function loadOrgMembers(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<OrgMembers | null> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("user_id, member_role")
    .eq("organization_id", organizationId);

  if (error) {
    console.warn("[agent-health] members:", error.message);
    return null;
  }

  const rows = data ?? [];
  const allUserIds = rows.map((row) => row.user_id as string);
  const employeeUserIds = rows
    .filter((row) => row.member_role === "employee")
    .map((row) => row.user_id as string);
  const managerUserIds = rows
    .filter((row) => row.member_role === "manager" || row.member_role === "owner")
    .map((row) => row.user_id as string);

  return { allUserIds, employeeUserIds, managerUserIds };
}

async function countChatUsageSince(
  supabase: SupabaseClient,
  userIds: string[],
  sinceIso: string,
): Promise<{ count: number; lastAt: string | null; missing: boolean }> {
  if (userIds.length === 0) {
    return { count: 0, lastAt: null, missing: false };
  }

  const { count, data, error } = await supabase
    .from("chat_usage")
    .select("used_at", { count: "exact", head: false })
    .in("user_id", userIds)
    .gte("used_at", sinceIso)
    .order("used_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingTable(error.message, "chat_usage")) {
      return { count: 0, lastAt: null, missing: true };
    }
    console.warn("[agent-health] chat_usage:", error.message);
    return { count: 0, lastAt: null, missing: false };
  }

  return {
    count: count ?? 0,
    lastAt: data?.[0]?.used_at ? String(data[0].used_at) : null,
    missing: false,
  };
}

async function countGradingSince(
  supabase: SupabaseClient,
  organizationId: string,
  sinceIso: string,
): Promise<{ count: number; lastAt: string | null; missing: boolean }> {
  const { count, data, error } = await supabase
    .from("grading_results")
    .select("created_at", { count: "exact", head: false })
    .eq("organization_id", organizationId)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingTable(error.message, "grading_results")) {
      return { count: 0, lastAt: null, missing: true };
    }
    console.warn("[agent-health] grading_results:", error.message);
    return { count: 0, lastAt: null, missing: false };
  }

  return {
    count: count ?? 0,
    lastAt: data?.[0]?.created_at ? String(data[0].created_at) : null,
    missing: false,
  };
}

async function countRecommendationsSince(
  supabase: SupabaseClient,
  userIds: string[],
  sinceIso: string,
): Promise<{ count: number; lastAt: string | null; missing: boolean }> {
  if (userIds.length === 0) {
    return { count: 0, lastAt: null, missing: false };
  }

  const { count, data, error } = await supabase
    .from("learning_recommendations")
    .select("created_at", { count: "exact", head: false })
    .in("user_id", userIds)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingTable(error.message, "learning_recommendations")) {
      return { count: 0, lastAt: null, missing: true };
    }
    console.warn("[agent-health] learning_recommendations:", error.message);
    return { count: 0, lastAt: null, missing: false };
  }

  return {
    count: count ?? 0,
    lastAt: data?.[0]?.created_at ? String(data[0].created_at) : null,
    missing: false,
  };
}

async function countEventSince(
  supabase: SupabaseClient,
  userIds: string[],
  eventName: string,
  sinceIso: string,
): Promise<{ count: number; lastAt: string | null; missing: boolean }> {
  if (userIds.length === 0) {
    return { count: 0, lastAt: null, missing: false };
  }

  const { count, data, error } = await supabase
    .from("events")
    .select("created_at", { count: "exact", head: false })
    .in("user_id", userIds)
    .eq("event_name", eventName)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingTable(error.message, "events")) {
      return { count: 0, lastAt: null, missing: true };
    }
    return { count: 0, lastAt: null, missing: false };
  }

  const lastAt =
    Array.isArray(data) && data[0]?.created_at
      ? String(data[0].created_at)
      : null;
  return { count: count ?? 0, lastAt, missing: false };
}

export async function loadAgentHealthReport(
  supabase: SupabaseClient,
  membership: ManagerMembership,
): Promise<AgentHealthReport> {
  const orgId = membership.organizationId;
  const members = await loadOrgMembers(supabase, orgId);
  if (!members) {
    return {
      ...buildDemoAgentHealthReport(membership),
      message: "Không đọc được thành viên tổ chức.",
    };
  }

  const { allUserIds, employeeUserIds, managerUserIds } = members;
  const since7 = isoDaysAgo(7);
  const since30 = isoDaysAgo(30);
  const openai = isOpenAIConfigured();

  const chatUserIds =
    employeeUserIds.length > 0 ? employeeUserIds : allUserIds;

  const tutor7 = await countChatUsageSince(supabase, chatUserIds, since7);
  const tutor30 = await countChatUsageSince(supabase, chatUserIds, since30);
  const tutorEvents7 = await countEventSince(
    supabase,
    employeeUserIds.length ? employeeUserIds : allUserIds,
    "tutor_message_sent",
    since7,
  );

  const grader7 = await countGradingSince(supabase, orgId, since7);
  const grader30 = await countGradingSince(supabase, orgId, since30);

  const { count: reviewQueueCount } = await supabase
    .from("grading_results")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("review_status", "manager-review");

  const { data: gradeStats } = await supabase
    .from("grading_results")
    .select("score, confidence")
    .eq("organization_id", orgId)
    .gte("created_at", since30)
    .limit(500);

  const avgScore =
    gradeStats && gradeStats.length > 0
      ? Math.round(
          gradeStats.reduce((sum, row) => sum + Number(row.score ?? 0), 0) /
            gradeStats.length,
        )
      : null;
  const avgConfidence =
    gradeStats && gradeStats.length > 0
      ? Math.round(
          (gradeStats.reduce(
            (sum, row) => sum + Number(row.confidence ?? 0),
            0,
          ) /
            gradeStats.length) *
            100,
        )
      : null;

  const rec7 = await countRecommendationsSince(supabase, allUserIds, since7);
  const rec30 = await countRecommendationsSince(supabase, allUserIds, since30);

  const { data: latestRec } = await supabase
    .from("learning_recommendations")
    .select("engine_version, created_at")
    .in("user_id", allUserIds)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: recUsers } = await supabase
    .from("learning_recommendations")
    .select("user_id")
    .in("user_id", allUserIds)
    .gte("created_at", since30);

  const usersWithRec = new Set(
    (recUsers ?? []).map((row) => row.user_id as string),
  ).size;

  let managerChat7 = 0;
  let managerChat30 = 0;
  let managerLastAt: string | null = null;
  let managerChatMissing = false;

  if (managerUserIds.length > 0) {
    const { count: conv7, data: convData, error: convError } = await supabase
      .from("chat_conversations")
      .select("updated_at", { count: "exact", head: false })
      .in("user_id", managerUserIds)
      .eq("audience", "manager")
      .gte("updated_at", since7)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (convError && isMissingTable(convError.message, "chat_conversations")) {
      managerChatMissing = true;
    } else {
      managerChat7 = conv7 ?? 0;
      managerLastAt = convData?.[0]?.updated_at
        ? String(convData[0].updated_at)
        : null;
    }

    const { count: conv30 } = await supabase
      .from("chat_conversations")
      .select("id", { count: "exact", head: true })
      .in("user_id", managerUserIds)
      .eq("audience", "manager")
      .gte("updated_at", since30);
    managerChat30 = conv30 ?? 0;
  }

  const tutorLastAt = tutor7.lastAt ?? tutorEvents7.lastAt;
  const tutorCalls7 = Math.max(tutor7.count, tutorEvents7.count);
  const tutorCalls30 = tutor30.count;
  const tutorIssues: string[] = [];
  if (!openai) tutorIssues.push("Thiếu OPENAI_API_KEY — chat fallback canned");
  if (tutor7.missing) tutorIssues.push("Chưa có bảng chat_usage");

  const graderIssues: string[] = [];
  if (!openai) {
    graderIssues.push("Thiếu OPENAI_API_KEY — chỉ chấm quiz rule-based");
  }
  if (grader7.missing) {
    graderIssues.push("Chưa có migration 0020 (grading_results)");
  }

  const graderStatus = resolveAgentStatus({
    runtimeMode: openai ? "live" : "partial",
    callsLast7Days: grader7.count,
    callsLast30Days: grader30.count,
    unavailable: grader7.missing,
    issues: graderIssues,
  });

  const recIssues: string[] = [];
  if (rec7.missing) {
    recIssues.push("Chưa có migration 0019 (learning_recommendations)");
  }

  const managerIssues: string[] = [];
  if (!openai) managerIssues.push("Thiếu OPENAI_API_KEY cho chat quản lý");
  if (managerChatMissing) managerIssues.push("Chưa có migration 0012 (chat)");

  const employeeCount = employeeUserIds.length || allUserIds.length;

  const agents: AgentHealthCard[] = [
    {
      id: "tutor",
      label: "Trợ lý AI (nhân viên)",
      subtitle: "Agent 1 · Gia sư cá nhân theo vai trò",
      runtimeMode: openai ? "live" : "demo",
      status: resolveAgentStatus({
        runtimeMode: openai ? "live" : "demo",
        callsLast7Days: tutorCalls7,
        callsLast30Days: tutorCalls30,
        unavailable: tutor7.missing && tutorEvents7.missing,
        issues: tutorIssues,
      }),
      lastActivityAt: tutorLastAt,
      callsLast7Days: tutorCalls7,
      callsLast30Days: tutorCalls30,
      metrics: [
        { label: "Lượt chat 7 ngày", value: String(tutorCalls7) },
        {
          label: "NV có chat 30 ngày",
          value: `${tutorCalls30 > 0 ? "≥1" : "0"} / ${employeeCount}`,
        },
        { label: "Giới hạn/ngày", value: String(getRateLimitPerDay()) },
        { label: "Lần cuối", value: formatRelativeTime(tutorLastAt) },
      ],
      issues: tutorIssues,
      links: [
        { href: "/tro-ly", label: "Mở trợ lý AI" },
        { href: "/quan-ly/nhan-vien", label: "Xem nhân viên" },
      ],
    },
    {
      id: "grader",
      label: "Chấm điểm & đánh giá",
      subtitle: "Agent 2 · Quiz rule-based + AI thực hành/tự luận",
      runtimeMode: openai ? "live" : "partial",
      status: graderStatus,
      lastActivityAt: grader7.lastAt,
      callsLast7Days: grader7.count,
      callsLast30Days: grader30.count,
      metrics: [
        { label: "Bài chấm 7 ngày", value: String(grader7.count) },
        { label: "Chờ duyệt", value: String(reviewQueueCount ?? 0) },
        {
          label: "Điểm TB 30 ngày",
          value: avgScore === null ? "—" : String(avgScore),
        },
        {
          label: "Tin cậy TB",
          value: avgConfidence === null ? "—" : `${avgConfidence}%`,
        },
      ],
      issues: graderIssues,
      links: [
        { href: "/quan-ly/bai-lam", label: "Hàng đợi duyệt" },
        { href: "/lo-trinh", label: "Bài thực hành NV" },
      ],
    },
    {
      id: "recommender",
      label: "Gợi ý lộ trình",
      subtitle: "Agent 3 · Engine rule-based",
      runtimeMode: rec7.missing ? "demo" : "live",
      status: resolveAgentStatus({
        runtimeMode: rec7.missing ? "demo" : "live",
        callsLast7Days: rec7.count,
        callsLast30Days: rec30.count,
        unavailable: rec7.missing,
        issues: recIssues,
      }),
      lastActivityAt: rec7.lastAt,
      callsLast7Days: rec7.count,
      callsLast30Days: rec30.count,
      metrics: [
        { label: "Snapshot 7 ngày", value: String(rec7.count) },
        {
          label: "NV có gợi ý 30 ngày",
          value: `${usersWithRec} / ${employeeCount}`,
        },
        {
          label: "Engine",
          value:
            (latestRec?.engine_version as string | undefined) ??
            RECOMMENDER_ENGINE_VERSION,
        },
        { label: "Lần cuối", value: formatRelativeTime(rec7.lastAt) },
      ],
      issues: recIssues,
      links: [
        { href: "/quan-ly/phan-cong", label: "Gợi ý theo NV" },
        { href: "/lo-trinh", label: "Xem lộ trình NV" },
      ],
    },
    {
      id: "manager-analytics",
      label: "Trợ lý quản lý",
      subtitle: "Agent 4 · Chat + phân tích đội",
      runtimeMode: openai && !managerChatMissing ? "live" : "partial",
      status: resolveAgentStatus({
        runtimeMode: openai && !managerChatMissing ? "live" : "partial",
        callsLast7Days: managerChat7,
        callsLast30Days: managerChat30,
        unavailable: managerChatMissing && !openai,
        issues: managerIssues,
      }),
      lastActivityAt: managerLastAt,
      callsLast7Days: managerChat7,
      callsLast30Days: managerChat30,
      metrics: [
        { label: "Phiên chat QL 7 ngày", value: String(managerChat7) },
        { label: "Phiên chat QL 30 ngày", value: String(managerChat30) },
        { label: "Quản lý trong org", value: String(managerUserIds.length) },
        { label: "Lần cuối", value: formatRelativeTime(managerLastAt) },
      ],
      issues: managerIssues,
      links: [
        { href: "/quan-ly", label: "Dashboard đội" },
        { href: "/tro-ly", label: "Chat quản lý" },
      ],
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    organizationId: orgId,
    organizationName: membership.organizationName,
    persisted: true,
    platform: platformSnapshot(),
    agents,
  };
}
