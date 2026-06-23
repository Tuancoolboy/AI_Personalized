"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw, Trophy } from "lucide-react";
import { fetchHocTapOverview } from "@/lib/client-api";
import type {
  HocTapLeaderboardRow,
  HocTapOverviewResponse,
} from "@/lib/hoc-tap-overview";

type Scope = "department" | "audience" | "personal";

export function LeaderboardView() {
  const [scope, setScope] = useState<Scope>("department");
  const [data, setData] = useState<HocTapOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetchHocTapOverview(30);
        if (active) setData(response);
      } catch (loadError) {
        console.warn("[leaderboard]", loadError);
        if (active) {
          setError("Chưa tải được bảng xếp hạng. Vui lòng thử lại.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const me = data?.leaderboard.individuals.find((row) => row.isCurrentUser);
  const ranked = useMemo(() => {
    const rows = data?.leaderboard.individuals ?? [];
    if (scope !== "department" || !me) return rows;
    return rows.filter((row) => row.departmentId === me.departmentId);
  }, [data?.leaderboard.individuals, me, scope]);
  const audienceLabel =
    data?.audience.type === "company" ? "Cả công ty" : "Cộng đồng";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <Link
        href="/hoc-tap"
        className="text-sm font-medium text-brand hover:underline"
      >
        ← Về Học tập
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Bảng xếp hạng
        </h1>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
          {data?.audience.name ?? "Đang tải"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-2">
        XP được tính từ quiz đã chấm trên server và tách riêng theo không gian.
      </p>

      <div className="mt-6 flex gap-1 rounded-full bg-secondary/50 p-1">
        {(
          [
            ["department", "Phòng của bạn"],
            ["audience", audienceLabel],
            ["personal", "Cá nhân"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setScope(key)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
              scope === key
                ? "bg-brand text-brand-foreground"
                : "text-ink-2 hover:text-brand"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div
          role="alert"
          className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-700 px-4 font-bold text-white"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </button>
        </div>
      ) : null}

      {scope === "personal" ? (
        <PersonalCard data={data} me={me} loading={loading} />
      ) : (
        <LeaderboardList rows={ranked} loading={loading} />
      )}
    </div>
  );
}

function PersonalCard({
  data,
  me,
  loading,
}: {
  data: HocTapOverviewResponse | null;
  me?: HocTapLeaderboardRow;
  loading: boolean;
}) {
  if (loading) {
    return <LoadingRows />;
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label="Tổng XP" value={`${data?.xp.totalXp ?? 0} XP`} />
      <Stat
        label="Hạng hiện tại"
        value={me ? `#${me.rank}` : "Chưa xếp hạng"}
      />
      <Stat
        label="Bộ đề đã làm"
        value={`${data?.stats.completedQuizzes ?? 0}`}
      />
    </div>
  );
}

function LeaderboardList({
  rows,
  loading,
}: {
  rows: HocTapLeaderboardRow[];
  loading: boolean;
}) {
  if (loading) return <LoadingRows />;

  if (rows.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-line bg-card px-6 py-12 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <Trophy className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 font-display text-lg font-bold text-ink">
          Chưa có người xếp hạng
        </h2>
        <p className="mt-2 text-sm text-ink-3">
          Làm một quiz trong Học tập để ghi XP đầu tiên.
        </p>
      </div>
    );
  }

  return (
    <ol className="mt-4 space-y-2">
      {rows.map((row) => (
        <li
          key={row.userId}
          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
            row.isCurrentUser
              ? "border-brand bg-brand-soft"
              : "border-line bg-card"
          }`}
        >
          <span
            className={`grid size-8 flex-none place-items-center rounded-full text-sm font-bold ${
              row.rank <= 3
                ? "bg-accent text-white"
                : "bg-secondary text-ink-2"
            }`}
          >
            {row.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">
              {row.name}
              {row.isCurrentUser ? (
                <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                  Bạn
                </span>
              ) : null}
            </p>
            <p className="text-xs text-ink-3">{row.departmentLabel}</p>
          </div>
          <span className="font-display text-lg font-bold text-brand">
            {row.totalXp}
            <span className="ml-1 text-xs font-normal text-ink-3">XP</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function LoadingRows() {
  return (
    <div className="mt-4 space-y-2" aria-label="Đang tải bảng xếp hạng">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-16 animate-pulse rounded-xl border border-line bg-secondary/60"
        />
      ))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm">
      <p className="font-display text-2xl font-bold text-brand">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </p>
    </div>
  );
}
