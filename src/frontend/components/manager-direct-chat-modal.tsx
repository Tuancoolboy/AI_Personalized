"use client";

import { type FormEvent, useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import type { TeamMember } from "@/lib/team-data";

type DirectMessage = {
  id: string;
  sender: "manager" | "employee";
  content: string;
  sentAt: string;
};

function directMessageStorageKey(memberId: string) {
  return `manager-direct-chat:${memberId}`;
}

function loadDirectMessages(member: TeamMember): DirectMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(directMessageStorageKey(member.id));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DirectMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (message) =>
        (message.sender === "manager" || message.sender === "employee") &&
        typeof message.content === "string" &&
        typeof message.sentAt === "string",
    );
  } catch {
    return [];
  }
}

function saveDirectMessages(memberId: string, messages: DirectMessage[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    directMessageStorageKey(memberId),
    JSON.stringify(messages),
  );
}

function formatChatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function ManagerDirectChatModal({
  member,
  onClose,
}: {
  member: TeamMember;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>(() =>
    loadDirectMessages(member),
  );

  useEffect(() => {
    saveDirectMessages(member.id, messages);
  }, [member.id, messages]);

  function submitMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        sender: "manager",
        content: trimmed,
        sentAt: new Date().toISOString(),
      },
    ]);
    setInput("");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submitMessage(input);
  }

  const quickMessages = [
    "Em cập nhật giúp chị tiến độ học hôm nay nhé.",
    "Nếu đang vướng bài nào, nhắn lại để chị hỗ trợ.",
    "Tuần này mình chốt 1 mục tiêu nhỏ để hoàn thành nhé.",
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        className="flex h-[min(44rem,calc(100dvh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        aria-label={`Nhắn tin với ${member.fullName}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-card to-secondary/40 px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-brand-soft text-brand">
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-ink">
                Nhắn tin với {member.fullName}
              </h2>
              <p className="mt-1 text-sm text-ink-2">
                Gửi tin nhắn trực tiếp cho nhân viên. Tin nhắn demo được lưu
                trên trình duyệt này.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 flex-none place-items-center rounded-xl border border-line text-ink-2 transition hover:bg-secondary hover:text-ink"
            aria-label="Đóng chat nhân viên"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-3 border-b border-line bg-card px-5 py-3 sm:grid-cols-3">
          <DirectChatStat label="Phòng ban" value={member.department} />
          <DirectChatStat label="Hoàn thành" value={`${member.completionPct}%`} />
          <DirectChatStat
            label="Điểm KT"
            value={member.quizScore > 0 ? `${member.quizScore}%` : "Chưa có"}
          />
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-card to-secondary/20 px-5 py-6">
          {messages.length === 0 ? (
            <div className="flex h-full min-h-64 items-center justify-center rounded-2xl border border-dashed border-line bg-card/70 px-6 text-center">
              <div>
                <MessageCircle
                  className="mx-auto h-8 w-8 text-ink-3"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-semibold text-ink">
                  Chưa có tin nhắn với {member.fullName}
                </p>
                <p className="mt-1 text-xs text-ink-3">
                  Soạn tin ở dưới để liên hệ trực tiếp với nhân viên.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const fromManager = message.sender === "manager";
                return (
                  <div
                    key={message.id}
                    className={`flex ${fromManager ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={
                        "max-w-[82%] rounded-2xl px-4 py-3 text-sm shadow-sm " +
                        (fromManager
                          ? "rounded-br-md bg-brand text-brand-foreground"
                          : "rounded-bl-md border border-line bg-card text-ink")
                      }
                    >
                      <p className="whitespace-pre-wrap leading-6">
                        {message.content}
                      </p>
                      <p
                        className={
                          "mt-2 text-[11px] " +
                          (fromManager
                            ? "text-brand-foreground/75"
                            : "text-ink-3")
                        }
                      >
                        {fromManager ? "Đã gửi" : member.fullName} ·{" "}
                        {formatChatTime(message.sentAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line bg-card px-5 py-3">
          {quickMessages.map((message) => (
            <button
              key={message}
              type="button"
              onClick={() => setInput(message)}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-ink-2 transition hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              {message}
            </button>
          ))}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="rounded-full border border-line bg-card px-3.5 py-1.5 text-xs font-medium text-ink-3 transition hover:border-destructive hover:text-destructive"
            >
              Xoá lịch sử demo
            </button>
          )}
        </div>

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
            rows={2}
            className="max-h-32 flex-1 resize-none rounded-2xl border border-line bg-card px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
            placeholder={`Nhắn tin cho ${member.fullName}...`}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="grid h-11 w-11 flex-none place-items-center rounded-2xl bg-brand text-brand-foreground transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </section>
    </div>
  );
}

function DirectChatStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-warm/30 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
