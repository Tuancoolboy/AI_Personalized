"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentPathPanel } from "@/components/agent-path-panel";
import { fetchModules } from "@/lib/client-api";
import {
  getDemoProfile,
  getDemoProgress,
  type DemoProgress,
} from "@/lib/demo-storage";
import {
  getLearningModulesByRole,
  type LearningModuleRecord,
} from "@/lib/learning-modules-data";
import { getRole } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  getEmployeeProfile,
  getEmployeeProgress,
} from "@/lib/supabase/employee";

export function LoTrinhContent() {
  const [profile, setProfile] = useState<ReturnType<typeof getDemoProfile>>(null);
  const [progress, setProgress] = useState<DemoProgress>({});
  const [modules, setModules] = useState<LearningModuleRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErrorMessage("");
      try {
        let prof = getDemoProfile();
        let prog: DemoProgress = getDemoProgress();

        if (isSupabaseConfigured()) {
          const [nextProfile, nextProgress] = await Promise.all([
            getEmployeeProfile(),
            getEmployeeProgress(),
          ]);
          prof = nextProfile;
          prog = nextProgress;
        }

        if (cancelled) return;
        setProfile(prof);
        setProgress(prog);

        const aiLevel = prof?.assessment?.aiLevel ?? 0;
        if (prof?.roleId) {
          try {
            const res = await fetchModules(prof.roleId, aiLevel);
            if (!cancelled) setModules(res.modules);
          } catch {
            if (!cancelled) {
              setModules(getLearningModulesByRole(prof.roleId, aiLevel));
            }
          }
        }
      } catch (err) {
        console.warn("[lo-trinh] Không đọc được dữ liệu Supabase:", err);
        if (!cancelled) {
          setErrorMessage("Chưa đọc được dữ liệu Supabase. Vui lòng tải lại.");
          setProfile(getDemoProfile());
          setProgress(getDemoProgress());
          const p = getDemoProfile();
          if (p?.roleId) {
            setModules(
              getLearningModulesByRole(
                p.roleId,
                p.assessment?.aiLevel ?? 0,
              ),
            );
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="h-32 animate-pulse rounded-2xl bg-secondary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-ink">
          Hoàn thành onboarding trước
        </h1>
        <p className="mt-3 text-ink-2">
          Bạn cần chọn vai trò + làm bài đánh giá để có lộ trình cá nhân hóa.
        </p>
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
  if (!role) return null;
  const aiLevel = profile.assessment?.aiLevel ?? 0;
  const completedCount = modules.filter(
    (m) => progress[m.id] === "hoan-thanh",
  ).length;
  const totalCount = modules.length;
  const percentComplete =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 md:py-14">
      {errorMessage && (
        <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {errorMessage}
        </div>
      )}
      <div className="relative flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-2 p-5 text-brand-foreground shadow-md sm:gap-6 sm:rounded-3xl sm:p-7 md:p-9">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/30 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Lộ trình của anh/chị · {role.shortLabel}
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
            {completedCount === totalCount && totalCount > 0
              ? "Đã hoàn thành lộ trình 🎉"
              : completedCount === 0
                ? "Bắt đầu hành trình AI"
                : `Đã đi được ${completedCount}/${totalCount} module`}
          </h1>
          <p className="mt-2 text-sm text-brand-foreground/80">
            {aiLevel >= 5
              ? "Đã skip module cơ bản. Bắt đầu với use case nâng cao."
              : `Trình độ AI hiện tại: ${profile.assessment?.levelLabel ?? "—"}`}
          </p>
        </div>
        <div className="relative grid h-24 w-24 flex-none place-items-center sm:h-28 sm:w-28">
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
              strokeDashoffset={2 * Math.PI * 42 * (1 - percentComplete / 100)}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute text-center">
            <p className="font-display text-2xl font-bold leading-none">
              {percentComplete}%
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-brand-foreground/70">
              Hoàn thành
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <AgentPathPanel />
      </div>

      <div className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Bộ khởi đầu nhanh
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink">
              Prompt mẫu copy-dùng-ngay
            </h2>
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {role.starterKit.prompts.map((prompt) => (
            <PromptCard key={prompt.title} title={prompt.title} prompt={prompt.prompt} />
          ))}
        </div>
      </div>

      <div className="mt-10">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Công cụ AI dành cho bạn
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-ink">
          {role.starterKit.tools.length} công cụ gợi ý
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {role.starterKit.tools.map((tool) => (
            <div
              key={tool.name}
              className="rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 flex-none place-items-center rounded-xl font-display text-lg font-extrabold text-white"
                  style={{ backgroundColor: tool.color }}
                >
                  {tool.name.charAt(0)}
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-ink">
                    {tool.name}
                  </h3>
                  <p className="text-xs text-ink-2">{tool.desc}</p>
                </div>
              </div>
              <p className="mt-3 rounded-xl border border-line-2 bg-secondary/50 px-3 py-2 text-xs text-ink-2">
                <strong className="text-brand">Dùng cho:</strong> {tool.useFor}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Lộ trình {totalCount} module
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-ink sm:text-2xl">
              Học theo thứ tự — bấm mở module
            </h2>
          </div>
          <Link
            href={`/kiem-tra/${profile.roleId}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-accent-foreground transition hover:bg-accent/90 sm:w-auto"
          >
            Làm bài kiểm tra →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {modules.map((module, idx) => {
            const status = progress[module.id] ?? "chua-hoc";
            return (
              <ModuleItem
                key={module.id}
                idx={idx + 1}
                module={module}
                status={status}
              />
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function PromptCard({ title, prompt }: { title: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card p-5 shadow-sm transition hover:shadow-md">
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 line-clamp-4 flex-1 text-xs text-ink-2">{prompt}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-brand bg-card px-4 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand-soft"
      >
        {copied ? "✓ Đã copy" : "📋 Copy prompt"}
      </button>
    </div>
  );
}

function ModuleItem({
  idx,
  module,
  status,
}: {
  idx: number;
  module: LearningModuleRecord;
  status: "chua-hoc" | "dang-hoc" | "hoan-thanh";
}) {
  const dotClasses =
    status === "hoan-thanh"
      ? "bg-brand border-brand text-brand-foreground"
      : status === "dang-hoc"
        ? "bg-accent border-accent text-accent-foreground animate-pulse"
        : "border-line bg-card text-ink-3";

  const statusLabel =
    status === "hoan-thanh"
      ? "Đã xong"
      : status === "dang-hoc"
        ? "Đang học"
        : "Chưa học";

  return (
    <li>
      <Link
        href={`/lo-trinh/${module.id}`}
        className="flex w-full items-center gap-4 rounded-2xl border border-line bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
      >
        <span
          className={`grid h-9 w-9 flex-none place-items-center rounded-full border-2 text-sm font-bold ${dotClasses}`}
        >
          {status === "hoan-thanh" ? "✓" : idx}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{module.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-2">
            <span>⏱ {module.duration_min} phút</span>
            <span className="text-ink-3">·</span>
            <span>
              Cấp{" "}
              {module.level === 1 ? "Nhập môn" : module.level === 2 ? "Trung cấp" : "Nâng cao"}
            </span>
            <span className="text-ink-3">·</span>
            <span
              className={
                status === "hoan-thanh"
                  ? "font-semibold text-brand"
                  : status === "dang-hoc"
                    ? "font-semibold text-accent"
                    : "text-ink-3"
              }
            >
              {statusLabel}
            </span>
          </div>
        </div>
        <span className="hidden text-ink-3 sm:inline">→</span>
      </Link>
    </li>
  );
}
