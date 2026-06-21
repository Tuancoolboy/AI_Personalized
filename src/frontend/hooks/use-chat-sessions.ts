"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteChatConversation,
  fetchChatConversations,
  isSupabaseBackend,
  type ChatConversationSummary,
} from "@/lib/client-api";
import { summarizeChatSessionTitle } from "@/lib/chat-session-title";

async function loadSessionList(): Promise<ChatConversationSummary[]> {
  if (!isSupabaseBackend()) return [];
  const data = await fetchChatConversations();
  return data.conversations;
}

export type SessionMessageSentPayload = {
  message: string;
  tempSessionId: string;
  conversationId: string | null;
  isNew: boolean;
};

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatConversationSummary[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isNewConversation, setIsNewConversation] = useState(false);
  const [sessionLoadKey, setSessionLoadKey] = useState("boot");
  const [loading, setLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  const applySessionList = useCallback((conversations: ChatConversationSummary[]) => {
    setSessions((prev) => {
      const pending = prev.filter((s) => s.id.startsWith("pending-"));
      const merged = [...pending];
      for (const conv of conversations) {
        const idx = merged.findIndex((s) => s.id === conv.id);
        if (idx >= 0) {
          merged[idx] = {
            ...merged[idx],
            title: conv.title,
            updatedAt: conv.updatedAt,
          };
        } else {
          merged.push(conv);
        }
      }
      merged.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      return merged;
    });

    if (!bootstrappedRef.current && conversations.length > 0) {
      bootstrappedRef.current = true;
      const firstId = conversations[0].id;
      setActiveSessionId(firstId);
      setSessionLoadKey(firstId);
    }
  }, []);

  const refreshSessions = useCallback(async () => {
    const conversations = await loadSessionList();
    applySessionList(conversations);
  }, [applySessionList]);

  useEffect(() => {
    let cancelled = false;

    void loadSessionList()
      .then((conversations) => {
        if (cancelled) return;
        applySessionList(conversations);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applySessionList]);

  const selectSession = useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
    setSessionLoadKey(sessionId);
    setIsNewConversation(false);
  }, []);

  const startNewConversation = useCallback(() => {
    setActiveSessionId(null);
    setSessionLoadKey(`new-${Date.now()}`);
    setIsNewConversation(true);
  }, []);

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (sessionId.startsWith("pending-")) {
        setSessions((prev) => prev.filter((session) => session.id !== sessionId));
        return;
      }
      if (!isSupabaseBackend()) return;

      await deleteChatConversation(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));

      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setSessionLoadKey(`new-${Date.now()}`);
        setIsNewConversation(true);
      }
    },
    [activeSessionId],
  );

  const onSessionMessageSent = useCallback(
    ({ message, tempSessionId, conversationId }: SessionMessageSentPayload) => {
      const now = new Date().toISOString();
      const title = summarizeChatSessionTitle(message);
      const sessionId = conversationId ?? tempSessionId;

      setIsNewConversation(false);
      setActiveSessionId(sessionId);

      setSessions((prev) => {
        const rest = prev.filter(
          (s) =>
            s.id !== tempSessionId &&
            (!conversationId || s.id !== conversationId),
        );
        const existing = conversationId
          ? prev.find((s) => s.id === conversationId)
          : null;
        const entry: ChatConversationSummary = {
          id: sessionId,
          title: existing?.title ?? title,
          updatedAt: now,
          createdAt: existing?.createdAt ?? now,
        };
        return [entry, ...rest];
      });
    },
    [],
  );

  const onSessionIdResolved = useCallback(
    (tempSessionId: string, conversationId: string) => {
      setActiveSessionId(conversationId);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === tempSessionId ? { ...s, id: conversationId } : s,
        ),
      );
      void refreshSessions();
    },
    [refreshSessions],
  );

  const onConversationCreated = useCallback(
    (conversationId: string) => {
      setIsNewConversation(false);
      setActiveSessionId(conversationId);
      void refreshSessions();
    },
    [refreshSessions],
  );

  return {
    sessions,
    activeSessionId,
    isNewConversation,
    sessionLoadKey,
    loading,
    selectSession,
    startNewConversation,
    deleteSession,
    onSessionMessageSent,
    onSessionIdResolved,
    onConversationCreated,
    refreshSessions,
  };
}
