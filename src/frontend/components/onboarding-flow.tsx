"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LIST } from "@/lib/roles";
import {
  ASSESSMENT_QUESTIONS,
  calculateResult,
  type AssessmentAnswer,
} from "@/lib/assessment";
import type { PreferredAddress } from "@/lib/learning-profile";
import { saveDemoProfile } from "@/lib/demo-storage";
import { trackEvent, isSupabaseBackend } from "@/lib/client-api";
import {
  DEMO_ONBOARDED_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";
import { saveEmployeeProfile } from "@/lib/supabase/employee";

type Step = "role" | "address" | "why" | "assessment" | "result";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("role");
  const [roleId, setRoleId] = useState<string | null>(null);
  const [preferredAddress, setPreferredAddress] =
    useState<PreferredAddress>("neutral");
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [questionIdx, setQuestionIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function handleRoleSelect(id: string) {
    setSaveError("");
    setRoleId(id);
    setStep("why");
  }

  function handleAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleNextQuestion() {
    if (questionIdx < ASSESSMENT_QUESTIONS.length - 1) {
      setQuestionIdx((idx) => idx + 1);
    } else {
      await finishAssessment();
    }
  }

  function handlePrevQuestion() {
    if (questionIdx > 0) {
      setQuestionIdx((idx) => idx - 1);
    } else {
      setStep("why");
    }
  }

  async function finishAssessment() {
    if (!roleId || saving) return;

    const assessmentAnswers: AssessmentAnswer[] = Object.entries(answers).map(
      ([questionId, value]) => ({ questionId, value }),
    );
    const result = calculateResult(assessmentAnswers);

    const profile = {
      roleId,
      assessment: result,
      dailyTasks: result.dailyTasks,
      learningProfile: { preferredAddress },
      createdAt: new Date().toISOString(),
    };

    setSaving(true);
    setSaveError("");
    try {
      if (isSupabaseConfigured()) {
        await saveEmployeeProfile(profile, { assessmentAnswers });
      }
      saveDemoProfile(profile);
      document.cookie = `${DEMO_ONBOARDED_COOKIE}=true; path=/; max-age=2592000; SameSite=Lax`;
      if (isSupabaseBackend()) {
        void trackEvent("onboarding_complete", {
          roleId,
          aiLevel: result.aiLevel,
        });
      }
      setStep("result");
    } catch (err) {
      console.warn("[onboarding] Không lưu được profile Supabase:", err);
      setSaveError("Chưa lưu được kết quả. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function handleStart() {
    router.push("/lo-trinh");
    router.refresh();
  }

  if (step === "role") return <StepRole onSelect={handleRoleSelect} />;
  if (step === "address") {
    return (
      <StepAddress
        value={preferredAddress}
        onChange={setPreferredAddress}
        onBack={() => setStep("role")}
        onNext={() => setStep("why")}
      />
    );
  }
  if (step === "why") {
    return (
      <StepWhy
        onBack={() => setStep("role")}
        onNext={() => {
          setStep("assessment");
          setQuestionIdx(0);
        }}
      />
    );
  }
  if (step === "assessment") {
    const question = ASSESSMENT_QUESTIONS[questionIdx];
    return (
      <StepAssessment
        question={question}
        questionIdx={questionIdx}
        totalQuestions={ASSESSMENT_QUESTIONS.length}
        value={answers[question.id]}
        onAnswer={(v) => handleAnswer(question.id, v)}
        onNext={handleNextQuestion}
        onPrev={handlePrevQuestion}
        saving={saving}
        errorMessage={saveError}
      />
    );
  }
  // Result step
  if (!roleId) return null;
  const assessmentAnswers: AssessmentAnswer[] = Object.entries(answers).map(
    ([questionId, value]) => ({ questionId, value }),
  );
  const result = calculateResult(assessmentAnswers);
  return <StepResult roleId={roleId} result={result} onStart={handleStart} />;
}

/* ---------------- STEP 1: Chọn vai trò ---------------- */

function StepRole({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-center sm:px-6 sm:py-12 md:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Bước 1 / 5 · Cá nhân hóa lộ trình
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
        Bạn làm ở{" "}
        <em className="font-medium not-italic text-accent">vị trí nào?</em>
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-base text-ink-2">
        Chọn vai trò của bạn — hệ thống sẽ tạo lộ trình học AI riêng, với ví dụ
        đúng từ công việc của bạn.
      </p>

      <div className="mt-10 grid gap-4 text-left sm:grid-cols-2">
        {ROLE_LIST.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
            className="group relative overflow-hidden rounded-2xl border-2 border-line bg-card p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-brand hover:shadow-lg"
          >
            <span className="absolute right-5 top-5 text-ink-3 transition group-hover:translate-x-0.5 group-hover:text-accent">
              ↗
            </span>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-2xl">
              {role.icon}
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-ink">
              {role.shortLabel}
            </h3>
            <p className="mt-1 text-sm text-ink-2">
              {role.modules.length} module · {role.starterKit.prompts.length}{" "}
              prompt mẫu · {role.starterKit.tools.length} công cụ AI
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- STEP 2: Cách xưng hô ---------------- */

function StepAddress({
  value,
  onChange,
  onBack,
  onNext,
}: {
  value: PreferredAddress;
  onChange: (v: PreferredAddress) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const options: { id: PreferredAddress; label: string; hint: string }[] = [
    { id: "anh", label: "Anh", hint: "Trợ lý sẽ gọi bạn là anh" },
    { id: "chi", label: "Chị", hint: "Trợ lý sẽ gọi bạn là chị" },
    {
      id: "neutral",
      label: "Không tiết lộ",
      hint: "Trợ lý dùng anh/chị trung tính",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 sm:py-12 md:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Bước 2 / 5 · Trợ lý gọi bạn thế nào?
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Em nên xưng hô với bạn{" "}
        <em className="font-medium not-italic text-accent">thế nào?</em>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-2">
        Tùy chọn — giúp trợ lý AI nói chuyện tự nhiên hơn. Bạn có thể bỏ qua và
        chọn «Không tiết lộ».
      </p>

      <div className="mx-auto mt-8 grid max-w-lg gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-2xl border-2 p-4 text-left transition ${
              value === opt.id
                ? "border-brand bg-brand-soft shadow-sm"
                : "border-line bg-card hover:border-brand/50"
            }`}
          >
            <p className="font-display text-lg font-bold text-ink">{opt.label}</p>
            <p className="mt-1 text-xs text-ink-2">{opt.hint}</p>
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink-2"
        >
          ← Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-brand px-8 py-2.5 text-sm font-bold text-white shadow-sm"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}

/* ---------------- STEP 3: Tại sao cần làm bài test ---------------- */

function StepWhy({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 sm:py-12 md:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Bước 3 / 5 · Đánh giá đầu vào
      </p>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Trước khi bắt đầu, em cần hỏi anh/chị{" "}
        <em className="font-medium not-italic text-accent">6 câu nhanh</em>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-ink-2">
        Để lộ trình thật sự hữu ích chứ không chung chung. Mất 2 phút thôi —
        sau đó em sẽ chọn module + ví dụ sát với công việc của anh/chị.
      </p>

      <div className="mx-auto mt-8 max-w-md space-y-3 text-left">
        {[
          {
            icon: "🎯",
            title: "Lộ trình sát thực tế",
            body: "Vị trí + công việc hằng ngày → ví dụ trong module dùng từ công ty của anh/chị.",
          },
          {
            icon: "⚖️",
            title: "Không học lại thứ đã biết",
            body: "Đã dùng AI quen tay rồi → em skip module cơ bản, bắt đầu từ use case nâng cao.",
          },
          {
            icon: "🧭",
            title: "Tự đánh giá thật",
            body: "Không có đáp án đúng/sai — chỉ cần thành thật để em tư vấn đúng.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4"
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <p className="font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-sm text-ink-2">{item.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-12 items-center justify-center rounded-full border-2 border-line bg-card px-7 text-base font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          ← Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-12 items-center justify-center rounded-full bg-brand px-8 text-base font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2 hover:-translate-y-0.5"
        >
          Bắt đầu trả lời →
        </button>
      </div>
    </div>
  );
}

/* ---------------- STEP 3: Assessment quiz ---------------- */

function StepAssessment({
  question,
  questionIdx,
  totalQuestions,
  value,
  onAnswer,
  onNext,
  onPrev,
  saving,
  errorMessage,
}: {
  question: (typeof ASSESSMENT_QUESTIONS)[number];
  questionIdx: number;
  totalQuestions: number;
  value: string | string[] | undefined;
  onAnswer: (v: string | string[]) => void;
  onNext: () => void | Promise<void>;
  onPrev: () => void;
  saving: boolean;
  errorMessage?: string;
}) {
  const progressPct = ((questionIdx + 1) / totalQuestions) * 100;
  const canProceed =
    value !== undefined &&
    (Array.isArray(value) ? value.length > 0 : value.length > 0);

  function toggleChip(chip: string) {
    const current = Array.isArray(value) ? value : [];
    if (current.includes(chip)) {
      onAnswer(current.filter((c) => c !== chip));
    } else {
      onAnswer([...current, chip]);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12 md:py-16">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Bước 4 / 5 · Câu {questionIdx + 1} / {totalQuestions}
        </p>
        <p className="text-xs font-medium text-ink-3">
          {Math.round(progressPct)}% xong
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full border border-line bg-secondary">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="mt-8 rounded-3xl border border-line bg-card p-7 shadow-sm sm:p-9">
        <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {question.title}
        </h2>
        {question.helper && (
          <p className="mt-2 text-sm text-ink-2">{question.helper}</p>
        )}

        {question.type === "likert" && (
          <div className="mt-6 space-y-2.5">
            {question.options?.map((option) => {
              const selected = value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onAnswer(option.value)}
                  className={
                    "flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left text-sm font-medium transition " +
                    (selected
                      ? "border-brand bg-brand-soft text-ink"
                      : "border-line bg-card text-ink-2 hover:border-brand/40 hover:bg-secondary")
                  }
                >
                  <span
                    className={
                      "grid h-6 w-6 flex-none place-items-center rounded-full border-2 " +
                      (selected
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-line")
                    }
                  >
                    {selected && "✓"}
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        {question.type === "multi-chip" && (
          <div className="mt-6 flex flex-wrap gap-2.5">
            {question.options?.map((option) => {
              const arr = Array.isArray(value) ? value : [];
              const selected = arr.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleChip(option.value)}
                  className={
                    "rounded-full border-2 px-4 py-2 text-sm font-medium transition " +
                    (selected
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-line bg-card text-ink-2 hover:border-brand/40")
                  }
                >
                  {selected && "✓ "}
                  {option.label}
                </button>
              );
            })}
            <p className="basis-full pt-2 text-xs text-ink-3">
              Chọn nhiều câu trả lời. Tối thiểu 1.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border-2 border-line bg-card px-6 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand sm:w-auto"
        >
          ← Quay lại
        </button>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          {errorMessage && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {errorMessage}
            </p>
          )}
          <button
          type="button"
          onClick={onNext}
          disabled={!canProceed || saving}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-brand px-8 text-sm font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
            {saving
              ? "Đang lưu..."
              : questionIdx === totalQuestions - 1
                ? "Xem kết quả →"
                : "Câu tiếp →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- STEP 4: Kết quả ---------------- */

function StepResult({
  roleId,
  result,
  onStart,
}: {
  roleId: string;
  result: ReturnType<typeof calculateResult>;
  onStart: () => void;
}) {
  const role = ROLE_LIST.find((r) => r.id === roleId);
  if (!role) return null;

  const levelPct = (result.aiLevel / 5) * 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-12 md:py-16">
      <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Bước 5 / 5 · Kết quả đánh giá
      </p>
      <h1 className="mt-4 text-center font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Đây là lộ trình{" "}
        <em className="font-medium not-italic text-accent">
          dành riêng cho anh/chị
        </em>
      </h1>

      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-card shadow-md">
        <div className="bg-brand p-7 text-brand-foreground">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Trình độ AI hiện tại
              </p>
              <p className="mt-2 font-display text-3xl font-bold">
                {result.levelLabel}
              </p>
              <p className="mt-2 max-w-sm text-sm text-brand-foreground/80">
                {result.levelDesc}
              </p>
            </div>
            <div className="relative grid h-24 w-24 flex-none place-items-center">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - levelPct / 100)}
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute font-display text-2xl font-bold">
                {result.aiLevel}/5
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
              Vai trò
            </p>
            <p className="mt-1 flex items-center gap-2 text-base font-semibold text-ink">
              <span className="text-xl">{role.icon}</span>
              {role.label}
            </p>
          </div>

          {result.dailyTasks.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
                Công việc hằng ngày của anh/chị
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.dailyTasks.map((task) => (
                  <span
                    key={task}
                    className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"
                  >
                    {DAILY_TASK_LABELS[task] ?? task}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-line bg-secondary/50 p-4">
            <p className="text-sm font-semibold text-ink">
              📚 Lộ trình của anh/chị sẽ có:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-2">
              <li>
                ✓{" "}
                {result.skipBasicModules
                  ? `${role.modules.filter((m) => m.level >= 2).length} module nâng cao (skip 2 module cơ bản)`
                  : `${role.modules.length} module từ cơ bản đến nâng cao`}
              </li>
              <li>✓ {role.starterKit.prompts.length} prompt mẫu copy-dùng-ngay</li>
              <li>✓ {role.starterKit.tools.length} công cụ AI gợi ý</li>
              <li>✓ Bài kiểm tra tình huống + trợ lý AI hỏi đáp 24/7</li>
            </ul>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="mt-8 inline-flex h-12 w-full items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90 hover:-translate-y-0.5"
      >
        Bắt đầu học ngay →
      </button>
    </div>
  );
}

const DAILY_TASK_LABELS: Record<string, string> = {
  email: "Soạn email",
  report: "Làm báo cáo",
  meeting: "Họp hành",
  customer: "Tiếp xúc khách",
  content: "Viết content",
  process: "Quy trình",
  analyze: "Phân tích",
  plan: "Lên kế hoạch",
};
