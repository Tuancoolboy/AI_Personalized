"use client";

import { useState } from "react";
import {
  addDemoAhaReflection,
  buildFallbackAhaQuestion,
  type AhaVisibility,
} from "@/lib/demo-aha";
import { addDemoTimeLog } from "@/lib/demo-storage";
import { createTimeLog, trackEvent } from "@/lib/client-api";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

// Aha Moment — thay ô cảm nghĩ tự do (Bước 4): 3 câu ngắn + AI hỏi lại 1 câu
// + chọn phạm vi chia sẻ. ~20 giây, KHÔNG bắt buộc, có nút bỏ qua.

const WHEN_CHIPS = ["Hôm nay", "Trong tuần", "Để sau"] as const;

const TIME_OPTIONS: { label: string; hours: number }[] = [
  { label: "~15 phút", hours: 0.25 },
  { label: "~30 phút", hours: 0.5 },
  { label: "~1 giờ", hours: 1 },
  { label: "~2 giờ", hours: 2 },
];

const VISIBILITY_OPTIONS: {
  value: AhaVisibility;
  label: string;
  hint: string;
}[] = [
  { value: "private", label: "🔒 Riêng tư", hint: "Chỉ mình bạn thấy" },
  { value: "department", label: "👥 Phòng", hint: "Đồng nghiệp cùng phòng" },
  { value: "company", label: "🏢 Cả công ty", hint: "Mọi người trong công ty" },
];

type Stage = "form" | "ai" | "done";

export function AhaReflection({
  moduleId,
  onDone,
}: {
  moduleId: string;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<Stage>("form");
  const [insight, setInsight] = useState("");
  const [linkPrior, setLinkPrior] = useState("");
  const [whenTry, setWhenTry] = useState<string>("");
  const [hours, setHours] = useState<number | null>(null);
  const [visibility, setVisibility] = useState<AhaVisibility>("private");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function logHoursSaved(note: string) {
    if (!hours || hours <= 0) return;
    try {
      if (isSupabaseConfigured()) {
        await createTimeLog({ hoursSaved: hours, note });
      } else {
        addDemoTimeLog(hours, undefined, note);
      }
    } catch (err) {
      console.warn("[aha] Không ghi được nhật ký giờ:", err);
    }
  }

  async function persistReflection() {
    const payload = {
      moduleId,
      insight: insight.trim(),
      linkPrior: linkPrior.trim(),
      nextAction: whenTry,
      visibility,
      aiQuestion: aiQuestion || undefined,
    };
    if (isSupabaseConfigured()) {
      try {
        await fetch("/api/aha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "save",
            module_id: moduleId,
            insight: payload.insight,
            link_prior: payload.linkPrior,
            next_action: whenTry,
            visibility,
            ai_question: aiQuestion || undefined,
          }),
        });
      } catch (err) {
        console.warn("[aha] Không lưu được phản tư:", err);
      }
    } else {
      addDemoAhaReflection(payload);
    }
  }

  // Bước 1: điền 3 ô → gọi AI hỏi lại 1 câu.
  async function handleAskAi() {
    if (!insight.trim()) {
      setError("Viết một câu cho ô đầu tiên nhé.");
      return;
    }
    if (!linkPrior.trim()) {
      setError("Ô thứ hai bắt buộc — nối điều mới với cách bạn đang làm.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      let question = buildFallbackAhaQuestion(insight);
      try {
        const res = await fetch("/api/aha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "question",
            module_id: moduleId,
            insight: insight.trim(),
            link_prior: linkPrior.trim(),
            next_action: whenTry,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { question?: string };
          if (data.question) question = data.question;
        }
      } catch {
        // dùng câu mẫu
      }
      setAiQuestion(question);
      setStage("ai");
      void trackEvent("aha_started", { moduleId });
    } finally {
      setSubmitting(false);
    }
  }

  // Bước 2: chọn phạm vi + lưu.
  async function handleSave() {
    setSubmitting(true);
    try {
      const note = `Aha: ${insight.trim()}${aiReply.trim() ? ` — ${aiReply.trim()}` : ""}`;
      await Promise.all([logHoursSaved(note), persistReflection()]);
      void trackEvent("aha_saved", { moduleId, visibility, hoursSaved: hours ?? 0 });
      setStage("done");
      onDone();
    } finally {
      setSubmitting(false);
    }
  }

  function handleSkip() {
    void trackEvent("aha_skipped", { moduleId });
    setStage("done");
    onDone();
  }

  if (stage === "done") {
    return (
      <div className="rounded-xl border border-brand/25 bg-brand-soft p-4">
        <p className="text-sm leading-relaxed text-ink">
          <b className="text-brand">Trợ lý AI:</b> Cảm ơn bạn đã dừng lại 20 giây
          để ngẫm. Chính khoảnh khắc &quot;à há&quot; này giúp kiến thức ở lại lâu
          hơn. Hẹn gặp ở bài tiếp theo! 🌱
        </p>
        {hours ? (
          <p className="mt-2 text-xs text-ink-3">
            Đã ghi nhận ~{hours} giờ tiết kiệm vào nhật ký.
          </p>
        ) : null}
      </div>
    );
  }

  if (stage === "ai") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-brand/25 bg-brand-soft p-4">
          <p className="text-sm leading-relaxed text-ink">
            <b className="text-brand">Trợ lý AI hỏi bạn:</b> {aiQuestion}
          </p>
        </div>
        <textarea
          value={aiReply}
          onChange={(e) => setAiReply(e.target.value)}
          placeholder="Trả lời ngắn (không bắt buộc)…"
          className="min-h-[70px] w-full rounded-xl border border-line bg-card p-3 text-sm text-ink focus:border-brand focus:outline-none"
        />

        <div>
          <p className="text-sm font-semibold text-ink">Chia sẻ với ai?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  visibility === opt.value
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-line bg-card text-ink-2 hover:border-brand"
                }`}
                title={opt.hint}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-ink-3">
            {VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.hint}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave()}
            className="inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-50"
          >
            {submitting ? "Đang lưu…" : "Lưu lại"}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="inline-flex items-center justify-center rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    );
  }

  // stage === "form"
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-ink">
          Điều mình vừa hiểu ra
        </label>
        <textarea
          value={insight}
          onChange={(e) => setInsight(e.target.value)}
          placeholder="VD: AI tóm tắt cả bảng trong 30 giây…"
          className="mt-1.5 min-h-[60px] w-full rounded-xl border border-line bg-card p-3 text-sm text-ink focus:border-brand focus:outline-none"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">
          Nó giống/khác gì cách mình đang làm
        </label>
        <textarea
          value={linkPrior}
          onChange={(e) => setLinkPrior(e.target.value)}
          placeholder="VD: Trước đây mình dò tay cả buổi, giờ chỉ kiểm tra lại…"
          className="mt-1.5 min-h-[60px] w-full rounded-xl border border-line bg-card p-3 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-3">
          Ô này giúp nối kiến thức mới với việc bạn đang làm — quan trọng nhất.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold text-ink">
          Mình sẽ thử ngay khi nào
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {WHEN_CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setWhenTry(c)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                whenTry === c
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-line bg-card text-ink-2 hover:border-brand"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="text-sm text-ink-2">
          AI giúp bạn tiết kiệm khoảng (không bắt buộc):
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => setHours(hours === opt.hours ? null : opt.hours)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                hours === opt.hours
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-line bg-card text-ink-2 hover:border-brand hover:text-brand"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm font-medium text-accent" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void handleAskAi()}
          className="inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Đang gửi…" : "Tiếp tục →"}
        </button>
        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center justify-center rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          Bỏ qua
        </button>
      </div>
    </div>
  );
}
