"use client";

import { useState } from "react";
import {
  DEMO_ADMIN_USERS,
  DEMO_AUDIT_ENTRIES,
  DEMO_COMPANIES,
  getDemoAdminStats,
  toolLabel,
} from "@/lib/admin-data";

// Khu Quản trị nền tảng (platform_admin) — mức XEM là chính, hợp nền read-only.
// Demo data để show ngay; real mode sẽ thay bằng API service-role (follow-up).

type Tab = "tong-quan" | "cong-ty" | "nguoi-dung" | "nhat-ky";

const TABS: { key: Tab; label: string }[] = [
  { key: "tong-quan", label: "Tổng quan" },
  { key: "cong-ty", label: "Công ty" },
  { key: "nguoi-dung", label: "Người dùng" },
  { key: "nhat-ky", label: "Nhật ký hoạt động" },
];

export function AdminConsole() {
  const [tab, setTab] = useState<Tab>("tong-quan");
  const stats = getDemoAdminStats();

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-10">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-bold text-brand-foreground">
          Super-admin
        </span>
        <span className="text-xs text-ink-3">Quản trị nền tảng · chế độ xem</span>
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        Quản trị nền tảng
      </h1>
      <p className="mt-1.5 text-sm text-ink-2">
        Giám sát toàn bộ tổ chức, người dùng và hoạt động. Mức xem (read-only) —
        khớp nền phân quyền đã đặt.
      </p>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-full bg-secondary/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-brand text-brand-foreground"
                : "text-ink-2 hover:text-brand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "tong-quan" && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon="🏢" label="Công ty" value={stats.companies} />
            <StatCard icon="👥" label="Người dùng" value={stats.users} />
            <StatCard icon="🧑‍💻" label="Tài khoản cá nhân" value={stats.individuals} />
            <StatCard icon="✅" label="Bài đã hoàn thành" value={stats.lessonsCompleted} />
          </div>
        )}

        {tab === "cong-ty" && (
          <div className="space-y-3">
            {DEMO_COMPANIES.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-bold text-ink">
                    {c.name}
                  </h2>
                  <span className="text-sm text-ink-2">
                    {c.employeeCount} nhân viên · {c.managerCount} quản lý
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Công cụ AI theo phòng
                </p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {c.deptTools.map((d) => (
                    <span
                      key={d.department}
                      className="rounded-full border border-line bg-secondary/40 px-3 py-1 text-xs text-ink-2"
                    >
                      {d.department}: <b className="text-ink">{toolLabel(d.tool)}</b>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "nguoi-dung" && (
          <div className="overflow-x-auto rounded-2xl border border-line bg-card shadow-sm">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-ink-3">
                <tr>
                  <th className="px-4 py-3">Họ tên</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Loại</th>
                  <th className="px-4 py-3">Tổ chức</th>
                  <th className="px-4 py-3">Vai trò</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ADMIN_USERS.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                    <td className="px-4 py-3 text-ink-2">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          u.type === "individual"
                            ? "bg-accent/15 text-accent"
                            : "bg-brand/15 text-brand"
                        }`}
                      >
                        {u.type === "individual" ? "Cá nhân" : "Công ty"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-2">{u.org}</td>
                    <td className="px-4 py-3 text-ink-2">
                      {u.role === "manager" ? "Quản lý" : "Nhân viên"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "nhat-ky" && (
          <ul className="space-y-2">
            {DEMO_AUDIT_ENTRIES.map((e) => (
              <li
                key={e.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-card px-4 py-3"
              >
                <span className="text-lg" aria-hidden="true">
                  📝
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    <b>{e.actor}</b> · {e.action}
                  </p>
                  <p className="text-xs text-ink-3">
                    {e.detail} · {e.at}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-8 rounded-xl border border-dashed border-line bg-secondary/20 px-4 py-3 text-xs text-ink-3">
        Đang xem dữ liệu demo. Real mode sẽ đọc từ Supabase (organizations,
        organization_members, profiles, events) qua quyền platform_admin
        read-only.
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink-3">
        {label}
      </p>
    </div>
  );
}
