"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock3,
  ListChecks,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  HocTapLeaderboardRow,
  HocTapOverviewDays,
  HocTapOverviewResponse,
} from "@/lib/hoc-tap-overview";

export function HocTapOverview({
  data,
  loading,
  error,
  days,
  onDaysChange,
  onRetry,
}: {
  data: HocTapOverviewResponse | null;
  loading: boolean;
  error: string;
  days: HocTapOverviewDays;
  onDaysChange: (days: HocTapOverviewDays) => void;
  onRetry: () => void;
}) {
  const xp = data?.xp ?? {
    totalXp: 0,
    level: 1,
    currentXp: 0,
    targetXp: 100,
    rank: null,
    periodEarned: 0,
    previousPeriodEarned: 0,
  };
  const levelPercent = Math.min(
    100,
    Math.round((xp.currentXp / xp.targetXp) * 100),
  );
  const remainingXp = Math.max(0, xp.targetXp - xp.currentXp);
  const xpDelta = xp.periodEarned - xp.previousPeriodEarned;
  const xpRows = (data?.daily ?? []).map((row) => ({
    ...row,
    label: formatDateLabel(row.date),
  }));
  const studyRows = (data?.daily ?? []).map((row) => ({
    ...row,
    label: formatDateLabel(row.date),
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-black tracking-tight text-ink">
              Tổng quan
            </h1>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-bold text-brand">
              {data?.audience.name ?? "Đang tải không gian"}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-2">
            Theo dõi XP, quiz và thời gian học từ dữ liệu tài khoản của bạn.
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-3 text-xs font-bold text-ink-2 shadow-sm focus-within:ring-2 focus-within:ring-brand">
          <CalendarDays className="size-4 text-ink-3" aria-hidden="true" />
          <span className="sr-only">Khoảng thời gian</span>
          <select
            value={days}
            onChange={(event) =>
              onDaysChange(Number(event.target.value) as HocTapOverviewDays)
            }
            className="appearance-none bg-transparent pr-4 outline-none"
          >
            <option value={7}>7 ngày qua</option>
            <option value={30}>30 ngày qua</option>
          </select>
        </label>
      </header>

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 font-bold text-white focus-visible:ring-2 focus-visible:ring-rose-700 focus-visible:ring-offset-2"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : null}

      <section aria-label="Chỉ số học tập" className="grid gap-4 md:grid-cols-3">
        <MetricCard
          icon={Sparkles}
          label="Tổng XP"
          value={`${xp.totalXp.toLocaleString("vi-VN")} XP`}
          delta={xpDelta}
          deltaSuffix=" XP"
          tone="green"
          loading={loading}
        />
        <MetricCard
          icon={ListChecks}
          label="Quiz đã làm"
          value={(data?.stats.completedQuizzes ?? 0).toLocaleString("vi-VN")}
          delta={data?.stats.quizAttempts.delta ?? 0}
          tone="purple"
          loading={loading}
        />
        <MetricCard
          icon={Clock3}
          label="Thời gian học"
          value={formatStudyMinutes(data?.stats.studyMinutes.value ?? 0)}
          delta={data?.stats.studyMinutes.delta ?? 0}
          deltaSuffix=" phút"
          tone="blue"
          loading={loading}
        />
      </section>

      <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-extrabold text-ink">Tiến độ cấp độ</h2>
          <span className="text-xs font-bold text-ink-3">{levelPercent}%</span>
        </div>
        <div className="mt-4 flex items-center gap-4 sm:gap-5">
          <span className="grid size-14 flex-none place-items-center rounded-2xl bg-brand font-display text-sm font-black text-brand-foreground shadow-sm">
            Lv.{xp.level}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ink">
              {xp.currentXp.toLocaleString("vi-VN")}{" "}
              <span className="font-semibold text-ink-3">
                / {xp.targetXp.toLocaleString("vi-VN")} XP
              </span>
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="Tiến độ cấp độ"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={levelPercent}
            >
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${levelPercent}%` }}
              />
            </div>
            <div className="mt-3 flex flex-col gap-1 text-xs font-semibold text-ink-3 sm:flex-row sm:justify-between">
              <span>
                Còn {remainingXp.toLocaleString("vi-VN")} XP để lên cấp{" "}
                {xp.level + 1}
              </span>
              <span>
                {data?.stats.moduleProgress.completed ?? 0} bài hoàn thành
                {data?.stats.moduleProgress.inProgress
                  ? ` · ${data.stats.moduleProgress.inProgress} bài đang học`
                  : ""}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 2xl:grid-cols-2">
        <ChartCard
          title="Biểu đồ XP"
          description="XP quiz được cộng theo điểm tốt nhất trong không gian hiện tại."
        >
          <div
            className="h-64 min-w-0 w-full"
            role="img"
            aria-label="Biểu đồ đường XP theo ngày"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart
                data={xpRows}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="hoc-tap-xp-fill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--brand)"
                      stopOpacity={0.24}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--brand)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line-2)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  fontSize={11}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area
                  type="monotone"
                  dataKey="xpCumulative"
                  name="XP tích lũy"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  fill="url(#hoc-tap-xp-fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <AccessibleChartSummary
            rows={xpRows.map(
              (row) => `${row.label}: ${row.xpCumulative} XP tích lũy`,
            )}
          />
        </ChartCard>

        <ChartCard
          title="Thời gian học theo ngày"
          description="Chỉ tính lúc trang bài học đang được mở và hiển thị."
        >
          <div
            className="h-64 min-w-0 w-full"
            role="img"
            aria-label="Biểu đồ cột số phút học theo ngày"
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={studyRows}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="var(--line-2)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  fontSize={11}
                  unit="m"
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value) => [
                    `${String(value)} phút`,
                    "Thời gian học",
                  ]}
                />
                <Bar
                  dataKey="studyMinutes"
                  name="Thời gian học"
                  fill="#60A5FA"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!loading && data && data.stats.studyMinutes.value === 0 ? (
            <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs text-ink-3">
              Chưa có phiên học trong khoảng này. Mở một bài trong Lộ trình để
              bắt đầu ghi nhận.
            </p>
          ) : null}
          <AccessibleChartSummary
            rows={studyRows.map(
              (row) => `${row.label}: ${row.studyMinutes} phút học`,
            )}
          />
        </ChartCard>
      </section>
    </div>
  );
}

export function HocTapOverviewLeaderboard({
  rows,
}: {
  rows: HocTapLeaderboardRow[];
}) {
  const visibleRows = rows.slice(0, 6);

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold text-ink">
            Bảng xếp hạng cá nhân
          </h2>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
            XP từ quiz đã xác thực
          </p>
        </div>
        <Link
          href="/bang-xep-hang"
          className="text-xs font-bold text-brand hover:underline focus-visible:ring-2 focus-visible:ring-brand"
        >
          Xem tất cả
        </Link>
      </div>

      {visibleRows.length > 0 ? (
        <>
          <div className="mt-5 grid grid-cols-[2rem_minmax(0,1fr)_auto] gap-2 text-[10px] font-bold uppercase tracking-wide text-ink-3">
            <span>Hạng</span>
            <span>Người dùng</span>
            <span>XP</span>
          </div>
          <ol className="mt-3 space-y-2">
            {visibleRows.map((item) => (
              <li
                key={item.userId}
                className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 text-xs ${
                  item.isCurrentUser ? "bg-orange-50" : ""
                }`}
              >
                <span className="font-black text-amber-500">{item.rank}</span>
                <span className="flex min-w-0 items-center gap-2.5 font-bold text-ink">
                  <span className="grid size-8 flex-none place-items-center rounded-full bg-brand-soft text-[10px] text-brand">
                    {getInitials(item.name)}
                  </span>
                  <span className="truncate">
                    {item.name}
                    {item.isCurrentUser ? " (Bạn)" : ""}
                  </span>
                </span>
                <span className="font-bold text-ink-2">
                  {item.totalXp.toLocaleString("vi-VN")} XP
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-line bg-secondary/40 px-4 py-6 text-center">
          <p className="text-xs font-bold text-ink">Chưa có bảng xếp hạng</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-3">
            Hoàn thành một quiz để trở thành người đầu tiên có XP.
          </p>
        </div>
      )}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaSuffix = "",
  tone,
  loading = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta: number;
  deltaSuffix?: string;
  tone: "green" | "purple" | "blue";
  loading?: boolean;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    purple: "bg-purple-50 text-purple-600",
    blue: "bg-blue-50 text-blue-600",
  } as const;

  return (
    <article className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-bold text-ink-2">
        <span className={`grid size-8 place-items-center rounded-lg ${tones[tone]}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {label}
      </div>
      {loading ? (
        <div
          className="mt-5 h-8 w-28 animate-pulse rounded-lg bg-secondary"
          aria-label="Đang tải"
        />
      ) : (
        <div className="mt-5 flex flex-wrap items-baseline gap-2">
          <strong className="font-display text-2xl font-black text-ink">
            {value}
          </strong>
          <span
            className={`text-xs font-black ${
              delta >= 0 ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta.toLocaleString("vi-VN")}
            {deltaSuffix}
          </span>
        </div>
      )}
      <p className="mt-2 text-[11px] font-medium text-ink-3">
        So với kỳ liền trước
      </p>
    </article>
  );
}

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="text-sm font-extrabold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-ink-3">{description}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function AccessibleChartSummary({ rows }: { rows: string[] }) {
  return (
    <ul className="sr-only">
      {rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  );
}

function formatDateLabel(value: string): string {
  const [, month, day] = value.split("-");
  return `${day}/${month}`;
}

function formatStudyMinutes(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const remaining = safe % 60;
  if (hours === 0) return `${remaining}m`;
  return `${hours}h ${remaining.toString().padStart(2, "0")}m`;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const initials =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`
      : value.slice(0, 2);
  return initials.toLocaleUpperCase("vi-VN");
}

const TOOLTIP_STYLE = {
  border: "1px solid var(--line)",
  borderRadius: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  fontSize: "12px",
};
