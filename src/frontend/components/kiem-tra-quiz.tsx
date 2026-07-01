"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Sparkles, TimerOff } from "lucide-react";
import { trackEvent, isSupabaseBackend, submitQuizResult } from "@/lib/client-api";
import { addDemoQuizResult } from "@/lib/demo-storage";
import {
  recordDemoHocTapQuizAttempt,
  resolveHocTapLevelProgress,
  resolveHocTapQuizForRoute,
  type HocTapQuizAttemptResult,
  type QuizReturnHref,
} from "@/lib/hoc-tap-quiz-catalog";
import { UNANSWERED_QUIZ_OPTION } from "@/lib/quiz-answers";
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
  const hocTapQuiz = useMemo(
    () =>
      returnHref === "/hoc-tap"
        ? resolveHocTapQuizForRoute(roleId, hocTapQuizId)
        : null,
    [hocTapQuizId, returnHref, roleId],
  );
  const isHocTapQuiz = Boolean(hocTapQuiz);
  const hocTapQuizIdValue = hocTapQuiz?.id ?? null;
  const hocTapQuizRoleId = hocTapQuiz?.roleId ?? null;
  const questions = useMemo(
    () => hocTapQuiz?.questions ?? role?.quiz ?? [],
    [hocTapQuiz?.questions, role?.quiz],
  );
  const timeLimitSeconds = getQuizTimeLimitSeconds({
    questionCount: questions.length,
    durationMinutes: hocTapQuiz?.durationMinutes,
  });
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalCorrectCount, setFinalCorrectCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [saveWarning, setSaveWarning] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(timeLimitSeconds);
  const [timeExpired, setTimeExpired] = useState(false);
  const [finishedByTimeout, setFinishedByTimeout] = useState(false);
  const [hocTapAttemptResult, setHocTapAttemptResult] =
    useState<HocTapQuizAttemptResult | null>(null);
  const hocTapAttemptId = useRef(createQuizAttemptId());
  const deadlineRef = useRef<number | null>(null);
  const finalizingRef = useRef(false);

  const question = questions[idx];
  const progressPct =
    questions.length > 0
      ? ((idx + (done ? 1 : 0)) / questions.length) * 100
      : 0;
  const returnLabel =
    returnHref === "/hoc-tap" ? "Quay lại Học tập" : "Quay lại lộ trình";
  const quizModeLabel = isHocTapQuiz ? "Bộ đề thực hành" : "Bài kiểm tra";

  useEffect(() => {
    deadlineRef.current =
      questions.length > 0 ? Date.now() + timeLimitSeconds * 1000 : null;

    return () => {
      deadlineRef.current = null;
    };
  }, [hocTapQuizIdValue, questions.length, roleId, timeLimitSeconds]);

  const finishQuiz = useCallback(
    async (reason: "completed" | "timeout") => {
      if (finalizingRef.current || done || questions.length === 0) return;

      finalizingRef.current = true;
      if (reason === "timeout") {
        setTimeExpired(true);
        setFinishedByTimeout(true);
        setRemainingSeconds(0);
      }

      const submittedAnswers = buildSubmittedAnswers({
        answers,
        currentIndex: idx,
        questionCount: questions.length,
        selected,
      });
      const correctCount = countCorrectAnswers(questions, submittedAnswers);
      const percentScore = Math.round((correctCount / questions.length) * 100);

      setFinalCorrectCount(correctCount);
      setFinalScore(percentScore);
      setSaving(true);
      setErrorMessage("");
      setSaveWarning("");

      try {
        if (hocTapQuizIdValue && hocTapQuizRoleId) {
          const attemptResult = isSupabaseConfigured()
            ? await saveRealHocTapAttempt({
                roleId,
                quizId: hocTapQuizIdValue,
                answers: submittedAnswers,
                attemptId: hocTapAttemptId.current,
              })
            : recordDemoHocTapQuizAttempt(
                hocTapQuizIdValue,
                percentScore,
                hocTapAttemptId.current,
              );
          setHocTapAttemptResult(attemptResult);
          setFinalScore(attemptResult.attempt.score);
          if (isSupabaseBackend()) {
            void trackEvent("hoc_tap_quiz_submitted", {
              quizId: hocTapQuizIdValue,
              roleId: hocTapQuizRoleId,
              score: attemptResult.attempt.score,
              xpEarned: attemptResult.xpEarned,
              reason,
            });
          }
        } else if (isSupabaseConfigured()) {
          const res = await submitQuizResult({
            roleId,
            answers: submittedAnswers,
          });
          if (typeof res.score === "number") {
            setFinalScore(res.score);
          }
          if (typeof res.correctCount === "number") {
            setFinalCorrectCount(res.correctCount);
          }
        } else {
          addDemoQuizResult(roleId, percentScore);
        }
        if (!hocTapQuizIdValue && isSupabaseBackend()) {
          void trackEvent("quiz_submitted", { roleId, score: percentScore, reason });
          if (percentScore >= 70) {
            void trackEvent("quiz_passed", { roleId, score: percentScore });
          }
        }
        setDone(true);
      } catch (err) {
        console.warn("[kiem-tra] Không lưu được kết quả quiz:", err);
        const message = isHocTapQuiz
          ? "Chưa cộng được XP cho quiz này. Vui lòng thử lại."
          : "Chưa lưu được điểm kiểm tra. Vui lòng thử lại.";
        if (reason === "timeout") {
          setSaveWarning(message);
          setDone(true);
        } else {
          setErrorMessage(message);
          finalizingRef.current = false;
        }
      } finally {
        setSaving(false);
      }
    },
    [
      answers,
      done,
      hocTapQuizIdValue,
      hocTapQuizRoleId,
      idx,
      isHocTapQuiz,
      questions,
      roleId,
      selected,
    ],
  );

  useEffect(() => {
    if (done || saving || questions.length === 0) return;

    function tick() {
      const deadline = deadlineRef.current;
      if (!deadline) return;
      const nextRemaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setRemainingSeconds(nextRemaining);
      if (nextRemaining <= 0) {
        void finishQuiz("timeout");
      }
    }

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [done, finishQuiz, questions.length, saving]);

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

  if (!question) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-ink-2">Quiz này chưa có câu hỏi để hiển thị.</p>
      </div>
    );
  }

  function handleSelect(optionIdx: number) {
    if (showExplanation || timeExpired || saving) return;
    setSelected(optionIdx);
    setShowExplanation(true);
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = optionIdx;
      return next;
    });
  }

  async function handleNext() {
    if (idx < questions.length - 1) {
      setIdx((i) => i + 1);
      setSelected(null);
      setShowExplanation(false);
      setErrorMessage("");
    } else {
      await finishQuiz("completed");
    }
  }

  if (done) {
    const passed = finalScore >= 70;
    return (
      <div className="mx-auto max-w-xl px-4 py-10 text-center sm:px-6 sm:py-12 md:py-16">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {isHocTapQuiz ? "Kết quả bộ đề thực hành" : "Kết quả bài kiểm tra"}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
          {isHocTapQuiz
            ? "Bạn nhận thêm XP!"
            : passed
              ? "Tuyệt vời!"
              : "Cần ôn lại nhé"}
        </h1>

        {finishedByTimeout ? (
          <div className="mx-auto mt-6 flex max-w-md items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800">
            <TimerOff className="mt-0.5 size-5 flex-none" aria-hidden="true" />
            <p>
              Hết thời gian nên bài đã tự nộp. Các câu chưa chọn đáp án được
              tính là chưa đúng.
            </p>
          </div>
        ) : null}

        {saveWarning ? (
          <p
            className="mx-auto mt-4 max-w-md rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive"
            role="alert"
          >
            {saveWarning}
          </p>
        ) : null}

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
            {finalCorrectCount}/{questions.length}
          </strong>{" "}
          câu.{" "}
          {isHocTapQuiz
            ? "Đây là bộ đề thực hành trong mục Học tập, không ghi vào điểm bài học/lộ trình."
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
                  {hocTapAttemptResult.xpEarned > 0
                    ? `+${hocTapAttemptResult.xpEarned} XP vào cấp độ Học tập`
                    : "Điểm tốt nhất chưa tăng nên chưa cộng thêm XP"}
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {quizModeLabel} · Câu {idx + 1} / {questions.length}
        </p>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span
            className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-extrabold ${
              remainingSeconds <= 60
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-line bg-card text-ink-2"
            }`}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            Còn {formatQuizDuration(remainingSeconds)}
          </span>
          <button
            type="button"
            onClick={() => router.push(returnHref)}
            className="text-xs font-medium text-ink-3 hover:text-ink-2"
          >
            Thoát ×
          </button>
        </div>
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
                disabled={showExplanation || timeExpired || saving}
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
            disabled={!showExplanation || saving || timeExpired}
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

async function saveRealHocTapAttempt(input: {
  roleId: string;
  quizId: string;
  answers: number[];
  attemptId: string;
}): Promise<HocTapQuizAttemptResult> {
  const response = await submitQuizResult(input);
  if (
    typeof response.score !== "number" ||
    typeof response.xpEarned !== "number" ||
    typeof response.totalXp !== "number" ||
    typeof response.level !== "number" ||
    typeof response.currentLevelXp !== "number" ||
    typeof response.targetLevelXp !== "number"
  ) {
    throw new Error("API quiz không trả về dữ liệu XP hợp lệ.");
  }

  const levelBefore = resolveHocTapLevelProgress(
    Math.max(0, response.totalXp - response.xpEarned),
  ).level;
  const levelProgress = {
    level: response.level,
    currentXp: response.currentLevelXp,
    targetXp: response.targetLevelXp,
    totalXp: response.totalXp,
    extraXp: response.totalXp,
  };

  return {
    attempt: {
      id: response.attemptId ?? input.attemptId,
      quizId: input.quizId,
      score: response.score,
      xpEarned: response.xpEarned,
      createdAt: new Date().toISOString(),
    },
    progress: {
      totalXpEarned: response.totalXp,
      attempts: [],
    },
    xpEarned: response.xpEarned,
    levelBefore,
    levelAfter: response.level,
    leveledUp: response.level > levelBefore,
    levelProgress,
  };
}

function getQuizTimeLimitSeconds(input: {
  questionCount: number;
  durationMinutes?: number;
}): number {
  if (input.durationMinutes && input.durationMinutes > 0) {
    return input.durationMinutes * 60;
  }
  return Math.max(60, input.questionCount * 60);
}

function buildSubmittedAnswers(input: {
  answers: number[];
  currentIndex: number;
  questionCount: number;
  selected: number | null;
}): number[] {
  const submittedAnswers = Array.from(
    { length: input.questionCount },
    (_, index) =>
      Number.isInteger(input.answers[index])
        ? input.answers[index]
        : UNANSWERED_QUIZ_OPTION,
  );
  if (input.selected !== null && input.currentIndex < input.questionCount) {
    submittedAnswers[input.currentIndex] = input.selected;
  }
  return submittedAnswers;
}

function countCorrectAnswers(
  questions: Array<{ correctIndex: number }>,
  answers: number[],
): number {
  return questions.reduce(
    (count, question, index) =>
      answers[index] === question.correctIndex ? count + 1 : count,
    0,
  );
}

function formatQuizDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function createQuizAttemptId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" +
    Math.floor(Math.random() * 1_000_000_000_000)
      .toString()
      .padStart(12, "0");
}
