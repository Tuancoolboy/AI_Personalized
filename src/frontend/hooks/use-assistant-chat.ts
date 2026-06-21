"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AppUserType } from "@/lib/assistant-actions";
import { buildGreetingAddress, buildCoachAddresses } from "@/lib/display-name";
import type { PreferredAddress } from "@/lib/learning-profile";
import {
  resolveResumeLesson,
  type ResumeLesson,
} from "@/lib/resume-lesson";
import { getDemoProgress } from "@/lib/demo-storage";
import type { RoleId } from "@/lib/openai";
import { getRole } from "@/lib/roles";
import {
  appendChatStreamChunk,
  createChatStreamParseState,
} from "@/lib/chat-stream-parse";
import {
  CHAT_THINKING_PHRASES,
  SAFETY_PREFIX,
} from "@/lib/chat-thinking-phrases";
import type { ClarifyingQuestion } from "@/lib/chat-clarify-types";
import { parseAssistantMessageContent } from "@/lib/chat-clarify-parse";
import type { SessionMessageSentPayload } from "@/hooks/use-chat-sessions";
import {
  fetchChatHistory,
  isSupabaseBackend,
  trackEvent,
} from "@/lib/client-api";

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant" | "safety";
  content: string;
  clarify?: ClarifyingQuestion;
};

export type AssistantChatHistoryRequest = {
  draft?: boolean;
  conversationId?: string;
};

type AssistantChatInitKeyOptions = {
  roleId: string | null;
  userType: AppUserType;
  fullName: string | null;
  preferredAddress: PreferredAddress;
  noRestore: boolean;
  sessionLoadKey: string;
  activeConversationId?: string | null;
};

export function buildAssistantChatInitKey(
  options: AssistantChatInitKeyOptions,
): string {
  void options.activeConversationId;
  return [
    options.userType,
    options.roleId ?? "none",
    options.fullName ?? "",
    options.preferredAddress,
    options.noRestore ? "no-restore" : "restore",
    options.sessionLoadKey,
  ].join(":");
}

export function resolveAssistantChatHistoryRequest(
  sessionLoadKey: string,
  options: {
    noRestore: boolean;
    isNewConversation: boolean;
    resetContextOnFirstSend: boolean;
  },
): AssistantChatHistoryRequest | undefined {
  if (
    options.noRestore ||
    options.isNewConversation ||
    options.resetContextOnFirstSend ||
    sessionLoadKey.startsWith("new-")
  ) {
    return { draft: true };
  }

  if (sessionLoadKey === "boot") {
    return undefined;
  }

  return { conversationId: sessionLoadKey };
}

function mapStoredMessage(msg: {
  id: string;
  role: "user" | "assistant" | "safety";
  content: string;
}): AssistantMessage {
  if (msg.role !== "assistant") {
    return { id: msg.id, role: msg.role, content: msg.content };
  }

  const parsed = parseAssistantMessageContent(msg.content);
  return {
    id: msg.id,
    role: msg.role,
    content: parsed.content || msg.content,
    clarify: parsed.clarify,
  };
}

function mapStreamAssistantMessage(
  id: string,
  rawContent: string,
): AssistantMessage {
  const parsed = parseAssistantMessageContent(rawContent);
  return {
    id,
    role: "assistant",
    content: parsed.content || rawContent,
    clarify: parsed.clarify,
  };
}

type UseAssistantChatOptions = {
  roleId: string | null;
  userType: AppUserType;
  fullName: string | null;
  preferredAddress?: PreferredAddress;
  noRestore?: boolean;
  sessionLoadKey?: string;
  activeConversationId?: string | null;
  isNewConversation?: boolean;
  onConversationCreated?: (conversationId: string) => void;
  onSessionMessageSent?: (payload: SessionMessageSentPayload) => void;
  onSessionIdResolved?: (tempSessionId: string, conversationId: string) => void;
  onSessionStreamComplete?: () => void;
  resetContextOnFirstSend?: boolean;
  source?: "page" | "widget";
};

export function buildGreeting(
  roleId: string | null,
  userType: AppUserType,
  rawFullName: string | null,
  resumeLesson: ResumeLesson | null = null,
  preferredAddress: PreferredAddress = "neutral",
): string {
  const resolvedName = rawFullName?.trim() || null;
  const greetingName = buildGreetingAddress(resolvedName, preferredAddress);
  const casual =
    resolvedName && resolvedName !== "bạn"
      ? buildCoachAddresses(resolvedName, preferredAddress).casual
      : "bạn";

  if (userType === "manager") {
    return `Chào ${greetingName}! Em hỗ trợ ${greetingName} theo dõi và kèm cặp team học AI.

Em có thể cùng ${casual} xem tiến độ học, điểm quiz, giờ tiết kiệm và gợi ý hành động cụ thể tuần này.`;
  }

  if (!roleId) {
    return `Chào ${greetingName}!

${casual === "bạn" ? "Bạn" : casual.charAt(0).toUpperCase() + casual.slice(1)} chưa chọn vai trò — hãy hoàn thành onboarding để em trả lời bằng ví dụ đúng nghề. Trong lúc chờ, bạn có thể bấm các gợi ý bên dưới để đi tới đúng trang.`;
  }

  const role = getRole(roleId);
  const roleLabel = role?.shortLabel ?? "công việc của bạn";
  const lessonLine = buildResumeLessonLine(resumeLesson, casual);

  return `Chào ${greetingName}! Em hỗ trợ ${casual} phần ${roleLabel} — dạy ${casual} tự dùng AI vào việc, không làm hộ.${lessonLine}

Hỏi em về lộ trình, prompt mẫu, công cụ hoặc an toàn dữ liệu — hoặc bấm gợi ý bên dưới.`;
}

function buildResumeLessonLine(
  resumeLesson: ResumeLesson | null,
  casual: string,
): string {
  if (!resumeLesson) return "";

  const link = `[${resumeLesson.title}](${resumeLesson.href})`;
  if (resumeLesson.status === "dang-hoc") {
    const who = casual === "bạn" ? "Bạn" : casual.charAt(0).toUpperCase() + casual.slice(1);
    return `\n\n${who} đang học dở bài ${link} — bấm để mở và tiếp tục.`;
  }

  return `\n\nBài tiếp theo trên lộ trình: ${link} — bấm để bắt đầu.`;
}

export function resolveClientResumeLesson(
  roleId: string | null,
): ResumeLesson | null {
  if (!roleId || !getRole(roleId)) return null;
  return resolveResumeLesson(roleId as RoleId, getDemoProgress());
}

export function useAssistantChat({
  roleId,
  userType,
  fullName,
  preferredAddress = "neutral",
  noRestore = false,
  sessionLoadKey = "default",
  activeConversationId,
  isNewConversation = false,
  onConversationCreated,
  onSessionMessageSent,
  onSessionIdResolved,
  onSessionStreamComplete,
  source = "page",
  resetContextOnFirstSend = false,
}: UseAssistantChatOptions) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [typing, setTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState<string | null>(null);
  const [rateLimitMsg, setRateLimitMsg] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const initKeyRef = useRef<string>("");
  const forceNewRef = useRef(isNewConversation || resetContextOnFirstSend);
  const thinkingPhraseLockedRef = useRef(false);
  const autoScrollEnabledRef = useRef(true);

  useEffect(() => {
    forceNewRef.current = isNewConversation || resetContextOnFirstSend;
  }, [isNewConversation, resetContextOnFirstSend]);

  const canChat = userType === "manager" || Boolean(roleId);

  const isNearBottom = useCallback(() => {
    if (source === "widget") {
      const scroller = scrollRef.current;
      if (!scroller) return true;
      const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
      return distance <= 120;
    }

    const bottom = bottomRef.current;
    if (!bottom) return true;
    const distance = bottom.getBoundingClientRect().top - window.innerHeight;
    return distance <= 120;
  }, [source]);

  const scrollToBottom = useCallback((instant = false, force = false) => {
    if (!force && !autoScrollEnabledRef.current) return;
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        block: "end",
        behavior: instant ? "auto" : "smooth",
      });
    });
  }, []);

  useEffect(() => {
    const updateAutoScrollState = () => {
      autoScrollEnabledRef.current = isNearBottom();
    };

    updateAutoScrollState();

    if (source === "widget") {
      const scroller = scrollRef.current;
      if (!scroller) return;
      scroller.addEventListener("scroll", updateAutoScrollState, { passive: true });
      return () => {
        scroller.removeEventListener("scroll", updateAutoScrollState);
      };
    }

    window.addEventListener("scroll", updateAutoScrollState, { passive: true });
    window.addEventListener("resize", updateAutoScrollState);
    return () => {
      window.removeEventListener("scroll", updateAutoScrollState);
      window.removeEventListener("resize", updateAutoScrollState);
    };
  }, [isNearBottom, source]);

  const startClientThinking = useCallback(() => {
    thinkingPhraseLockedRef.current = true;
    setThinkingText(CHAT_THINKING_PHRASES[0]);
  }, []);

  useEffect(() => {
    const initKey = buildAssistantChatInitKey({
      roleId,
      userType,
      fullName,
      preferredAddress,
      noRestore,
      sessionLoadKey,
    });
    if (initKeyRef.current === initKey) return;

    let cancelled = false;
    setSessionLoading(true);
    setTyping(false);
    setThinkingText(null);
    setRateLimitMsg(null);
    setMessages([]);

    async function init() {
      let resumeLesson: ResumeLesson | null = null;
      let restoredMessages: AssistantMessage[] = [];
      let resolvedConversationId: string | null = null;

      if (isSupabaseBackend() && (userType === "manager" || Boolean(roleId))) {
        try {
          const historyRequest = resolveAssistantChatHistoryRequest(
            sessionLoadKey,
            {
              noRestore,
              isNewConversation,
              resetContextOnFirstSend,
            },
          );
          const history = await fetchChatHistory(historyRequest);
          resumeLesson = history.resumeLesson;
          resolvedConversationId = history.conversationId;
          if (
            !noRestore &&
            !isNewConversation &&
            history.messages.length > 0
          ) {
            restoredMessages = history.messages.map((msg) =>
              mapStoredMessage({
                id: msg.id,
                role: msg.role,
                content: msg.content,
              }),
            );
          }
        } catch {
          // fallback to greeting only
        }
      } else if (roleId) {
        resumeLesson = resolveClientResumeLesson(roleId);
      }

      if (resolvedConversationId && !isNewConversation && !resetContextOnFirstSend) {
        setConversationId(resolvedConversationId);
      } else {
        setConversationId(null);
      }

      if (restoredMessages.length > 0) {
        setMessages(restoredMessages);
      } else {
        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: buildGreeting(roleId, userType, fullName, resumeLesson, preferredAddress),
          },
        ]);
      }

      if (!cancelled) {
        setSessionLoading(false);
        initKeyRef.current = initKey;
        autoScrollEnabledRef.current = true;
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [
    roleId,
    userType,
    fullName,
    preferredAddress,
    noRestore,
    sessionLoadKey,
    activeConversationId,
    isNewConversation,
    resetContextOnFirstSend,
  ]);

  useEffect(() => {
    if (sessionLoading) return;
    scrollToBottom(typing);
  }, [messages, typing, sessionLoading, scrollToBottom]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || typing || !canChat) return;

      const trimmed = text.trim();
      const userMessage: AssistantMessage = {
        id: `u-${crypto.randomUUID()}`,
        role: "user",
        content: trimmed,
      };
      const tempSessionId = `pending-${crypto.randomUUID()}`;
      const shouldForceNew = forceNewRef.current;
      const existingConversationId =
        conversationId && !shouldForceNew ? conversationId : null;

      autoScrollEnabledRef.current = true;
      thinkingPhraseLockedRef.current = false;
      setMessages((prev) => [...prev, userMessage]);
      setTyping(true);
      setThinkingText(null);
      setRateLimitMsg(null);
      startClientThinking();

      onSessionMessageSent?.({
        message: trimmed,
        tempSessionId,
        conversationId: existingConversationId,
        isNew: shouldForceNew || !existingConversationId,
      });

      let streamCompleted = false;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            ...(roleId ? { role_id: roleId } : {}),
            ...(existingConversationId
              ? { conversation_id: existingConversationId }
              : {}),
            ...(shouldForceNew ? { force_new: true } : {}),
          }),
        });

        const newConversationId = res.headers.get("X-Conversation-Id");
        if (newConversationId) {
          setConversationId(newConversationId);
          onSessionIdResolved?.(tempSessionId, newConversationId);
          if (shouldForceNew) {
            forceNewRef.current = false;
            onConversationCreated?.(newConversationId);
          }
        }

        if (res.status === 429) {
          const data = (await res.json()) as { error?: { message?: string } };
          setRateLimitMsg(
            data.error?.message ??
              "Hết lượt hôm nay. Bạn có thể tiếp tục từ 00:00 ngày mai.",
          );
          setTyping(false);
          setThinkingText(null);
          return;
        }

        if (!res.ok) {
          throw new Error("Chat failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");

        const decoder = new TextDecoder();
        const assistantId = `a-${crypto.randomUUID()}`;
        let parseState = createChatStreamParseState();
        let safetyShown = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          let chunk = decoder.decode(value, { stream: true });

          if (!safetyShown && chunk.includes(SAFETY_PREFIX)) {
            const combined = parseState.buffer + chunk;
            if (combined.includes(SAFETY_PREFIX)) {
              const newline = combined.indexOf("\n");
              if (newline >= 0) {
                const safetyPart = combined.slice(0, newline);
                chunk = combined.slice(newline + 1);
                setMessages((prev) => [
                  ...prev,
                  {
                    id: `s-${crypto.randomUUID()}`,
                    role: "safety",
                    content: safetyPart.replace(SAFETY_PREFIX, ""),
                  },
                ]);
                safetyShown = true;
                parseState = { ...parseState, buffer: "" };
              }
            }
          }

          if (!chunk) continue;

          const result = appendChatStreamChunk(parseState, chunk);
          parseState = result.state;

          if (parseState.thinkingText && !thinkingPhraseLockedRef.current) {
            thinkingPhraseLockedRef.current = true;
            setThinkingText(parseState.thinkingText);
          }

          if (parseState.answerText) {
            setThinkingText(null);
            const currentText = parseState.answerText;
            setMessages((prev) => {
              const without = prev.filter((m) => m.id !== assistantId);
              return [
                ...without,
                mapStreamAssistantMessage(assistantId, currentText),
              ];
            });
          }
        }

        streamCompleted = true;

        if (isSupabaseBackend()) {
          void trackEvent("tutor_message_sent", {
            roleId: roleId ?? "manager",
            userType,
            source,
          });
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${crypto.randomUUID()}`,
            role: "assistant",
            content:
              "Xin lỗi, em gặp lỗi khi trả lời. Thử lại sau hoặc mở trang Trợ lý AI đầy đủ.",
          },
        ]);
      } finally {
        setThinkingText(null);
        setTyping(false);
        if (streamCompleted) {
          window.setTimeout(() => onSessionStreamComplete?.(), 900);
        }
      }
    },
    [
      roleId,
      userType,
      typing,
      canChat,
      conversationId,
      onConversationCreated,
      onSessionMessageSent,
      onSessionIdResolved,
      onSessionStreamComplete,
      source,
      startClientThinking,
    ],
  );

  return {
    messages,
    typing,
    thinkingText,
    rateLimitMsg,
    sessionLoading,
    scrollRef,
    bottomRef,
    sendMessage,
    canChat,
    conversationId,
  };
}
