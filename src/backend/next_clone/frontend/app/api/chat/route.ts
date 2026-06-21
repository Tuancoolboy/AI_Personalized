import { resolveApiSession } from "@/lib/api-auth";
import { apiError } from "@/lib/api-error";
import { checkChatRateLimit, recordChatUsage } from "@/lib/chat-rate-limit";
import {
  appendAssistantReply,
  getOrCreateConversation,
  getTeamAnalysisSummary,
  loadCoreContext,
  loadRecentChatMessages,
  refineConversationTitle,
  refreshCoreContext,
  resolveProfileBasics,
  saveUserMessageOnly,
} from "@/lib/chat-context";
import { summarizeChatSessionTitle } from "@/lib/chat-session-title";
import {
  countClarifyStepsCompleted,
  collectClarifyAnswers,
  finalizeClarifyingAssistantText,
  isClarifyUserAnswer,
  summarizeClarifyAnswersFromHistory,
} from "@/lib/chat-clarify-parse";
import { MAX_CLARIFY_QUESTIONS } from "@/lib/chat-clarify-types";
import {
  buildClarifyContextFromHistory,
  buildClarifyRuntimeHint,
} from "@/lib/chat-clarify-steps";
import {
  formatOrganizationLearningContext,
  loadOrganizationLearningContext,
} from "@/lib/chat-knowledge-company";
import { buildCurriculumKnowledgeContext, buildDemoCurriculumKnowledgeContext } from "@/lib/chat-knowledge-curriculum";
import { buildPersonalKnowledgeContext } from "@/lib/chat-knowledge-personal";
import type { ChatAudience } from "@/lib/chat-types";
import { isManagerUser } from "@/lib/manager-auth";
import {
  buildEmployeeSystemPrompt,
  buildManagerSystemPrompt,
  getCachedAnswer,
  getFallbackAnswer,
  getOpenAIClient,
  getOpenAIModel,
  getRateLimitPerDay,
  isOpenAIConfigured,
  type RoleId,
} from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit-memory";
import { getSafetyWarning } from "@/lib/safety";
import { buildDemoTeamSummary } from "@/lib/team-data";
import { startThinkingTicker } from "@/lib/chat-stream-thinking";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

// Đường OpenAI tối giản cho DEMO mode (có key, KHÔNG Supabase): system prompt theo
// vai trò, không context/history, không lưu, rate-limit in-memory. Stream như real.
async function streamDemoOpenAI(
  message: string,
  roleId: RoleId | null,
  isManager: boolean,
  safety?: string,
): Promise<Response> {
  const client = getOpenAIClient();
  if (!client) {
    const fallback = getFallbackAnswer(message, roleId ?? "khac");
    return new Response(streamText(fallback.answer, fallback.safety ?? safety), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const systemPrompt = isManager
    ? buildManagerSystemPrompt({
        fullName: "",
        coreContext: "",
        // Demo: dựng tóm tắt đội từ TEAM_MEMBERS → Trợ lý có dữ liệu phân tích,
        // không hỏi ngược (điểm quiz / giờ học).
        teamSummary: buildDemoTeamSummary(),
      })
    : buildEmployeeSystemPrompt(roleId ?? "khac", {
        fullName: "",
        preferredAddress: "neutral",
        curriculumSummary: buildDemoCurriculumKnowledgeContext(
          roleId ?? "khac",
          message,
        ),
        personalSummary: "",
        companySummary: "",
        ahaSummary: "",
        conversationMemory: "",
      });

  const stream = await client.chat.completions.create({
    model: getOpenAIModel(),
    stream: true,
    max_tokens: isManager ? 600 : 500,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ],
  });

  const encoder = new TextEncoder();
  let sentSafety = false;
  let rawText = "";
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (safety) {
        controller.enqueue(encoder.encode(`__SAFETY__:${safety}\n`));
        sentSafety = true;
      }
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) rawText += text;
        }
        const answer = finalizeClarifyingAssistantText(rawText, 1);
        if (answer) controller.enqueue(encoder.encode(answer));
        controller.close();
      } catch (err) {
        console.error("[chat-demo-openai]", err);
        if (!sentSafety) {
          controller.enqueue(
            encoder.encode("Xin lỗi, em gặp lỗi khi trả lời. Thử lại sau nhé."),
          );
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Chat-Mode": "demo-openai",
    },
  });
}

const VALID_ROLES = new Set<RoleId>([
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
]);

type ChatPayload = {
  message?: unknown;
  role_id?: unknown;
  conversation_id?: unknown;
  force_new?: unknown;
};

async function resolveRoleId(
  session: Awaited<ReturnType<typeof resolveApiSession>>,
  bodyRoleId: unknown,
  isManager: boolean,
): Promise<RoleId | null> {
  if (isManager) return null;

  if (typeof bodyRoleId === "string" && VALID_ROLES.has(bodyRoleId as RoleId)) {
    return bodyRoleId as RoleId;
  }
  if (session?.mode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("role_id")
      .eq("id", session.userId)
      .maybeSingle();
    if (data?.role_id && VALID_ROLES.has(data.role_id as RoleId)) {
      return data.role_id as RoleId;
    }
  }
  return null;
}

function streamText(text: string, safety?: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const chunks: string[] = [];
  if (safety) chunks.push(`__SAFETY__:${safety}\n`);
  chunks.push(text);
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(chunks[i]));
      i += 1;
    },
  });
}

export async function POST(request: Request) {
  const session = await resolveApiSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Bạn cần đăng nhập để dùng trợ lý AI.");
  }

  let body: ChatPayload;
  try {
    body = (await request.json()) as ChatPayload;
  } catch {
    return apiError("VALIDATION_ERROR", "JSON không hợp lệ.");
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > 4000) {
    return apiError(
      "VALIDATION_ERROR",
      "Tin nhắn không hợp lệ (tối đa 4000 ký tự).",
    );
  }

  const isManager = await isManagerUser();
  const audience: ChatAudience = isManager ? "manager" : "employee";
  const roleId = await resolveRoleId(session, body.role_id, isManager);

  if (!isManager && !roleId) {
    return apiError(
      "VALIDATION_ERROR",
      "Chưa chọn vai trò. Hoàn thành onboarding trước.",
    );
  }

  const safety = getSafetyWarning(message);
  const conversationIdRaw =
    typeof body.conversation_id === "string" ? body.conversation_id : null;
  const forceNew = body.force_new === true;

  // Không có key → canned (cả demo lẫn supabase thiếu key).
  if (!isOpenAIConfigured()) {
    const cachedRole = roleId ?? "khac";
    const cached = getCachedAnswer(cachedRole, message);
    const fallback = cached
      ? { answer: cached, safety }
      : getFallbackAnswer(message, cachedRole);
    const answer = fallback.answer;
    const safetyMsg = fallback.safety ?? safety;
    return new Response(streamText(answer, safetyMsg), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Chat-Mode": "demo",
      },
    });
  }

  // Demo mode + CÓ key → OpenAI thật, đường tối giản (không Supabase, không lưu).
  if (session.mode === "demo") {
    // Cache câu phổ biến trước (tiết kiệm chi phí).
    if (roleId) {
      const cached = getCachedAnswer(roleId, message);
      if (cached) {
        return new Response(streamText(cached, safety), {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "X-Chat-Mode": "cache",
          },
        });
      }
    }
    const rate = checkRateLimit(
      `chat-demo:${session.userId}`,
      getRateLimitPerDay(),
      DAY_MS,
    );
    if (!rate.allowed) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Hết lượt hôm nay. Bạn có thể tiếp tục từ 00:00 ngày mai.",
        { resetAt: rate.resetAt },
        { "Retry-After": "86400" },
      );
    }
    return streamDemoOpenAI(message, roleId, isManager, safety);
  }

  const rate = await checkChatRateLimit(session.userId);
  if (!rate.allowed) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Hết lượt hôm nay. Bạn có thể tiếp tục từ 00:00 ngày mai.",
      { used: rate.used, limit: rate.limit, resetAt: rate.resetAt },
      { "Retry-After": "86400" },
    );
  }

  if (roleId) {
    const cached = getCachedAnswer(roleId, message);
    if (cached) {
      await recordChatUsage(session.userId);
      return new Response(streamText(cached, safety), {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Chat-Mode": "cache",
        },
      });
    }
  }

  const client = getOpenAIClient();
  if (!client) {
    const fallbackRole = roleId ?? "khac";
    const fallback = getFallbackAnswer(message, fallbackRole);
    return new Response(streamText(fallback.answer, fallback.safety ?? safety), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  try {
    const profile = await resolveProfileBasics(session.userId);
    const effectiveRoleId = roleId ?? profile.roleId;
    const coreContext = await loadCoreContext(session.userId, audience);

    let systemPrompt: string;
    let employeePreferredAddress: import("@/lib/learning-profile").PreferredAddress | undefined;
    if (isManager) {
      const teamSummary = await getTeamAnalysisSummary(session.userId);
      systemPrompt = buildManagerSystemPrompt({
        fullName: profile.fullName,
        coreContext,
        teamSummary,
      });
    } else if (effectiveRoleId) {
      const learningContext = await loadOrganizationLearningContext(
        session.userId,
      );
      const [curriculumSummary, personalCtx, conversationMemory] =
        await Promise.all([
          buildCurriculumKnowledgeContext(
            session.userId,
            effectiveRoleId,
            message,
            learningContext,
          ),
          buildPersonalKnowledgeContext(session.userId),
          loadCoreContext(session.userId, audience),
        ]);
      systemPrompt = buildEmployeeSystemPrompt(effectiveRoleId, {
        fullName: profile.fullName,
        preferredAddress: personalCtx.preferredAddress,
        curriculumSummary,
        personalSummary: personalCtx.block,
        companySummary: formatOrganizationLearningContext(learningContext),
        ahaSummary: personalCtx.ahaSummary,
        conversationMemory,
      });
      employeePreferredAddress = personalCtx.preferredAddress;
    } else {
      return apiError(
        "VALIDATION_ERROR",
        "Chưa chọn vai trò. Hoàn thành onboarding trước.",
      );
    }

    const conversationId = await getOrCreateConversation(
      session.userId,
      audience,
      forceNew ? null : conversationIdRaw,
      {
        forceNew,
        initialTitle: forceNew ? summarizeChatSessionTitle(message) : undefined,
      },
    );
    const history = await loadRecentChatMessages(conversationId);

    const clarifyCompleted = countClarifyStepsCompleted([
      ...history,
      { role: "user", content: message },
    ]);
    const clarifyContext = buildClarifyContextFromHistory(
      history,
      message,
      profile.fullName,
      effectiveRoleId,
      employeePreferredAddress,
    );
    const clarifyAnswers = collectClarifyAnswers(history, message);
    const clarifyAnswersSummary = summarizeClarifyAnswersFromHistory(
      history,
      message,
    );
    const clarifyHint = buildClarifyRuntimeHint(
      clarifyCompleted,
      message,
      clarifyAnswersSummary,
    );
    const effectiveSystemPrompt = clarifyHint
      ? `${systemPrompt}\n\n${clarifyHint}`
      : systemPrompt;

    const openaiMessages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: effectiveSystemPrompt },
      ...history,
      { role: "user", content: message },
    ];

    const stream = await client.chat.completions.create({
      model: getOpenAIModel(),
      stream: true,
      max_tokens:
        clarifyCompleted >= MAX_CLARIFY_QUESTIONS
          ? isManager
            ? 800
            : 750
          : isManager
            ? 600
            : 500,
      temperature: clarifyCompleted >= MAX_CLARIFY_QUESTIONS ? 0.5 : 0.7,
      messages: openaiMessages,
    });

    await recordChatUsage(session.userId);

    await saveUserMessageOnly(session.userId, conversationId, message);
    void refineConversationTitle(session.userId, conversationId, message);

    const encoder = new TextEncoder();
    let sentSafety = false;
    let assistantText = "";

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        if (safety) {
          controller.enqueue(encoder.encode(`__SAFETY__:${safety}\n`));
          sentSafety = true;
        }

        const ticker = startThinkingTicker(
          (chunk) => controller.enqueue(chunk),
          encoder,
        );

        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? "";
            if (text) {
              if (assistantText.length === 0) {
                ticker.stop();
              }
              assistantText += text;
            }
          }
          ticker.stop();
          const clarifyStep = clarifyCompleted + 1;
          assistantText = finalizeClarifyingAssistantText(
            assistantText,
            clarifyStep,
            {
              userJustAnsweredClarify: isClarifyUserAnswer(message),
              clarifyContext,
              clarifyCompleted,
              clarifyAnswers,
            },
          );
          if (assistantText) {
            controller.enqueue(encoder.encode(assistantText));
          }
          controller.close();

          if (assistantText.trim()) {
            void appendAssistantReply(
              session.userId,
              conversationId,
              assistantText.trim(),
            ).then(() =>
              refreshCoreContext(session.userId, audience, [
                ...history,
                { role: "user", content: message },
                { role: "assistant", content: assistantText.trim() },
              ]),
            );
          }
        } catch (err) {
          ticker.stop();
          console.error("[chat-stream]", err);
          if (!sentSafety) {
            controller.enqueue(
              encoder.encode(
                "Xin lỗi, em gặp lỗi khi trả lời. Thử lại sau nhé.",
              ),
            );
          }
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-Chat-Mode": "openai",
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (err) {
    console.error("[chat-openai]", err);
    return apiError("INTERNAL_ERROR", "Trợ lý AI tạm thời không phản hồi.");
  }
}
