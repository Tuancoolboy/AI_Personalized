"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModulePracticeReview } from "@/components/module-practice-review";
import { AhaReflection } from "@/components/aha-reflection";
import { LessonSkeleton } from "@/components/skeletons/page-skeletons";
import {
  fetchModule,
  fetchModules,
  trackEvent,
  type PracticeReview,
} from "@/lib/client-api";
import {
  getDemoProfile,
  getDemoProgress,
  setModuleStatus,
} from "@/lib/demo-storage";
import {
  saveEmployeeExtraLesson,
  getEmployeeExtraLessons,
} from "@/lib/supabase/employee";
import {
  getLearningModuleById,
  getLearningModulesByRole,
  resolveNextModuleId,
  type LearningModuleRecord,
} from "@/lib/learning-modules-data";
import { PRACTICE_PASS_SCORE, canAutoCompletePractice } from "@/lib/practice-grader";
import { getRole, ROLES, SKILL_LABELS } from "@/lib/roles";
import {
  getDeptAiTool,
  getToolForModule,
  setOrgAiTool,
  type ResolvedTool,
} from "@/lib/ai-tool-helper";
import { type RoleId } from "@/lib/openai";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  getEmployeeProfile,
  getEmployeeProgress,
  saveEmployeeModuleStatus,
} from "@/lib/supabase/employee";

function levelLabel(level: number) {
  return level === 1 ? "Nhập môn" : level === 2 ? "Trung cấp" : "Nâng cao";
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Một mảnh prompt: nhãn + nội dung + nút copy + ghi chú "vì sao hỏi vậy".
function PromptBlock({
  label,
  prompt,
  why,
  copiedKey,
  myKey,
  onCopy,
}: {
  label: string;
  prompt: string;
  why?: string;
  copiedKey: string | null;
  myKey: string;
  onCopy: (key: string, text: string) => void;
}) {
  return (
    <div className="mt-4 first:mt-0">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
        {label}
      </p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-xl border border-line bg-secondary/50 p-4 font-mono text-xs leading-relaxed text-ink-2">
        {prompt}
      </pre>
      {why && (
        <p className="mt-2 flex gap-2 rounded-xl bg-brand-soft px-3 py-2 text-xs leading-relaxed text-brand">
          <span>💡</span>
          <span>
            <b>Vì sao hỏi vậy?</b> {why}
          </span>
        </p>
      )}
      <button
        type="button"
        onClick={() => onCopy(myKey, prompt)}
        className="mt-2 inline-flex items-center rounded-full border-2 border-brand bg-card px-4 py-2 text-sm font-semibold text-brand transition hover:bg-brand-soft"
      >
        {copiedKey === myKey ? "✓ Đã copy" : "📋 Copy prompt"}
      </button>
    </div>
  );
}

// Khung mỗi bước, hỗ trợ trạng thái khóa.
function StepCard({
  num,
  title,
  desc,
  locked = false,
  highlight = false,
  children,
}: {
  num: number;
  title: string;
  desc: string;
  locked?: boolean;
  highlight?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-4 shadow-sm sm:p-6 ${
        highlight ? "border-brand/20 bg-brand-soft" : "border-line bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full font-display text-sm font-bold text-white ${
            highlight ? "bg-brand" : "bg-accent"
          }`}
        >
          {num}
        </div>
        <div>
          <h2 className="font-display text-lg font-bold text-ink sm:text-xl">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-2">{desc}</p>
        </div>
      </div>

      {locked ? (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-secondary/40 p-5 text-center text-sm text-ink-3">
          🔒 Hoàn thành <b>Bước 2 — nộp bài để AI chấm</b> để mở khóa phần này.
        </div>
      ) : (
        <div className="mt-4">{children}</div>
      )}
    </section>
  );
}

// Khối hướng dẫn công cụ AI cho bài (mục 2 + 3). Tool chuyên dụng → banner riêng.
function ToolGuide({
  tool,
  isSpecialist,
}: {
  tool: ResolvedTool;
  isSpecialist: boolean;
}) {
  return (
    <div
      className={`mb-4 rounded-xl border p-3 ${
        isSpecialist
          ? "border-accent/40 bg-accent/5"
          : "border-line bg-secondary/40"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tool.icon}
          alt={tool.name}
          width={32}
          height={32}
          className="rounded-lg"
        />
        <div className="min-w-0">
          {isSpecialist ? (
            <p className="text-sm font-semibold text-ink">
              ⚡ Bài này dùng <b>{tool.name}</b>
              {tool.reason ? ` — ${tool.reason}` : ""}
            </p>
          ) : (
            <p className="text-sm font-semibold text-ink">
              Mở <b>{tool.name}</b> → paste prompt → xem kết quả
            </p>
          )}
          <a
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-brand hover:underline"
          >
            {tool.signupGuide}
          </a>
        </div>
      </div>
      {isSpecialist ? (
        <p className="mt-2 text-xs text-ink-3">
          Đây là công cụ chuyên dụng cho bài này, khác với công cụ chính của công
          ty bạn.
        </p>
      ) : (
        <p className="mt-2 text-xs text-ink-3">
          Bạn thực hành trên {tool.name} (công cụ ngoài). Còn{" "}
          <b>Trợ lý AI</b> trong app là gia sư hỏi đáp khi bạn bí — hai thứ khác
          nhau.
        </p>
      )}

      <ToolAccountCheck tool={tool} />
    </div>
  );
}

// "Bạn đã có tài khoản [tool] chưa?" (Phần C §3). Chưa có → hiện video hướng dẫn.
function ToolAccountCheck({ tool }: { tool: ResolvedTool }) {
  const storageKey = `tool_account:${tool.key}`;
  const [hasAccount, setHasAccount] = useState<"yes" | "no" | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "yes" || saved === "no") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage
      setHasAccount(saved);
    }
  }, [storageKey]);

  function choose(value: "yes" | "no") {
    setHasAccount(value);
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {
      // ignore
    }
  }

  return (
    <div className="mt-3 border-t border-line/60 pt-3">
      <p className="text-xs font-semibold text-ink-2">
        Bạn đã có tài khoản {tool.name} chưa?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => choose("yes")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            hasAccount === "yes"
              ? "border-brand bg-brand text-brand-foreground"
              : "border-line bg-card text-ink-2 hover:border-brand"
          }`}
        >
          Đã có
        </button>
        <button
          type="button"
          onClick={() => choose("no")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            hasAccount === "no"
              ? "border-accent bg-accent text-white"
              : "border-line bg-card text-ink-2 hover:border-accent"
          }`}
        >
          Chưa có
        </button>
      </div>
      {hasAccount === "no" && (
        <div className="mt-2 rounded-lg bg-card p-2 text-xs text-ink-2">
          {tool.videoGuide ? (
            <a
              href={tool.videoGuide}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand hover:underline"
            >
              ▶ Xem video hướng dẫn tạo tài khoản {tool.name}
            </a>
          ) : (
            <span>
              Hướng dẫn nhanh: {tool.signupGuide}{" "}
              <span className="text-ink-3">(video sẽ bổ sung sau)</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function ModuleLessonContent({
  moduleId,
  fromExtraSuggestion = false,
}: {
  moduleId: string;
  fromExtraSuggestion?: boolean;
}) {
  const router = useRouter();
  const [mod, setMod] = useState<LearningModuleRecord | null>(null);
  const [status, setStatus] = useState<"chua-hoc" | "dang-hoc" | "hoan-thanh">(
    "chua-hoc",
  );
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [practiceReview, setPracticeReview] = useState<PracticeReview | null>(
    null,
  );
  const [currentRoleId, setCurrentRoleId] = useState<string | null>(null);
  const [extraLessons, setExtraLessons] = useState<
    Array<{ moduleId: string }>
  >([]);
  const [savingExtraLesson, setSavingExtraLesson] = useState(false);

  // Trạng thái hành trình 5 bước.
  const [step1Done, setStep1Done] = useState(false);
  const [step3Done, setStep3Done] = useState(false);
  const [reflectDone, setReflectDone] = useState(false);
  const [memoSaved, setMemoSaved] = useState(false);
  // Tool chính của công ty (mục 3) — nguồn sự thật qua getOrgAiTool().
  const [orgAiTool, setOrgAiToolState] = useState("claude");

  const markLessonComplete = useCallback(
    async (review: PracticeReview) => {
      if (
        !canAutoCompletePractice(
          review.score,
          review.grading?.reviewStatus,
        )
      ) {
        return;
      }

      setSaveError("");
      try {
        if (isSupabaseConfigured()) {
          await saveEmployeeModuleStatus(moduleId, "hoan-thanh");
        } else {
          setModuleStatus(moduleId, "hoan-thanh");
        }
        setStatus("hoan-thanh");
        void trackEvent("lesson_complete", {
          moduleId,
          practiceScore: review.score,
        });
      } catch (err) {
        console.warn("[lesson] Không lưu được hoàn thành:", err);
        setSaveError(
          "Đã chấm điểm nhưng chưa lưu được tiến độ. Kiểm tra đăng nhập và tải lại trang.",
        );
      }
    },
    [moduleId],
  );

  const handleReviewed = useCallback(
    (review: PracticeReview) => {
      setPracticeReview(review);
      void markLessonComplete(review);
    },
    [markLessonComplete],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let lesson: LearningModuleRecord | null = null;
      try {
        const res = await fetchModule(moduleId);
        lesson = res.module;
      } catch {
        lesson = getLearningModuleById(moduleId);
      }
      setMod(lesson);

      let aiLevel = getDemoProfile()?.assessment?.aiLevel ?? 0;

      if (isSupabaseConfigured()) {
        try {
          const [prof, prog] = await Promise.all([
            getEmployeeProfile(),
            getEmployeeProgress(),
          ]);
          setCurrentRoleId(prof?.roleId ?? null);
          aiLevel = prof?.assessment?.aiLevel ?? 0;
          const s = prog[moduleId];
          if (s === "hoan-thanh" || s === "dang-hoc" || s === "chua-hoc") {
            setStatus(s);
          } else if (lesson) {
            setStatus("dang-hoc");
            await saveEmployeeModuleStatus(moduleId, "dang-hoc");
          }
          void trackEvent("lesson_view", { moduleId });

          if (lesson?.role_id) {
            try {
              const { modules } = await fetchModules(lesson.role_id, aiLevel);
              setNextModuleId(resolveNextModuleId(modules, moduleId));
            } catch {
              setNextModuleId(
                resolveNextModuleId(
                  getLearningModulesByRole(lesson.role_id, aiLevel),
                  moduleId,
                ),
              );
            }
          }
        } catch (err) {
          console.warn("[lesson] Không đọc được tiến độ Supabase:", err);
          setCurrentRoleId(getDemoProfile()?.roleId ?? null);
          setStatus(getDemoProgress()[moduleId] ?? "dang-hoc");
        }
      } else {
        setCurrentRoleId(getDemoProfile()?.roleId ?? null);
        const p = getDemoProgress();
        setStatus(p[moduleId] ?? "dang-hoc");
        setModuleStatus(moduleId, "dang-hoc");
        if (lesson?.role_id) {
          setNextModuleId(
            resolveNextModuleId(
              getLearningModulesByRole(lesson.role_id, aiLevel),
              moduleId,
            ),
          );
        }
      }
      try {
        const lessons = await getEmployeeExtraLessons();
        if (!cancelled) {
          setExtraLessons(lessons.map((lesson) => ({ moduleId: lesson.moduleId })));
        }
      } catch (err) {
        console.warn("[lesson] Không đọc được Kỹ năng khác:", err);
      }
      if (!cancelled) setHydrated(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  // Hydrate tool theo PHÒNG BAN của học viên (Phần C §1): dept tool → fallback
  // tool công ty. Demo localStorage; real mode hydrate tool công ty từ DB.
  useEffect(() => {
    const dept = getDemoProfile()?.roleId ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage sau mount (tránh hydration mismatch)
    setOrgAiToolState(getDeptAiTool(dept));
    if (isSupabaseConfigured()) {
      void fetch("/api/org-settings")
        .then((r) => r.json())
        .then((d: { aiTool?: string }) => {
          if (d.aiTool) {
            setOrgAiTool(d.aiTool); // cache để getDeptAiTool fallback đúng
            setOrgAiToolState(getDeptAiTool(dept));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleCopy = useCallback(
    (key: string, text: string) => {
      void copyToClipboard(text).then((ok) => {
        if (!ok) return;
        setCopiedKey(key);
        setStep1Done(true);
        if (key.startsWith("deep-")) setStep3Done(true);
        setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1600);
      });
    },
    [],
  );

  function goNextLesson() {
    if (!nextModuleId) return;
    router.push(`/lo-trinh/${nextModuleId}`);
    router.refresh();
  }

  const sourceModule = mod
    ? ROLES[mod.role_id as RoleId]?.modules.find((item) => item.id === mod.id) ?? null
    : null;
  const extraSkillSlug = sourceModule?.skills?.find(Boolean) ?? null;
  const handleSaveExtraLesson = useCallback(async () => {
    if (!mod || !extraSkillSlug) return;
    setSaveError("");
    setSavingExtraLesson(true);
    try {
      await saveEmployeeExtraLesson({
        moduleId: mod.id,
        skillSlug: extraSkillSlug,
        sourceRoleId: mod.role_id as RoleId,
        enrolledAt: new Date().toISOString(),
      });
      const nextLessons = await getEmployeeExtraLessons();
      setExtraLessons(nextLessons.map((lesson) => ({ moduleId: lesson.moduleId })));
    } catch (err) {
      console.warn("[lesson] Không lưu được Kỹ năng khác:", err);
      setSaveError(
        err instanceof Error
          ? err.message
          : "Không thêm được vào Kỹ năng khác. Thử lại sau nhé.",
      );
    } finally {
      setSavingExtraLesson(false);
    }
  }, [extraSkillSlug, mod]);
  const isComplete = status === "hoan-thanh";
  const practiceScore = practiceReview?.score ?? 0;
  const passed =
    isComplete || (practiceReview ? practiceReview.score >= PRACTICE_PASS_SCORE : false);
  const unlockedSummary = passed && (reflectDone || isComplete);

  // Công cụ AI cho bài này (mục 2 + 3): tool chuyên dụng nếu bài cần, else tool chính.
  if (!hydrated) {
    return <LessonSkeleton />;
  }

  if (!mod) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Không tìm thấy bài học</h1>
        <Link href="/lo-trinh" className="mt-4 inline-block text-brand hover:underline">
          ← Về lộ trình
        </Link>
      </div>
    );
  }

  const role = getRole(mod.role_id);
  const sourceRole = ROLES[mod.role_id as RoleId] ?? null;
  const extraSkillLabel = extraSkillSlug
    ? SKILL_LABELS[extraSkillSlug] ?? extraSkillSlug
    : null;
  const isSavedAsExtraLesson = extraLessons.some(
    (item) => item.moduleId === mod.id,
  );
  const isCrossRoleLesson =
    Boolean(currentRoleId) && currentRoleId !== mod.role_id;
  const canViewLesson = !isCrossRoleLesson || isSavedAsExtraLesson;
  const showNextLessonButton = !isCrossRoleLesson && Boolean(nextModuleId);
  const canSaveAsExtraLesson =
    isCrossRoleLesson && !isSavedAsExtraLesson && Boolean(extraSkillSlug);
  const tool = getToolForModule(mod, orgAiTool);
  const isSpecialistTool = Boolean(mod.tool);

  // Prompt "hỏi sâu hơn" lấy thẳng từ starter kit của vai trò (đã có sẵn).
  const deeperPrompts = role?.starterKit.prompts ?? [];

  const journey = [
    { icon: "📥", title: "Lấy prompt", sub: "thực hành ngay", done: step1Done },
    { icon: "⚡", title: "Chạy thử", sub: "trên ChatGPT", done: step1Done },
    { icon: "📤", title: "Nộp kết quả", sub: "AI chấm điểm", done: passed },
    { icon: "💬", title: "Hỏi sâu hơn", sub: "& cảm nghĩ", done: step3Done || reflectDone },
    { icon: "🔖", title: "Ghi nhớ", sub: "vào sổ tay", done: memoSaved },
  ];

  const memos = mod.learnings.slice(0, 3);

  if (!canViewLesson) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 md:py-14">
        <Link
          href="/lo-trinh"
          className="text-sm font-medium text-brand hover:underline"
        >
          ← Về lộ trình {getRole(currentRoleId ?? "")?.shortLabel ?? role?.shortLabel ?? ""}
        </Link>
        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-soft p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
            Kỹ năng khác
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">
            {mod.title}
          </h1>
          {extraSkillLabel && sourceRole && (
            <p className="mt-2 text-xs text-ink-2">
              Kỹ năng: <b>{extraSkillLabel}</b> · Nguồn: {sourceRole.label}
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-ink-2">
            {fromExtraSuggestion
              ? "Trợ lý gợi ý bài này ngoài lộ trình chính. Thêm vào section Kỹ năng khác để bắt đầu học."
              : "Bài học này thuộc vai trò khác. Thêm vào section Kỹ năng khác để mở nội dung bài học."}
          </p>
          {canSaveAsExtraLesson ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void handleSaveExtraLesson()}
                disabled={savingExtraLesson}
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60"
              >
                {savingExtraLesson ? "Đang lưu..." : "Thêm vào Kỹ năng khác"}
              </button>
              <Link
                href="/lo-trinh"
                className="inline-flex h-10 items-center justify-center rounded-full border border-brand/30 bg-white px-4 text-sm font-semibold text-brand transition hover:bg-brand-soft"
              >
                Về lộ trình
              </Link>
            </div>
          ) : (
            <Link
              href="/lo-trinh"
              className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
            >
              Về lộ trình
            </Link>
          )}
          {saveError && (
            <p className="mt-3 text-sm text-destructive">{saveError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 md:py-14">
      <Link
        href="/lo-trinh"
        className="text-sm font-medium text-brand hover:underline"
      >
        ← Lộ trình {role?.shortLabel ?? ""}
      </Link>

      <header className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          {mod.duration_min} phút · Cấp {levelLabel(mod.level)} · Học bằng thực hành
          {isComplete && (
            <span className="ml-2 rounded-full bg-brand/15 px-2 py-0.5 text-brand">
              ✓ Hoàn thành
            </span>
          )}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
          {mod.title}
        </h1>
        <p className="mt-3 text-base text-ink-2">{mod.summary}</p>
      </header>

      {isCrossRoleLesson && (
        <div className="mt-5 rounded-2xl border border-brand/20 bg-brand-soft p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                Kỹ năng khác
              </p>
              <p className="mt-1 text-sm text-ink">
                {isSavedAsExtraLesson
                  ? "Bài này đã nằm trong section Kỹ năng khác của bạn."
                  : "Bài này không thuộc lộ trình chính, nhưng có trong catalog hệ thống. Bạn có thể lưu nó để học riêng ở section Kỹ năng khác."}
              </p>
              {extraSkillLabel && sourceRole && (
                <p className="mt-1 text-xs text-ink-2">
                  Kỹ năng: <b>{extraSkillLabel}</b> · Nguồn: {sourceRole.label}
                </p>
              )}
            </div>
            {canSaveAsExtraLesson && (
              <button
                type="button"
                onClick={() => void handleSaveExtraLesson()}
                disabled={savingExtraLesson}
                className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60"
              >
                {savingExtraLesson ? "Đang lưu..." : "Thêm vào Kỹ năng khác"}
              </button>
            )}
            {isSavedAsExtraLesson && (
              <span className="inline-flex h-10 items-center rounded-full border border-brand/20 bg-white px-4 text-sm font-semibold text-brand">
                Đã lưu
              </span>
            )}
          </div>
        </div>
      )}

      {/* Infographic: công thức prompt */}
      <p className="mt-8 text-center text-sm text-ink-2">
        Một prompt tốt được ghép từ 3 mảnh:
      </p>
      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-stretch">
        {[
          { ico: "🧑‍💼", b: "VAI TRÒ", s: `"Bạn là ${role?.shortLabel ?? "nhân viên"}…"` },
          { ico: "🏢", b: "BỐI CẢNH", s: "…tại doanh nghiệp 50 người" },
          { ico: "🎯", b: "YÊU CẦU", s: "việc cụ thể cần làm" },
        ].map((chip, i) => (
          <div key={chip.b} className="contents">
            <div className="flex-1 rounded-2xl border border-line bg-card p-4 text-center shadow-sm">
              <span className="block text-xl">{chip.ico}</span>
              <b className="mt-1 block font-display text-xs tracking-tight text-ink">
                {chip.b}
              </b>
              <span className="text-xs text-ink-2">{chip.s}</span>
            </div>
            <div className="self-center text-center text-lg font-bold text-accent sm:py-0">
              {i < 2 ? "+" : "="}
            </div>
          </div>
        ))}
        <div className="flex-1 rounded-2xl bg-brand p-4 text-center text-brand-foreground shadow-sm">
          <span className="block text-xl">✅</span>
          <b className="mt-1 block font-display text-xs tracking-tight">
            KẾT QUẢ DÙNG ĐƯỢC
          </b>
          <span className="text-xs opacity-80">không phải chỉnh nhiều</span>
        </div>
      </div>

      {/* Journey stepper */}
      <div className="mt-8 grid grid-cols-5 gap-1 sm:gap-2">
        {journey.map((s, i) => (
          <div key={i} className="text-center">
            <div
              className={`mx-auto grid h-10 w-10 place-items-center rounded-full border-2 text-base transition ${
                s.done
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-line bg-card"
              }`}
            >
              {s.icon}
            </div>
            <p className="mt-1.5 text-[11px] font-semibold leading-tight text-ink sm:text-xs">
              {s.title}
            </p>
            <p className="hidden text-[11px] leading-tight text-ink-3 sm:block">
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-6">
        {/* BƯỚC 1 — thực hành ngay */}
        <StepCard
          num={1}
          title="Thực hành ngay — không lý thuyết"
          desc={`Mở ${tool.name} → copy prompt bên dưới, chỉnh phần trong [NGẶC] cho đúng việc của bạn → xem kết quả.`}
        >
          <ToolGuide tool={tool} isSpecialist={isSpecialistTool} />

          {mod.attached_file && (
            <a
              href={mod.attached_file.path}
              download
              className="mb-4 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand-soft p-3 transition hover:border-brand"
            >
              <span className="text-2xl" aria-hidden="true">
                📎
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  Tải file mẫu: {mod.attached_file.name}
                </span>
                <span className="block text-xs text-ink-2">
                  {mod.attached_file.desc}
                </span>
              </span>
            </a>
          )}

          {mod.practice_prompt ? (
            <PromptBlock
              label="Prompt thực hành chính"
              prompt={mod.practice_prompt}
              why={`Prompt này hoạt động tốt với mọi công cụ AI. Kết quả tốt nhất khi dùng ${tool.name}.`}
              copiedKey={copiedKey}
              myKey="main"
              onCopy={handleCopy}
            />
          ) : (
            <p className="text-sm text-ink-2">{mod.summary}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "🔒 Dùng dữ liệu mẫu / ẩn danh",
              "🚫 Không dán số liệu thật của công ty",
              "🔍 Luôn đối chiếu số gốc trước khi dùng",
            ].map((t) => (
              <span
                key={t}
                className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink-2"
              >
                {t}
              </span>
            ))}
          </div>
        </StepCard>

        {/* BƯỚC 2 — nộp bài AI chấm (tái dùng tính năng chấm điểm thật) */}
        <StepCard
          num={2}
          title="Nộp kết quả — AI chấm ngay"
          desc={`Dán câu trả lời của ${tool.name} và/hoặc chụp màn hình kết quả rồi nộp. Đạt từ ${PRACTICE_PASS_SCORE} điểm thì bài được đánh dấu hoàn thành và mở khóa các bước sau.`}
          highlight
        >
          <ModulePracticeReview
            moduleId={moduleId}
            moduleTitle={mod.title}
            isComplete={isComplete}
            onReviewed={handleReviewed}
          />
        </StepCard>

        {/* BƯỚC 3 — hỏi sâu hơn */}
        <StepCard
          num={3}
          title="Hỏi sâu hơn — học cách đặt câu hỏi"
          desc="Bộ prompt nâng cao đúng nghề của bạn. Mỗi prompt là một kiểu hỏi dùng được hằng ngày."
          locked={!passed}
        >
          {deeperPrompts.length > 0 ? (
            deeperPrompts.map((p, i) => (
              <PromptBlock
                key={p.title}
                label={`Prompt #${i + 1} — ${p.title}`}
                prompt={p.prompt}
                copiedKey={copiedKey}
                myKey={`deep-${i}`}
                onCopy={handleCopy}
              />
            ))
          ) : (
            <p className="text-sm text-ink-2">
              Áp dụng lại prompt chính ở Bước 1 vào một tình huống thật khác của
              bạn.
            </p>
          )}
        </StepCard>

        {/* BƯỚC 4 — Aha Moment: 3 ô + AI hỏi lại 1 câu + chọn phạm vi chia sẻ */}
        <StepCard
          num={4}
          title="Khoảnh khắc &quot;à há&quot; của bạn"
          desc="3 câu ngắn ~20 giây. Không bắt buộc — có thể bỏ qua bất cứ lúc nào."
          locked={!passed}
        >
          <AhaReflection moduleId={moduleId} onDone={() => setReflectDone(true)} />
        </StepCard>

        {/* BƯỚC 5 — tóm tắt & ghi nhớ */}
        <StepCard
          num={5}
          title="Tóm tắt & điểm cần nhớ"
          desc="3 điều mang theo sau bài học này."
          locked={!unlockedSummary}
          highlight
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {memos.map((m) => (
              <div
                key={m}
                className="rounded-xl border border-line bg-card p-4 text-center"
              >
                <span className="block text-xl">📌</span>
                <span className="mt-2 block text-sm text-ink">{m}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-line bg-card p-4 text-center text-sm text-ink-2">
            🔒 Luôn ẩn danh dữ liệu nhạy cảm (tên khách, số tài khoản, hợp đồng)
            trước khi đưa lên công cụ AI công cộng.
          </div>
          <button
            type="button"
            disabled={memoSaved}
            onClick={() => {
              setMemoSaved(true);
              void trackEvent("lesson_memo_saved", { moduleId });
            }}
            className="mt-4 inline-flex items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60"
          >
            {memoSaved ? "✓ Đã lưu vào sổ tay" : "🔖 Lưu vào sổ tay của tôi"}
          </button>
        </StepCard>
      </div>

      {saveError && (
        <p className="mt-6 text-sm font-medium text-red-600" role="alert">
          {saveError}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/lo-trinh")}
          className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-line bg-card px-6 py-3 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          Về lộ trình
        </button>

        {showNextLessonButton && (
          <button
            type="button"
            onClick={goNextLesson}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Bài tiếp theo →
          </button>
        )}
      </div>

      {practiceReview &&
        !canAutoCompletePractice(
          practiceReview.score,
          practiceReview.grading?.reviewStatus,
        ) &&
        practiceReview.grading?.reviewStatus === "manager-review" && (
          <p className="mt-3 text-center text-sm text-ink-2">
            Bạn đạt {practiceReview.score} điểm (AI) — đang chờ quản lý xác nhận
            trước khi ghi nhận hoàn thành.
          </p>
        )}

      {practiceReview &&
        practiceReview.score < PRACTICE_PASS_SCORE &&
        practiceReview.grading?.reviewStatus !== "manager-review" && (
        <p className="mt-3 text-center text-sm text-ink-2">
          Bạn đạt {practiceScore} điểm — cần từ {PRACTICE_PASS_SCORE} điểm để
          hệ thống đánh dấu hoàn thành. Bạn vẫn có thể sang bài tiếp theo và
          nộp lại sau.
        </p>
      )}

      {isComplete && showNextLessonButton && (
        <p className="mt-3 text-center text-sm text-ink-2">
          Bài đã hoàn thành — tiếp tục với{" "}
          <span className="font-semibold text-brand">bài tiếp theo</span>.
        </p>
      )}
    </div>
  );
}
