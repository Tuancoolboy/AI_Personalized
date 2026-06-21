"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAssistantNavActions,
  type AssistantAction,
  type AppUserType,
} from "@/lib/assistant-actions";
import { useAppProfile } from "@/hooks/use-app-profile";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { getRole } from "@/lib/roles";
import {
  getManagerSuggestedQuestions,
  getSuggestedQuestions,
} from "@/lib/tro-ly-canned-responses";
import {
  AssistantChatMessageList,
  AssistantThinkingIndicator,
  AssistantTypingIndicator,
} from "@/components/assistant-chat-messages";
import { formatClarifyUserAnswer } from "@/lib/chat-clarify-parse";
import { FloatingChatSkeleton } from "@/components/skeletons/page-skeletons";

type FloatingAssistantWidgetProps = {
  userType: AppUserType;
  displayName: string;
};

function CollapsiblePanel({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-line bg-secondary/20">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-secondary/40"
        aria-expanded={expanded}
      >
        <span className="text-[11px] font-semibold text-ink-2">
          {title}
          {count != null && count > 0 ? (
            <span className="ml-1 font-normal text-ink-3">({count})</span>
          ) : null}
        </span>
        <span className="text-[10px] text-ink-3" aria-hidden>
          {expanded ? "▴" : "▾"}
        </span>
      </button>
      {expanded && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
}

export function FloatingAssistantWidget({
  userType,
  displayName,
}: FloatingAssistantWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [navExpanded, setNavExpanded] = useState(false);
  const [suggestionsExpanded, setSuggestionsExpanded] = useState(false);
  const { hydrated, roleId, fullName } = useAppProfile();
  const resolvedName = fullName ?? displayName;
  const {
    messages,
    typing,
    thinkingText,
    rateLimitMsg,
    scrollRef,
    bottomRef,
    sendMessage,
    canChat,
  } = useAssistantChat({
    roleId,
    userType,
    fullName: resolvedName,
    noRestore: true,
    resetContextOnFirstSend: true,
    source: "widget",
  });

  if (pathname.startsWith("/tro-ly")) {
    return null;
  }

  const role = roleId ? getRole(roleId) : null;
  const navActions = getAssistantNavActions(roleId, userType);
  const suggestions =
    userType === "manager"
      ? getManagerSuggestedQuestions().slice(0, 3)
      : roleId
        ? getSuggestedQuestions(roleId).slice(0, 3)
        : [];
  const showSuggestions =
    canChat && messages.length <= 1 && suggestions.length > 0;

  const subtitle =
    userType === "manager"
      ? `(trợ lý riêng của quản lý ${resolvedName})`
      : role
        ? `(trợ lý riêng của ${resolvedName})`
        : "Hỗ trợ điều hướng & hỏi đáp";

  function handleAction(action: AssistantAction) {
    if (action.kind === "navigate") {
      setOpen(false);
      router.push(action.href);
      return;
    }
    void sendMessage(action.message);
    setNavExpanded(false);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    void sendMessage(input);
    setInput("");
    setSuggestionsExpanded(false);
  }

  return (
    <div className="pointer-events-none fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-[max(1rem,env(safe-area-inset-right))] z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <div
          className="pointer-events-auto flex w-[min(100vw-2rem,22rem)] min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl sm:w-[24rem]"
          style={{ height: "min(72vh, 34rem)" }}
          role="dialog"
          aria-label="Trợ lý AI"
        >
          <div className="flex flex-none items-center gap-2.5 border-b border-line bg-gradient-to-r from-card to-secondary/40 px-4 py-3">
            <div className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2 text-sm text-brand-foreground">
              ✦
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-ink">
                Trợ lý AI
              </p>
              <p className="truncate text-[11px] text-ink-2">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 place-items-center rounded-lg text-ink-3 transition hover:bg-secondary hover:text-ink"
              aria-label="Đóng"
            >
              ✕
            </button>
          </div>

          {navActions.length > 0 && (
            <CollapsiblePanel
              title="Đi tới"
              count={navActions.length}
              expanded={navExpanded}
              onToggle={() => setNavExpanded((v) => !v)}
            >
              <div className="flex flex-wrap gap-1.5">
                {navActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => handleAction(action)}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-ink-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand"
                  >
                    <span aria-hidden>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            </CollapsiblePanel>
          )}

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-card to-secondary/20 px-3 py-3"
          >
            {!hydrated ? (
              <FloatingChatSkeleton />
            ) : (
              <>
                <AssistantChatMessageList
                  messages={messages}
                  typing={typing}
                  onClarifySubmit={(question, answer) =>
                    void sendMessage(formatClarifyUserAnswer(question, answer))
                  }
                />
                {typing && thinkingText && (
                  <AssistantThinkingIndicator text={thinkingText} />
                )}
                {typing && !thinkingText && <AssistantTypingIndicator />}
                <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
              </>
            )}
          </div>

          {rateLimitMsg && (
            <div className="flex-none border-t border-line bg-accent/10 px-3 py-2 text-xs text-accent">
              {rateLimitMsg}
            </div>
          )}

          {showSuggestions && (
            <CollapsiblePanel
              title="Gợi ý câu hỏi"
              count={suggestions.length}
              expanded={suggestionsExpanded}
              onToggle={() => setSuggestionsExpanded((v) => !v)}
            >
              <div className="flex flex-col gap-1.5">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      void sendMessage(q);
                      setSuggestionsExpanded(false);
                    }}
                    className="rounded-xl border border-line bg-card px-2.5 py-1.5 text-left text-[11px] font-medium leading-snug text-ink-2 transition hover:border-accent hover:text-accent"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </CollapsiblePanel>
          )}

          <form
            onSubmit={handleSubmit}
            className="flex flex-none items-end gap-2 border-t border-line px-3 py-2.5"
          >
            {canChat ? (
              <>
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
                      ? "Hỏi về tiến độ team..."
                      : "Hỏi về AI cho công việc..."
                  }
                  rows={1}
                  className="max-h-24 flex-1 resize-none rounded-xl border border-line bg-card px-3 py-2 text-xs transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand text-sm text-brand-foreground transition hover:bg-brand-2 disabled:opacity-50"
                  aria-label="Gửi"
                >
                  ↑
                </button>
              </>
            ) : (
              <div className="flex w-full flex-col gap-2 py-1">
                <p className="text-xs text-ink-2">
                  Chọn vai trò trước để hỏi em chi tiết hơn.
                </p>
                <Link
                  href="/onboarding"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-foreground"
                >
                  Vào onboarding →
                </Link>
              </div>
            )}
          </form>

          <div className="flex-none border-t border-line/60 bg-secondary/30 px-3 py-1.5 text-center">
            <Link
              href="/tro-ly"
              onClick={() => setOpen(false)}
              className="text-[10px] font-medium text-brand hover:underline"
            >
              Mở trang Trợ lý AI đầy đủ →
            </Link>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xl text-brand-foreground shadow-lg ring-4 ring-brand/20 transition hover:scale-105 hover:shadow-xl"
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
      >
        {open ? "✕" : "✦"}
      </button>
    </div>
  );
}
