"use client";

import type { ChatConversationSummary } from "@/lib/client-api";

type ChatSessionSidebarProps = {
  sessions: ChatConversationSummary[];
  activeSessionId: string | null;
  isDraftActive?: boolean;
  loading: boolean;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onDelete: (sessionId: string) => void;
  className?: string;
};

function formatSessionDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  });
}

export function ChatSessionSidebar({
  sessions,
  activeSessionId,
  isDraftActive = false,
  loading,
  onSelect,
  onNew,
  onDelete,
  className = "",
}: ChatSessionSidebarProps) {
  return (
    <aside
      className={`flex min-h-0 flex-col border-r border-line bg-secondary/20 ${className}`}
    >
      <div className="border-b border-line p-3">
        <button
          type="button"
          onClick={onNew}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all duration-200 ease-out active:scale-[0.98] ${
            isDraftActive
              ? "border-brand bg-brand-soft text-brand shadow-sm ring-2 ring-brand/15"
              : "border-line bg-card text-ink hover:border-brand hover:bg-brand-soft hover:text-brand"
          }`}
        >
          <span aria-hidden>+</span>
          Cuộc hội thoại mới
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <p className="px-2 py-3 text-xs text-ink-3">Đang tải hội thoại...</p>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-3 text-xs leading-relaxed text-ink-3">
            Chưa có hội thoại nào. Bấm &quot;Cuộc hội thoại mới&quot; để bắt
            đầu.
          </p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((session, index) => {
              const isActive =
                activeSessionId === session.id && !isDraftActive;
              return (
                <li
                  key={session.id}
                  className="animate-chat-sidebar-item-enter"
                  style={{ animationDelay: `${Math.min(index, 6) * 35}ms` }}
                >
                  <div
                    className={`group flex items-start gap-2 rounded-2xl border px-1 py-1 transition-all duration-200 ease-out ${
                      isActive
                        ? "border-brand/20 bg-brand-soft shadow-sm ring-1 ring-brand/15"
                        : "border-transparent bg-card/30 hover:border-line hover:bg-card/80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(session.id)}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <p
                        className={`overflow-hidden text-sm font-semibold leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
                          isActive ? "text-brand" : "text-ink"
                        }`}
                      >
                        {session.title}
                      </p>
                      <p className="mt-1 inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] text-ink-3">
                        {formatSessionDate(session.updatedAt)}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(session.id)}
                      className={`mr-1 mt-2 grid h-8 w-8 flex-none place-items-center rounded-xl transition hover:bg-card hover:text-accent ${
                        isActive
                          ? "text-ink-3 opacity-100"
                          : "text-ink-3 opacity-0 group-hover:opacity-100"
                      }`}
                      aria-label={`Xóa hội thoại ${session.title}`}
                    >
                      ×
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
