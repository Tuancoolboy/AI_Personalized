"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TableSkeleton } from "@/components/skeletons/page-skeletons";
import { fetchLeads, type LeadItem } from "@/lib/client-api";

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ManagerLeadsList() {
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchLeads();
        if (cancelled) return;
        setLeads(res.leads);
        setTotal(res.total);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Không tải được danh sách.",
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

  const sources = Array.from(new Set(leads.map((l) => l.source ?? "landing")));
  const filtered =
    filter === "all"
      ? leads
      : leads.filter((l) => (l.source ?? "landing") === filter);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Pre-launch
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Đăng ký nhận thông tin
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Email thu từ landing page ·{" "}
            {loading ? "…" : `${total} đăng ký`}
          </p>
        </div>
        <Link
          href="/quan-ly"
          className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
        >
          ← Tổng quan
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip
          active={filter === "all"}
          onClick={() => setFilter("all")}
          label={`Tất cả (${leads.length})`}
        />
        {sources.map((src) => (
          <FilterChip
            key={src}
            active={filter === src}
            onClick={() => setFilter(src)}
            label={`${src} (${leads.filter((l) => (l.source ?? "landing") === src).length})`}
          />
        ))}
      </div>

      {loading && <TableSkeleton rows={5} />}

      {error && (
        <p
          className="mt-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="mt-6 rounded-2xl border border-line bg-card p-10 text-center">
          <p className="font-display text-lg font-bold text-ink">
            Chưa có đăng ký nào
          </p>
          <p className="mt-2 text-sm text-ink-2">
            Khi khách điền form trên trang chủ, danh sách sẽ hiện ở đây.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-secondary/50 text-xs font-bold uppercase tracking-wide text-ink-3">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Nguồn</th>
                  <th className="px-4 py-3">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-line/80 last:border-0 hover:bg-brand-soft/30"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {lead.email}
                    </td>
                    <td className="px-4 py-3 text-ink-2">
                      {lead.name?.trim() || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                        {lead.source ?? "landing"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-3">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-ink-3">
        Bản sơ khai GĐ1 — chỉ tài khoản quản lý (email{" "}
        <code className="rounded bg-secondary px-1">quanly@</code>,{" "}
        <code className="rounded bg-secondary px-1">manager@</code>…) mới xem
        được. Nhân viên không truy cập API này.
      </p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-brand text-brand-foreground"
          : "border border-line bg-card text-ink-2 hover:border-brand/40"
      }`}
    >
      {label}
    </button>
  );
}
