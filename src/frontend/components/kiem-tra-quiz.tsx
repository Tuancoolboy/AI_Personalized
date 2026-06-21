"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { trackEvent, isSupabaseBackend, submitQuizResult } from "@/lib/client-api";
import { addDemoQuizResult } from "@/lib/demo-storage";
import {
  recordHocTapQuizAttempt,
  resolveHocTapQuizForRoute,
  type HocTapQuizAttemptResult,
  type QuizReturnHref,
} from "@/lib/hoc-tap-quiz-catalog";
import { getRole } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export function KiemTraQuiz({
  roleId,
  returnHref = "/lo-trinh",
  hocTapQuizId,
}: {
  roleId: string;
  returnHref?: QuizReturnHref;
  hocTapQuizId?: string | null;
}) {
  const router = useRouter();
  const role = getRole(roleId);
  const hocTapQuiz =
    returnHref === "/hoc-tap"
      ? resolveHocTapQuizForRoute(roleId, hocTapQuizId)
      : null;
  const isHocTapQuiz = Boolean(hocTapQuiz);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hocTapAttemptResult, setHocTapAttemptResult] =
    useState<HocTapQuizAttemptResult | null>(null);

  if (!role && !hocTapQuiz) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-ink-2">
          {returnHref === "/hoc-tap"
            ? "Không tìm thấy quiz Học tập này."
            : `Không tìm thấy vai trò ${roleId}.`}
        </p>
      </div>
    );
  }

  const questions = hocTapQuiz?.questions ?? role?.quiz ?? [];
  const question = questions[idx];
  const quizModeLabel = isHocTapQuiz ? "Quiz mock tự tạo" : "Bài kiểm tra";
  const progressPct = ((idx + (done ? 1 : 0)) / questions.length) * 100;
  const returnLabel =
    returnHref === "/hoc-tap" ? "Quay lại Học tập" : "Quay lại lộ trình";

  if (!question) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-ink-2">Quiz này chưa có câu hỏi để hiển thị.</p>
      </div>
    );
  }

  function handleSelect(optionIdx: number) {
    if (showExplanation) return;
    setSelected(optionIdx);
    setShowExplanation(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = optionIdx;
      return next;
    });
    if (optionIdx === question.correctIndex) {
      setScore((s) => s + 1);
    }
  }

  async function handleNext() {
    if (idx < questions.length - 1) {
      setIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
      setErrorMessage("");
    } else {
      const percentScore = Math.round((score / questions.length) * 100);
      setFinalScore(percentScore);
      setSaving(true);
      setErrorMessage("");
      try {
        if (hocTapQuiz) {
          const attemptResult = recordHocTapQuizAttempt(
            hocTapQuiz.id,
            percentScore,
          );
          setHocTapAttemptResult(attemptResult);
          if (isSupabaseBackend()) {
            void trackEvent("hoc_tap_mock_quiz_submitted", {
              quizId: hocTapQuiz.id,
              roleId: hocTapQuiz.roleId,
              score: percentScore,
              xpEarned: attemptResult.xpEarned,
            });
          }
        } else if (isSupabaseConfigured()) {
          const payload =
            answers.length === questions.length
              ? { roleId, answers }
              : { roleId, score: percentScore };
          const res = await submitQuizResult(payload);
          if (typeof res.score === "number") {
            setFinalScore(res.score);
          }
        } else {
          addDemoQuizResult(roleId, percentScore);
        }
        if (!hocTapQuiz && isSupabaseBackend()) {
          void trackEvent("quiz_submitted", { roleId, score: percentScore });
          if (percentScore >= 70) {
            void trackEvent("quiz_passed", { roleId, score: percentScore });
          }
        }
        setDone(true);
      } catch (err) {
        console.warn("[kiem-tra] Không lưu được kết quả quiz:", err);
        setErrorMessage(
          isHocTapQuiz
            ? "Chưa cộng được XP cho quiz này. Vui lòng thử lại."
            : "Chưa lưu được điểm kiểm tra. Vui lòng thử lại.",
        );
      } finally {
        setSaving(false);
      }
    }
  }

  if (done) {
    const passed = finalScore >= 70;
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6 sm:py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {isHocTapQuiz ? "Kết quả quiz tự tạo" : "Kết quả bài kiểm tra"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
          {isHocTapQuiz
            ? "Bạn nhận thêm XP!"
            : passed
              ? "Tuyệt vời!"
              : "Cần ôn lại nhé"}
        </h1>

        <div className="relative mx-auto mt-8 grid h-48 w-48 place-items-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--secondary)"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={passed ? "var(--brand)" : "var(--accent)"}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - finalScore / 100)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute text-center">
            <p className="font-display text-5xl font-extrabold text-ink">
              {finalScore}
            </p>
            <p className="text-xs uppercase tracking-wider text-ink-3">điểm</p>
          </div>
        </div>

        <p className="mt-6 text-base text-ink-2">
          Bạn trả lời đúng{" "}
          <strong className="text-ink">
            {score}/{questions.length}
          </strong>{" "}
          câu.{" "}
          {isHocTapQuiz
            ? "Đây là quiz mock tự tạo trong mục Học tập, không ghi vào điểm bài học/lộ trình."
            : passed
              ? "Đã đạt ngưỡng pass (≥70%). Bạn nắm chắc cơ bản rồi!"
              : "Cần đạt ≥70% để pass. Hãy quay lại ôn module trước khi làm lại."}
        </p>

        {isHocTapQuiz && hocTapAttemptResult ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 flex-none place-items-center rounded-xl bg-emerald-600 text-white">
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-emerald-800">
                  +{hocTapAttemptResult.xpEarned} XP vào cấp độ Học tập
                </p>
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  Lv. {hocTapAttemptResult.levelProgress.level} ·{" "}
                  {hocTapAttemptResult.levelProgress.currentXp.toLocaleString(
                    "vi-VN",
                  )}
                  /
                  {hocTapAttemptResult.levelProgress.targetXp.toLocaleString(
                    "vi-VN",
                  )}{" "}
                  XP
                </p>
              </div>
            </div>
            {hocTapAttemptResult.leveledUp ? (
              <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-emerald-800">
                Lên cấp! Bạn vừa chuyển từ Lv.{" "}
                {hocTapAttemptResult.levelBefore} sang Lv.{" "}
                {hocTapAttemptResult.levelAfter}.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={returnHref}
            className="inline-flex h-12 items-center justify-center rounded-full border-2 border-line bg-card px-7 text-base font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            ← {returnLabel}
          </Link>
          <Link
            href={isHocTapQuiz ? "/hoc-tap" : "/tien-bo"}
            className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90"
          >
            {isHocTapQuiz ? "Xem cấp độ →" : "Xem tiến bộ →"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12 md:py-14">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {quizModeLabel} · Câu {idx + 1} / {questions.length}
        </p>
        <button
          type="button"
          onClick={() => router.push(returnHref)}
          className="text-xs font-medium text-ink-3 hover:text-ink-2"
        >
          Thoát ×
        </button>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-line bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-5 shadow-sm sm:rounded-3xl sm:p-7 md:p-9">
        {hocTapQuiz ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="rounded-full bg-brand-soft px-3 py-1 text-brand">
              {hocTapQuiz.category}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-ink-2">
              Tạo bởi {hocTapQuiz.creator}
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
              +{hocTapQuiz.xp} XP tối đa
            </span>
          </div>
        ) : null}
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {question.question}
        </h2>

        <div className="mt-6 space-y-2.5">
          {question.options.map((option, optionIdx) => {
            const isCorrect = optionIdx === question.correctIndex;
            const isSelected = selected === optionIdx;
            const classes = !showExplanation
              ? "border-line bg-card text-ink-2 hover:border-brand/40 hover:bg-secondary"
              : isCorrect
                ? "border-brand bg-brand-soft text-ink"
                : isSelected
                  ? "border-destructive bg-destructive/10 text-ink"
                  : "border-line bg-card/40 text-ink-3 opacity-60";

            return (
              <button
                key={optionIdx}
                type="button"
                onClick={() => handleSelect(optionIdx)}
                disabled={showExplanation}
                className={`flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-medium transition disabled:cursor-not-allowed ${classes}`}
              >
                <span
                  className={`grid h-6 w-6 flex-none place-items-center rounded-md border-2 text-xs font-bold ${
                    showExplanation && isCorrect
                      ? "border-brand bg-brand text-brand-foreground"
                      : showExplanation && isSelected
                        ? "border-destructive bg-destructive text-white"
                        : "border-line text-ink-3"
                  }`}
                >
                  {String.fromCharCode(65 + optionIdx)}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>

        {showExplanation && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-4 text-sm text-brand">
            <span className="text-lg">💡</span>
            <p className="leading-relaxed">{question.explanation}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <div className="flex flex-col items-end gap-2">
          {errorMessage && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!showExplanation || saving}
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-8 text-sm font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Đang lưu..."
              : idx === questions.length - 1
                ? "Xem kết quả →"
                : "Câu tiếp →"}
          </button>
        </div>
      </div>
    </div>
  );
}
