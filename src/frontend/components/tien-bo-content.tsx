"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchModules,
  fetchQuizSummary,
  trackEvent,
  isSupabaseBackend,
  type QuizResultItem,
  type TimeLogItem,
} from "@/lib/client-api";
import {
  addDemoTimeLog,
  getDemoProfile,
  getDemoProgress,
  getDemoQuizResults,
  getDemoTimeLogs,
  type DemoQuizResult,
  type DemoTimeLog,
} from "@/lib/demo-storage";
import { getLearningModulesByRole } from "@/lib/learning-modules-data";
import { getModulesForUser, getRole } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { TienBoPageSkeleton } from "@/components/skeletons/page-skeletons";
import {
  addEmployeeTimeLog,
  getEmployeeProfile,
  getEmployeeProgress,
  getEmployeeTimeLogs,
} from "@/lib/supabase/employee";

const QUICK_HOURS = [0.5, 1, 2, 4];

export function TienBoContent() {
  const [profile, setProfile] = useState<ReturnType<typeof getDemoProfile>>(null);
  const [logs, setLogs] = useState<(DemoTimeLog | TimeLogItem)[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [percentComplete, setPercentComplete] = useState(0);
  const [quizResults, setQuizResults] = useState<
    (DemoQuizResult | QuizResultItem)[]
  >([]);
  const [bestQuizScore, setBestQuizScore] = useState(0);
  const [usefulness, setUsefulness] = useState(8);
  const [hydrated, setHydrated] = useState(false);
  const [justLogged, setJustLogged] = useState(false);
  const [logging, setLogging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function refresh() {
    setErrorMessage("");
    try {
      const supabaseReady = isSupabaseConfigured();
      const p = supabaseReady ? await getEmployeeProfile() : getDemoProfile();
      const nextLogs = supabaseReady
        ? await getEmployeeTimeLogs()
        : getDemoTimeLogs();

      let nextQuizResults: (DemoQuizResult | QuizResultItem)[] = [];
      let nextAvgScore = 0;
      let nextBestScore = 0;

      if (supabaseReady) {
        try {
          const quizRes = await fetchQuizSummary();
          nextQuizResults = quizRes.results ?? [];
          nextAvgScore = quizRes.averageScore ?? 0;
          nextBestScore = quizRes.bestScore ?? 0;
        } catch {
          nextQuizResults = [];
        }
      } else {
        nextQuizResults = getDemoQuizResults();
        nextAvgScore =
          nextQuizResults.length === 0
            ? 0
            : Math.round(
                nextQuizResults.reduce((sum, r) => sum + r.score, 0) /
                  nextQuizResults.length,
              );
        nextBestScore =
          nextQuizResults.length > 0
            ? Math.max(...nextQuizResults.map((r) => r.score))
            : 0;
      }

      const progress = supabaseReady
        ? await getEmployeeProgress()
        : getDemoProgress();

      setProfile(p);
      setLogs(nextLogs);
      setTotalHours(nextLogs.reduce((sum, log) => sum + log.hoursSaved, 0));
      setQuizResults(nextQuizResults);
      setAvgScore(nextAvgScore);
      setBestQuizScore(nextBestScore);

      if (p) {
        const aiLevel = p.assessment?.aiLevel ?? 0;
        let modules = supabaseReady
          ? getLearningModulesByRole(p.roleId, aiLevel)
          : getModulesForUser(p.roleId, aiLevel);
        if (supabaseReady) {
          try {
            const modRes = await fetchModules(p.roleId, aiLevel);
            modules = modRes.modules;
          } catch {
            // fallback static
          }
        }
        const completed = modules.filter(
          (m) => progress[m.id] === "hoan-thanh",
        ).length;
        const pct = modules.length > 0 ? (completed / modules.length) * 100 : 0;
        setPercentComplete(Math.round(pct));
      } else {
        setPercentComplete(0);
      }
    } catch (err) {
      console.warn("[tien-bo] Không đọc được dữ liệu Supabase:", err);
      setErrorMessage("Chưa đọc được dữ liệu Supabase. Vui lòng tải lại.");
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      await refresh();
      if (!cancelled) setHydrated(true);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return <TienBoPageSkeleton />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">
          Hoàn thành onboarding trước
        </h1>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-base font-semibold text-brand-foreground transition hover:bg-brand-2"
        >
          Vào onboarding →
        </Link>
      </div>
    );
  }

  const role = getRole(profile.roleId);

  async function logHours(hours: number) {
    if (logging) return;
    setLogging(true);
    setErrorMessage("");
    try {
      if (isSupabaseConfigured()) {
        await addEmployeeTimeLog(hours, usefulness);
        if (isSupabaseBackend()) {
          void trackEvent("journal_logged", { hoursSaved: hours, usefulness });
        }
      } else {
        addDemoTimeLog(hours, usefulness);
      }
      setJustLogged(true);
      await refresh();
      setTimeout(() => setJustLogged(false), 2000);
    } catch (err) {
      console.warn("[tien-bo] Không lưu được nhật ký Supabase:", err);
      setErrorMessage("Chưa lưu được nhật ký. Vui lòng thử lại.");
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 md:py-14">
      <div className="mb-2">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Tiến bộ cá nhân · {role?.shortLabel}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
          Bằng chứng AI giúp anh/chị
        </h1>
      </div>
      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}

      <div className="relative mt-6 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-5 text-brand-foreground shadow-lg sm:rounded-3xl sm:p-7 md:p-9">
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Tổng giờ AI tiết kiệm
          </p>
          <p className="mt-2 font-display text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            {totalHours.toFixed(1)}
            <span className="ml-2 text-2xl font-medium text-brand-foreground/70 sm:text-3xl">
              giờ
            </span>
          </p>
          <p className="mt-2 text-sm text-brand-foreground/80">
            {logs.length === 0
              ? "Ghi nhật ký lần đầu bên dưới để bắt đầu đếm."
              : `Từ ${logs.length} lần ghi nhật ký. Trung bình ${(totalHours / Math.max(1, logs.length)).toFixed(1)}h/lần.`}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon="📚"
          label="Hoàn thành lộ trình"
          value={`${percentComplete}%`}
        />
        <StatCard
          icon="🎯"
          label="Điểm kiểm tra trung bình"
          value={quizResults.length > 0 ? `${avgScore}` : "Chưa làm"}
          suffix={quizResults.length > 0 ? "/100" : ""}
          subtext={
            quizResults.length > 0
              ? `Cao nhất ${bestQuizScore} · ${quizResults.length} lần làm`
              : undefined
          }
        />
        <StatCard
          icon="✦"
          label="Trình độ AI"
          value={`${profile.assessment?.aiLevel ?? 0}/5`}
          subtext={profile.assessment?.levelLabel ?? "—"}
        />
      </div>

      <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">
          Hôm nay AI giúp anh/chị tiết kiệm bao nhiêu giờ?
        </h2>
        <p className="mt-1 text-sm text-ink-2">
          Bấm 1 chip — em tự ghi nhật ký. Cuối tháng có con số đẹp cho sếp 😉
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {QUICK_HOURS.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => logHours(h)}
              disabled={logging}
              className="inline-flex items-center gap-2 rounded-full border-2 border-brand bg-card px-5 py-2.5 text-sm font-semibold text-brand transition hover:bg-brand hover:text-brand-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              +{h}h
            </button>
          ))}
        </div>

        <div className="mt-5">
          <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
            Mức hữu ích hôm nay: {usefulness}/10
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={usefulness}
            onChange={(e) => setUsefulness(Number(e.target.value))}
            className="mt-2 w-full accent-brand"
          />
        </div>

        {justLogged && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand-soft px-4 py-3 text-sm text-brand">
            ✓ Đã ghi nhật ký. Tổng giờ tiết kiệm cập nhật ngay.
          </div>
        )}
      </div>

      {quizResults.length > 0 && (
        <div className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">
              Lịch sử bài kiểm tra MCQ
            </h2>
            <Link
              href={`/kiem-tra/${profile.roleId}`}
              className="text-sm font-semibold text-brand hover:underline"
            >
              Làm bài mới →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-line-2">
            {quizResults.slice(0, 8).map((result) => {
              const resultRole = getRole(result.roleId);
              return (
                <li
                  key={result.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        result.passed
                          ? "bg-brand/10 text-brand"
                          : "bg-accent/15 text-accent"
                      }`}
                    >
                      {result.score}/100
                    </span>
                    <span className="font-medium text-ink">
                      {resultRole?.shortLabel ?? result.roleId}
                    </span>
                    <span className="text-ink-3">
                      {result.passed ? "· Đạt" : "· Chưa đạt"}
                    </span>
                  </div>
                  <span className="text-xs text-ink-3">
                    {formatVietnameseDate(result.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">
            Nhật ký gần đây
          </h2>
          <ul className="mt-4 divide-y divide-line-2">
            {logs.slice(0, 8).map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                    +{log.hoursSaved}h
                  </span>
                  <span className="text-ink-2">
                    {formatVietnameseDate(log.loggedAt)}
                  </span>
                </div>
                {log.usefulness !== undefined && (
                  <span className="text-xs text-ink-3">
                    Hữu ích {log.usefulness}/10
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/lo-trinh"
          className="inline-flex h-12 items-center justify-center rounded-full border-2 border-line bg-card px-7 text-base font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          ← Tiếp tục học
        </Link>
        <Link
          href={`/kiem-tra/${profile.roleId}`}
          className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-7 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90"
        >
          Làm lại bài kiểm tra →
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
  subtext,
}: {
  icon: string;
  label: string;
  value: string;
  suffix?: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-xs font-medium text-ink-2 flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold text-ink">
        {value}
        {suffix && (
          <span className="ml-1 text-base font-medium text-ink-3">{suffix}</span>
        )}
      </p>
      {subtext && <p className="mt-0.5 text-xs text-ink-3">{subtext}</p>}
    </div>
  );
}

function formatVietnameseDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const diffMs = today.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 1) return "Vừa xong";
  if (diffHours < 24) return `${Math.floor(diffHours)} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
