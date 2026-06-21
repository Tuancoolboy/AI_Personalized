"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  buildLeaderboard,
  getHideName,
  getYouDepartment,
  setHideName,
  type LeaderboardRow,
} from "@/lib/demo-leaderboard";
import { DashboardFeed } from "@/components/dashboard-feed";

// Bảng xếp hạng 3 góc nhìn (Phòng / Cả công ty / Cá nhân) + bảng tuần & tổng.
// Phòng: luôn hiện tên. Cả công ty: cho phép tự ẩn tên (opt-in). Luôn hiện "Bạn".

type Scope = "department" | "company" | "personal";
type Board = "weekly" | "total";

export function LeaderboardView() {
  const all = useMemo(() => buildLeaderboard(), []);
  const myDept = getYouDepartment();
  const [scope, setScope] = useState<Scope>("department");
  const [board, setBoard] = useState<Board>("weekly");
  const [hideName, setHideNameState] = useState(false);

  // Đọc cờ ẩn tên từ localStorage sau khi mount (tránh hydration mismatch).
  useEffect(() => {
    const stored = getHideName();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage sau mount
    if (stored) setHideNameState(true);
  }, []);

  const me = all.find((r) => r.isYou);

  const ranked = useMemo(() => {
    const base =
      scope === "department" ? all.filter((r) => r.department === myDept) : all;
    return [...base].sort((a, b) =>
      board === "weekly"
        ? b.weeklyPoints - a.weeklyPoints
        : b.totalPoints - a.totalPoints,
    );
  }, [all, scope, board, myDept]);

  function toggleHide(v: boolean) {
    setHideName(v);
    setHideNameState(v);
  }

  function displayName(row: LeaderboardRow): string {
    if (row.isYou) return "Bạn";
    // Bảng cả công ty: tôn trọng opt-in ẩn tên của người khác (demo: cờ chung).
    if (scope === "company" && hideName) return "Ẩn danh";
    return row.name;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <Link href="/lo-trinh" className="text-sm font-medium text-brand hover:underline">
        ← Về lộ trình
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Bảng xếp hạng
      </h1>
      <p className="mt-1.5 text-sm text-ink-2">
        Điểm đến từ nhiều nguồn: hoàn thành bài, chia sẻ cho phòng, làm thử thách.
      </p>

      {/* Tabs góc nhìn */}
      <div className="mt-6 flex gap-1 rounded-full bg-secondary/50 p-1">
        {(
          [
            ["department", "Phòng"],
            ["company", "Cả công ty"],
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

      {scope === "personal" ? (
        <PersonalCard me={me} />
      ) : (
        <>
          {/* Bảng tuần / tổng */}
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex gap-1 rounded-full bg-secondary/50 p-1">
              {(
                [
                  ["weekly", "Bảng tuần"],
                  ["total", "Bảng tổng"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBoard(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    board === key
                      ? "bg-ink text-brand-foreground"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {scope === "company" && (
              <label className="flex items-center gap-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  checked={hideName}
                  onChange={(e) => toggleHide(e.target.checked)}
                  className="h-4 w-4 accent-brand"
                />
                Ẩn tên tôi ở bảng công ty
              </label>
            )}
          </div>

          <ol className="mt-3 space-y-2">
            {ranked.map((row, i) => (
              <li
                key={row.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                  row.isYou
                    ? "border-brand bg-brand-soft"
                    : "border-line bg-card"
                }`}
              >
                <span
                  className={`grid h-8 w-8 flex-none place-items-center rounded-full text-sm font-bold ${
                    i < 3 ? "bg-accent text-white" : "bg-secondary text-ink-2"
                  }`}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {displayName(row)}
                    {row.isYou && (
                      <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs text-brand-foreground">
                        Bạn
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-ink-3">
                    {row.department} · ⏱ {row.hoursSaved} giờ tiết kiệm
                  </p>
                </div>
                <span className="font-display text-lg font-bold text-brand">
                  {board === "weekly" ? row.weeklyPoints : row.totalPoints}
                  <span className="ml-0.5 text-xs font-normal text-ink-3">đ</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="mt-8">
        <DashboardFeed defaultScope="department" />
      </div>
    </div>
  );
}

function PersonalCard({ me }: { me?: LeaderboardRow }) {
  if (!me) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <Stat label="Điểm tuần này" value={`${me.weeklyPoints}đ`} />
      <Stat label="Điểm tích lũy" value={`${me.totalPoints}đ`} />
      <Stat label="Giờ tiết kiệm" value={`${me.hoursSaved}h`} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 text-center shadow-sm">
      <p className="font-display text-3xl font-bold text-brand">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </p>
    </div>
  );
}
