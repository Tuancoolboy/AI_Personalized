"use client";

import { useMemo, useState } from "react";
import {
  buildFeed,
  feedKindIcon,
  getYouDepartment,
  timeAgo,
} from "@/lib/demo-leaderboard";

// Bảng tin (feed) — hiện ở cả cấp Phòng và Công ty (mục 4). Dùng trên dashboard
// và trang bảng xếp hạng. Demo lấy dữ liệu giả; real mode đọc bảng events (0005).
export function DashboardFeed({
  compact = false,
  defaultScope = "department",
}: {
  compact?: boolean;
  defaultScope?: "department" | "company";
}) {
  const all = useMemo(() => buildFeed(), []);
  const myDept = getYouDepartment();
  const [scope, setScope] = useState<"department" | "company">(defaultScope);

  const items = (
    scope === "department" ? all.filter((e) => e.department === myDept) : all
  ).slice(0, compact ? 4 : 20);

  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold text-ink">Bảng tin</h2>
        <div className="flex gap-1 rounded-full bg-secondary/50 p-1">
          {(["department", "company"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                scope === s
                  ? "bg-brand text-brand-foreground"
                  : "text-ink-2 hover:text-brand"
              }`}
            >
              {s === "department" ? "Phòng" : "Cả công ty"}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="rounded-xl border border-dashed border-line bg-secondary/30 px-3 py-4 text-center text-sm text-ink-3">
            Chưa có hoạt động nào.
          </li>
        ) : (
          items.map((e) => (
            <li
              key={e.id}
              className="flex items-start gap-3 rounded-xl border border-line bg-secondary/20 px-3 py-2.5"
            >
              <span className="text-lg" aria-hidden="true">
                {feedKindIcon(e.kind)}
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-ink">
                  <b>{e.actorName}</b> {e.text}
                </p>
                <p className="mt-0.5 text-xs text-ink-3">
                  {e.department} · {timeAgo(e.at)}
                </p>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
