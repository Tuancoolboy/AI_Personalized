"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import type { AppUserType } from "@/lib/assistant-actions";
import { ChatSessionSidebar } from "@/components/chat-session-sidebar";
import { ChatConversationBody } from "@/components/chat-conversation-body";
import { buildFriendlyAddress } from "@/lib/display-name";
import { useAppProfile } from "@/hooks/use-app-profile";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { useChatSessions } from "@/hooks/use-chat-sessions";
import { getRole } from "@/lib/roles";
import {
  getManagerSuggestedQuestions,
  getSuggestedQuestions,
} from "@/lib/tro-ly-canned-responses";
import { TroLyPageSkeleton } from "@/components/skeletons/page-skeletons";

type TroLyChatProps = {
  userType: AppUserType;
  displayName: string;
};

export function TroLyChat({ userType, displayName }: TroLyChatProps) {
  const { profile, hydrated, roleId, fullName } = useAppProfile();
  const resolvedName = fullName ?? displayName;
  const friendlyName = buildFriendlyAddress(resolvedName);
  const [input, setInput] = useState("");
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const {
    sessions,
    activeSessionId,
    isNewConversation,
    sessionLoadKey,
    loading: sessionsLoading,
    selectSession,
    startNewConversation,
    deleteSession,
    onSessionMessageSent,
    onSessionIdResolved,
    onConversationCreated,
    refreshSessions,
  } = useChatSessions();
  const {
    messages,
    typing,
    thinkingText,
    rateLimitMsg,
    sessionLoading,
    scrollRef,
    bottomRef,
    sendMessage,
    canChat,
  } = useAssistantChat({
    roleId,
    userType,
    fullName: resolvedName,
    activeConversationId: activeSessionId,
    isNewConversation,
    sessionLoadKey,
    onConversationCreated,
    onSessionMessageSent,
    onSessionIdResolved,
    onSessionStreamComplete: () => void refreshSessions(),
    source: "page",
  });

  if (!hydrated) {
    return <TroLyPageSkeleton />;
  }

  if (userType === "employee" && !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">
          Hoàn thành onboarding trước
        </h1>
        <p className="mt-3 text-ink-2">
          Em cần biết vai trò của {resolvedName} để trả lời bằng ví dụ đúng nghề.
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-base font-semibold text-brand-foreground transition hover:bg-brand-2"
        >
          Vào onboarding →
        </Link>
      </div>
    );
  }

  const role = profile ? getRole(profile.roleId) : null;
  const suggestions =
    userType === "manager"
      ? getManagerSuggestedQuestions()
      : profile
        ? getSuggestedQuestions(profile.roleId)
        : [];

  const subtitle =
    userType === "manager"
      ? `(trợ lý riêng của quản lý ${resolvedName})`
      : `(trợ lý riêng của ${resolvedName}) · ${role?.shortLabel ?? "học viên"}`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
  }

  function handleSelectSession(sessionId: string) {
    selectSession(sessionId);
    setMobileSessionsOpen(false);
  }

  function handleNewConversation() {
    startNewConversation();
    setMobileSessionsOpen(false);
  }

  async function handleDeleteSession(sessionId: string) {
    await deleteSession(sessionId);
  }

  const chatPanel = (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-1 flex-col rounded-2xl border border-line bg-card shadow-lg sm:rounded-3xl">
      <div className="flex items-center gap-2.5 border-b border-line bg-gradient-to-r from-card to-secondary/40 px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
        <button
          type="button"
          onClick={() => setMobileSessionsOpen((open) => !open)}
          className="grid h-9 w-9 flex-none place-items-center rounded-lg border border-line text-sm text-ink-2 transition hover:bg-secondary lg:hidden"
          aria-label="Mở danh sách hội thoại"
        >
          ☰
        </button>
        <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-lg text-brand-foreground">
          ✦
        </div>
        <div className="min-w-0">
          <p className="font-display text-base font-bold tracking-tight text-ink">
            Trợ lý AI
          </p>
          <p className="truncate text-xs text-ink-2">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold text-brand">
          <span className="grid h-2 w-2 place-items-center rounded-full bg-brand">
            <span className="h-2 w-2 animate-ping rounded-full bg-brand opacity-75" />
          </span>
          Online
        </div>
      </div>

      <ChatConversationBody
        sessionKey={sessionLoadKey}
        sessionLoading={sessionLoading}
        messages={messages}
        typing={typing}
        thinkingText={thinkingText}
        scrollRef={scrollRef}
        bottomRef={bottomRef}
        variant="full"
        onSendMessage={(text) => void sendMessage(text)}
      />

      {rateLimitMsg && (
        <div className="border-t border-line bg-accent/10 px-5 py-3 text-sm text-accent">
          {rateLimitMsg}
        </div>
      )}

      {!sessionLoading && messages.length <= 1 && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-line bg-card px-5 py-3">
          {suggestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => void sendMessage(q)}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-ink-2 transition hover:border-accent hover:bg-accent/10 hover:text-accent"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 border-t border-line bg-card px-4 py-3"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={
            userType === "manager"
              ? `Hỏi em về tiến độ team, ${friendlyName} ơi...`
              : `Hỏi em về AI cho công việc của ${friendlyName}...`
          }
          rows={1}
          disabled={!canChat}
          className="max-h-32 flex-1 resize-none rounded-2xl border-2 border-line bg-card px-4 py-2.5 text-sm transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || typing || !canChat}
          className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-brand text-xl text-brand-foreground transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Gửi"
        >
          ↑
        </button>
      </form>
    </div>
  );

  return (
    <div className="mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
      <div className="relative flex items-start gap-0 lg:gap-4">
        <ChatSessionSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          isDraftActive={isNewConversation && !activeSessionId}
          loading={sessionsLoading}
          onSelect={handleSelectSession}
          onNew={handleNewConversation}
          onDelete={(sessionId) => void handleDeleteSession(sessionId)}
          className={`${
            mobileSessionsOpen
              ? "absolute inset-y-0 left-0 z-20 w-[min(100%,18rem)] shadow-xl lg:static lg:shadow-none"
              : "hidden lg:flex"
          } w-60 shrink-0 rounded-2xl border border-line lg:rounded-3xl`}
        />

        {mobileSessionsOpen && (
          <button
            type="button"
            aria-label="Đóng danh sách hội thoại"
            className="absolute inset-0 z-10 bg-ink/20 lg:hidden"
            onClick={() => setMobileSessionsOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">{chatPanel}</div>
      </div>
    </div>
  );
}
