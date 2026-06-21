"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchPracticeReview,
  isSupabaseBackend,
  submitPracticeReview,
  trackEvent,
  type PracticeHistoryStats,
  type PracticeReview,
} from "@/lib/client-api";
import {
  addDemoPracticeHistory,
  demoPracticeStats,
  getDemoPracticeHistory,
} from "@/lib/practice-history-demo";
import {
  MAX_IMAGES_PER_SUBMIT,
  PRACTICE_PASS_SCORE,
} from "@/lib/practice-grader";

const MAX_BYTES = 5 * 1024 * 1024;

type PendingImage = {
  id: string;
  previewUrl: string;
  base64: string;
  mimeType: string;
};

function scoreTone(score: number) {
  if (score >= 80) return "text-brand";
  if (score >= 60) return "text-ink";
  return "text-accent";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Xuất sắc";
  if (score >= 70) return "Khá tốt";
  if (score >= 60) return "Đạt yêu cầu";
  return "Cần cải thiện";
}

function formatReviewDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReviewResultCard({
  review,
  isComplete,
  compact = false,
}: {
  review: PracticeReview;
  isComplete?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border border-line bg-secondary/30 p-4"
          : "rounded-xl border border-brand/25 bg-brand-soft p-5"
      }
    >
      {review.score >= PRACTICE_PASS_SCORE && !compact && (
        <p className="mb-3 rounded-lg bg-brand/10 px-3 py-2 text-sm font-semibold text-brand">
          {isComplete
            ? `✓ Đạt ${review.score} điểm — bài đã hoàn thành`
            : `✓ Đạt ${review.score} điểm — đang lưu hoàn thành…`}
        </p>
      )}
      {review.score < PRACTICE_PASS_SCORE && !compact && (
        <p className="mb-3 rounded-lg bg-accent/10 px-3 py-2 text-sm font-medium text-accent">
          Chưa đạt ngưỡng {PRACTICE_PASS_SCORE} điểm — hãy chỉnh lại và nộp
          lần nữa, hoặc sang bài tiếp theo.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <p className={`font-display text-3xl font-bold ${scoreTone(review.score)}`}>
          {review.score}
          <span className="text-base font-semibold text-ink-3">/100</span>
        </p>
        <span className="rounded-full bg-card px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand">
          {scoreLabel(review.score)}
        </span>
        {review.reviewedAt && (
          <span className="text-xs text-ink-3">
            {formatReviewDate(review.reviewedAt)}
            {review.imageCount != null && review.imageCount > 0
              ? ` · ${review.imageCount} ảnh`
              : ""}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">{review.feedback}</p>

      {review.rubricScores && review.rubricScores.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-lg border border-line bg-card">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/40 text-ink-3">
              <tr>
                <th className="px-3 py-2 font-semibold">Tiêu chí</th>
                <th className="w-16 px-2 py-2 text-right font-semibold">Điểm</th>
              </tr>
            </thead>
            <tbody>
              {review.rubricScores.map((r, i) => (
                <tr key={i} className="border-t border-line align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium text-ink">{r.criteria}</span>
                    {r.comment && (
                      <span className="block text-ink-3">{r.comment}</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-bold text-brand">
                    {r.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {review.imageUrls && review.imageUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {review.imageUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-line"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Ảnh thực hành đã nộp"
                className="h-16 w-16 object-cover"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ModulePracticeReview({
  moduleId,
  moduleTitle,
  isComplete = false,
  onReviewed,
}: {
  moduleId: string;
  moduleTitle: string;
  isComplete?: boolean;
  onReviewed?: (review: PracticeReview) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [answerText, setAnswerText] = useState("");
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [latest, setLatest] = useState<PracticeReview | null>(null);
  const [history, setHistory] = useState<PracticeReview[]>([]);
  const [stats, setStats] = useState<PracticeHistoryStats>({
    attemptCount: 0,
    bestScore: 0,
    latestScore: null,
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      try {
        if (isSupabaseBackend()) {
          const res = await fetchPracticeReview(moduleId);
          if (cancelled) return;
          setHistory(res.history ?? []);
          setStats(
            res.stats ?? {
              attemptCount: 0,
              bestScore: 0,
              latestScore: null,
            },
          );
          if (res.review) {
            setLatest(res.review);
            onReviewed?.(res.review);
          }
        } else {
          const demoHistory = getDemoPracticeHistory(moduleId);
          if (cancelled) return;
          setHistory(demoHistory);
          setStats(demoPracticeStats(demoHistory));
          if (demoHistory[0]) {
            setLatest(demoHistory[0]);
            onReviewed?.(demoHistory[0]);
          }
        }
      } catch {
        // chưa có lịch sử
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    }
    void loadSaved();
    return () => {
      cancelled = true;
    };
  }, [moduleId, onReviewed]);

  function revokePending(items: PendingImage[]) {
    for (const item of items) URL.revokeObjectURL(item.previewUrl);
  }

  function clearPending() {
    revokePending(pending);
    setPending([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleFilesChange(files: FileList | null) {
    setError("");
    if (!files?.length) return;

    const slotsLeft = MAX_IMAGES_PER_SUBMIT - pending.length;
    if (slotsLeft <= 0) {
      setError(`Tối đa ${MAX_IMAGES_PER_SUBMIT} ảnh mỗi lần nộp.`);
      return;
    }

    const toAdd = Array.from(files).slice(0, slotsLeft);
    for (const file of toAdd) {
      if (!file.type.startsWith("image/")) {
        setError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP).");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("Mỗi ảnh tối đa 5MB.");
        return;
      }
    }

    for (const file of toAdd) {
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1] ?? "";
        setPending((prev) => {
          if (prev.length >= MAX_IMAGES_PER_SUBMIT) return prev;
          return [
            ...prev,
            { id, previewUrl, base64, mimeType: file.type },
          ];
        });
      };
      reader.readAsDataURL(file);
    }

    if (inputRef.current) inputRef.current.value = "";
  }

  async function handlePasteAnswer() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setAnswerText((prev) => (prev ? `${prev}\n${text}` : text));
    } catch {
      setError("Trình duyệt chưa cho dán tự động — hãy dán tay (Ctrl/Cmd+V).");
    }
  }

  async function handleSubmit() {
    if (!answerText.trim() && pending.length === 0) {
      setError("Hãy dán đáp án hoặc chọn ít nhất 1 ảnh kết quả.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await submitPracticeReview({
        moduleId,
        answerText: answerText.trim() || undefined,
        images: pending.map((p) => ({
          imageBase64: p.base64,
          mimeType: p.mimeType,
        })),
      });
      const entry = res.entry ?? res.review;

      if (isSupabaseBackend()) {
        const refreshed = await fetchPracticeReview(moduleId);
        setHistory(refreshed.history ?? []);
        setStats(
          refreshed.stats ?? demoPracticeStats(refreshed.history ?? []),
        );
        const latestReview = refreshed.review ?? entry;
        setLatest(latestReview);
        onReviewed?.(latestReview);
      } else {
        const nextHistory = addDemoPracticeHistory(moduleId, entry);
        setHistory(nextHistory);
        setStats(demoPracticeStats(nextHistory));
        setLatest(entry);
        onReviewed?.(entry);
      }
      clearPending();
      setAnswerText("");
      setHistoryOpen(true);
      void trackEvent("practice_reviewed", {
        moduleId,
        score: entry.score,
        imageCount: entry.imageCount ?? pending.length,
        hasText: answerText.trim().length > 0,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không gửi được ảnh. Thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (loadingSaved) {
    return (
      <section className="rounded-2xl border border-line bg-card p-6 shadow-sm">
        <div className="h-24 animate-pulse rounded-xl bg-secondary" />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-accent/30 bg-card p-4 shadow-sm sm:p-6">
      <h2 className="font-display text-lg font-bold text-ink">
        Chấm điểm thực hành
      </h2>
      <p className="mt-2 text-sm text-ink-2">
        Dán câu trả lời từ AI (chính xác hơn) và/hoặc nộp ảnh kết quả (tối đa{" "}
        {MAX_IMAGES_PER_SUBMIT} ảnh/lần). Hệ thống chấm bài &ldquo;
        {moduleTitle}&rdquo;; đạt từ{" "}
        <span className="font-semibold text-brand">{PRACTICE_PASS_SCORE} điểm</span>{" "}
        thì bài được hoàn thành tự động.
      </p>

      {/* Ô dán text đáp án — chấm chính xác hơn ảnh */}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-ink">
            Paste kết quả AI trả về
          </label>
          <button
            type="button"
            onClick={() => void handlePasteAnswer()}
            className="rounded-full border border-line bg-card px-3 py-1 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            📋 Paste
          </button>
        </div>
        <textarea
          value={answerText}
          onChange={(e) => setAnswerText(e.target.value)}
          placeholder="Dán toàn bộ câu trả lời từ AI vào đây..."
          className="mt-1.5 min-h-[110px] w-full rounded-xl border border-line bg-card p-3 text-sm text-ink focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-3">
          💡 Paste text giúp chấm chính xác hơn. Ảnh là bằng chứng bổ sung.
        </p>
      </div>

      {stats.attemptCount > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-line bg-secondary/30 p-3 text-center">
          <div>
            <p className="text-lg font-bold text-ink">{stats.attemptCount}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-3">
              Lần nộp
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-brand">{stats.bestScore}</p>
            <p className="text-[10px] uppercase tracking-wide text-ink-3">
              Điểm cao nhất
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-ink">
              {stats.latestScore ?? "—"}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-ink-3">
              Lần gần nhất
            </p>
          </div>
        </div>
      )}

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-secondary/30 px-4 py-6 text-center transition hover:border-brand hover:bg-brand-soft/30">
        <span className="text-2xl">📷</span>
        <span className="mt-2 text-sm font-semibold text-ink">
          Chọn ảnh kết quả ({pending.length}/{MAX_IMAGES_PER_SUBMIT})
        </span>
        <span className="mt-1 text-xs text-ink-3">
          PNG, JPG, WebP · tối đa 5MB/ảnh · chọn nhiều ảnh cùng lúc
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => handleFilesChange(e.target.files)}
        />
      </label>

      {pending.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {pending.map((img) => (
            <div key={img.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl}
                alt="Xem trước"
                className="h-20 w-20 rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                onClick={() => removePending(img.id)}
                className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-card text-xs shadow"
                aria-label="Xóa ảnh"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={clearPending}
            className="self-center text-xs font-medium text-ink-3 hover:text-accent"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={loading || (pending.length === 0 && !answerText.trim())}
        onClick={() => void handleSubmit()}
        className="mt-4 inline-flex items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Đang chấm điểm…" : "Gửi bài để chấm điểm"}
      </button>

      {latest && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">
            Kết quả lần nộp gần nhất
          </p>
          <ReviewResultCard review={latest} isComplete={isComplete} />
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={historyOpen}
          >
            <span className="text-sm font-semibold text-ink">
              Lịch sử nộp bài ({history.length})
            </span>
            <span className="text-xs text-ink-3">{historyOpen ? "▴" : "▾"}</span>
          </button>
          {historyOpen && (
            <div className="mt-3 space-y-3">
              {history.map((item, idx) => (
                <ReviewResultCard
                  key={item.id ?? `${item.reviewedAt}-${idx}`}
                  review={item}
                  compact
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
