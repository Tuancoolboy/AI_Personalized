"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  fetchAgentHealth,
  type AgentHealthCard,
  type AgentHealthReport,
} from "@/lib/client-api";

const STATUS_LABEL: Record<AgentHealthCard["status"], string> = {
  healthy: "Hoạt động tốt",
  degraded: "Cần chú ý",
  inactive: "Chưa dùng",
  unavailable: "Chưa sẵn sàng",
};

const STATUS_CLASS: Record<AgentHealthCard["status"], string> = {
  healthy: "bg-brand/15 text-brand",
  degraded: "bg-accent/15 text-accent",
  inactive: "bg-secondary text-ink-3",
  unavailable: "bg-destructive/10 text-destructive",
};

const MODE_LABEL: Record<AgentHealthCard["runtimeMode"], string> = {
  live: "Live",
  partial: "Một phần",
  demo: "Demo",
};

function AgentHealthCardView({ agent }: { agent: AgentHealthCard }) {
  return (
    <article className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            {agent.subtitle}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-ink">
            {agent.label}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_CLASS[agent.status]}`}
          >
            {STATUS_LABEL[agent.status]}
          </span>
          <span className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink-2">
            {MODE_LABEL[agent.runtimeMode]}
          </span>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        {agent.metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-line/70 bg-secondary/30 px-3 py-2.5"
          >
            <dt className="text-xs font-medium text-ink-3">{metric.label}</dt>
            <dd className="mt-0.5 font-display text-lg font-bold text-ink">
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-3">
        <span>7 ngày: {agent.callsLast7Days} lượt</span>
        <span>30 ngày: {agent.callsLast30Days} lượt</span>
      </div>

      {agent.issues.length > 0 && (
        <ul className="mt-4 space-y-1 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-ink-2">
          {agent.issues.map((issue) => (
            <li key={issue} className="flex gap-2">
              <span className="text-accent">•</span>
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {agent.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex h-9 items-center rounded-full border border-line px-4 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </article>
  );
}

export function ManagerAgentHealth() {
  const [report, setReport] = useState<AgentHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const next = await fetchAgentHealth();
      setReport(next);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Không tải được báo cáo agent.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchAgentHealth();
        if (!cancelled) setReport(next);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Không tải được báo cáo agent.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
            Giám sát AI
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Trạng thái 4 agent
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Theo dõi agent đang chạy live/demo, lượt gọi và cảnh báo theo tổ
            chức {report?.organizationName ?? "…"}.
          </p>
          {report?.message && (
            <p className="mt-1 text-xs font-medium text-ink-3">{report.message}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void loadReport(true)}
          disabled={loading}
          className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand disabled:opacity-50"
        >
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
      </div>

      {report && (
        <div className="mt-6 grid gap-3 rounded-2xl border border-line bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlatformChip
            label="Supabase"
            ok={report.platform.supabaseConfigured}
          />
          <PlatformChip
            label="OpenAI"
            ok={report.platform.openaiConfigured}
            detail={report.platform.openaiModel}
          />
          <PlatformChip
            label="Dữ liệu"
            ok={report.persisted}
            detail={report.persisted ? "Theo org" : "Demo"}
          />
          <PlatformChip
            label="Rate chat"
            ok
            detail={`${report.platform.rateLimitPerDay}/ngày`}
          />
        </div>
      )}

      {error && (
        <p
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && !report ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl bg-secondary"
            />
          ))}
        </div>
      ) : (
        report && (
          <>
            <p className="mt-6 text-xs text-ink-3">
              Cập nhật lúc{" "}
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(report.generatedAt))}
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {report.agents.map((agent) => (
                <AgentHealthCardView key={agent.id} agent={agent} />
              ))}
            </div>
          </>
        )
      )}

      <p className="mt-8 rounded-xl border border-line bg-secondary/30 px-4 py-3 text-xs text-ink-3">
        Chạy smoke test CLI:{" "}
        <code className="rounded bg-card px-1.5 py-0.5">
          npm run test:api:agents
        </code>{" "}
        — kiểm tra endpoint 4 agent và in báo cáo JSON.
      </p>
    </div>
  );
}

function PlatformChip({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-line/70 bg-card px-3 py-2.5">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p
        className={`mt-0.5 text-sm font-bold ${ok ? "text-brand" : "text-destructive"}`}
      >
        {ok ? "Sẵn sàng" : "Thiếu cấu hình"}
      </p>
      {detail && <p className="mt-0.5 text-xs text-ink-3">{detail}</p>}
    </div>
  );
}
