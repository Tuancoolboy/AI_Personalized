"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchManagerGradingQueue,
  isSupabaseBackend,
  submitManagerGradingReview,
  type ManagerGradingQueueItem,
} from "@/lib/client-api";
import { CardListSkeleton } from "@/components/skeletons/page-skeletons";

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function confidenceLabel(value: number) {
  if (value >= 0.85) return "Cao";
  if (value >= 0.65) return "Trung bình";
  return "Thấp — cần duyệt";
}

type ReviewModalState = {
  item: ManagerGradingQueueItem;
  action: "accept" | "adjust" | "needs-revision";
};

export function ManagerGradingQueue() {
  const useDemo = !isSupabaseBackend();
  const [items, setItems] = useState<ManagerGradingQueueItem[]>([]);
  const [persisted, setPersisted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ReviewModalState | null>(null);
  const [reason, setReason] = useState("");
  const [adjustedScore, setAdjustedScore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchManagerGradingQueue()
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setPersisted(Boolean(res.persisted));
        setMessage(res.message ?? "");
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setPersisted(false);
        setMessage(
          useDemo
            ? "Không tải được hàng đợi demo."
            : "Không tải được hàng đợi chấm điểm.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useDemo]);

  async function refreshQueue() {
    setLoading(true);
    try {
      const res = await fetchManagerGradingQueue();
      setItems(res.items);
      setPersisted(Boolean(res.persisted));
      setMessage(res.message ?? "");
    } catch {
      setItems([]);
      setPersisted(false);
      setMessage(
        useDemo
          ? "Không tải được hàng đợi demo."
          : "Không tải được hàng đợi chấm điểm.",
      );
    } finally {
      setLoading(false);
    }
  }

  function openModal(item: ManagerGradingQueueItem, action: ReviewModalState["action"]) {
    setModal({ item, action });
    setReason("");
    setAdjustedScore(String(item.score));
  }

  function closeModal() {
    if (submitting) return;
    setModal(null);
  }

  async function confirmReview() {
    if (!modal) return;
    setSubmitting(true);
    try {
      const res = await submitManagerGradingReview(modal.item.id, {
        action: modal.action,
        reason,
        adjustedScore:
          modal.action === "adjust" ? Number(adjustedScore) : undefined,
      });
      setItems((prev) => prev.filter((item) => item.id !== modal.item.id));
      setToast(res.message);
      setTimeout(() => setToast(null), 3500);
      setModal(null);
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Không gửi được quyết định.");
      setTimeout(() => setToast(null), 3500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/quan-ly"
            className="text-xs font-semibold text-ink-3 hover:text-brand"
          >
            ← Về dashboard
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Chấm điểm
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Duyệt bài cần xem lại
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Các bài AI chấm với độ tin cậy thấp hoặc điểm sát ngưỡng — quản lý
            xác nhận hoặc điều chỉnh trước khi ghi nhận.
          </p>
          <p className="mt-1 text-xs font-medium text-ink-3">
            {persisted
              ? "Dữ liệu Supabase theo tổ chức"
              : useDemo
                ? "Dữ liệu demo"
                : message || "Chưa có schema grading"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshQueue()}
          className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          Làm mới
        </button>
      </div>

      {loading ? (
        <CardListSkeleton count={3} />
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-line bg-card p-10 text-center">
          <p className="text-3xl">✓</p>
          <p className="mt-3 font-display text-lg font-semibold text-ink">
            Không có bài chờ duyệt
          </p>
          <p className="mt-1 text-sm text-ink-3">
            {message || "Mọi bài chấm gần đây đã được AI tự duyệt hoặc đã xử lý."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-line bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {item.employeeName ?? "Nhân viên"}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-3">
                    {item.moduleTitle ?? item.moduleId ?? "Bài thực hành"} ·{" "}
                    {formatDate(item.submittedAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-ink">
                    {item.score}
                    <span className="text-base font-medium text-ink-3">/100</span>
                  </p>
                  <p className="text-xs text-ink-3">
                    Tin cậy AI: {confidenceLabel(item.confidence)} (
                    {Math.round(item.confidence * 100)}%)
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-2">
                {item.feedback}
              </p>

              {item.rubricBreakdown.length > 0 && (
                <div className="mt-4 rounded-xl bg-secondary/40 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-3">
                    Rubric
                  </p>
                  <ul className="mt-2 space-y-2">
                    {item.rubricBreakdown.map((row) => (
                      <li
                        key={row.criterion}
                        className="flex flex-wrap justify-between gap-2 text-sm"
                      >
                        <span className="text-ink-2">{row.criterion}</span>
                        <span className="font-semibold text-ink">
                          {row.points}/{row.maxPoints}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(item.strengths.length > 0 || item.improvements.length > 0) && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {item.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-brand">Điểm mạnh</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-ink-2">
                        {item.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {item.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-accent">Cần cải thiện</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-ink-2">
                        {item.improvements.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openModal(item, "accept")}
                  className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
                >
                  Duyệt điểm AI
                </button>
                <button
                  type="button"
                  onClick={() => openModal(item, "adjust")}
                  className="inline-flex h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
                >
                  Điều chỉnh điểm
                </button>
                <button
                  type="button"
                  onClick={() => openModal(item, "needs-revision")}
                  className="inline-flex h-10 items-center rounded-full border border-accent/40 px-4 text-sm font-semibold text-accent transition hover:bg-accent/5"
                >
                  Yêu cầu làm lại
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-line bg-card p-6 shadow-xl">
            <h2 className="font-display text-lg font-bold text-ink">
              {modal.action === "accept" && "Duyệt điểm AI"}
              {modal.action === "adjust" && "Điều chỉnh điểm"}
              {modal.action === "needs-revision" && "Yêu cầu làm lại"}
            </h2>
            <p className="mt-1 text-sm text-ink-3">
              {modal.item.employeeName ?? "Nhân viên"} · điểm hiện tại{" "}
              {modal.item.score}
            </p>

            {modal.action === "adjust" && (
              <label className="mt-4 block">
                <span className="text-xs font-semibold text-ink-2">
                  Điểm sau điều chỉnh (0–100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={adjustedScore}
                  onChange={(e) => setAdjustedScore(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-line bg-background px-3 py-2.5 text-sm"
                />
              </label>
            )}

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-ink-2">
                Lý do (bắt buộc)
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="VD: Email thiếu thông tin khách hàng cụ thể…"
                className="mt-1.5 w-full resize-none rounded-xl border border-line bg-background px-3 py-2.5 text-sm"
              />
            </label>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={closeModal}
                className="inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-ink-3 hover:text-ink"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting || !reason.trim()}
                onClick={() => void confirmReview()}
                className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground disabled:opacity-50"
              >
                {submitting ? "Đang lưu…" : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
