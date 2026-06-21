"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  PRIMARY_TOOLS,
  type PrimaryAiTool,
} from "@/lib/ai-tools-config";
import {
  getDeptAiTool,
  getOrgAiTool,
  setDeptAiTool,
  setOrgAiTool,
} from "@/lib/ai-tool-helper";
import { DEPARTMENT_OPTIONS } from "@/lib/team-data";
import { isSupabaseBackend } from "@/lib/client-api";
import { ManagerWorkspaceShell } from "@/components/manager-workspace-shell";

// Trang chọn Tool AI chính của công ty (mục 3). Chỉ quản lý truy cập.
// Lưu localStorage (đồng bộ client) + PUT /api/org-settings (real mode).
export function OrgToolSettings() {
  const [selected, setSelected] = useState<PrimaryAiTool>("claude");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    // Nguồn sự thật: localStorage; real mode hydrate từ DB.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage sau mount (tránh hydration mismatch)
    setSelected(getOrgAiTool());
    if (isSupabaseBackend()) {
      void fetch("/api/org-settings")
        .then((r) => r.json())
        .then((d: { aiTool?: string }) => {
          if (d.aiTool) {
            const t = setOrgAiTool(d.aiTool);
            setSelected(t);
          }
        })
        .catch(() => {});
    }
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function choose(tool: PrimaryAiTool) {
    setSelected(tool);
    setSaving(true);
    setOrgAiTool(tool); // đồng bộ localStorage ngay
    try {
      if (isSupabaseBackend()) {
        const res = await fetch("/api/org-settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aiTool: tool }),
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: { message?: string } };
          throw new Error(d.error?.message ?? "Lỗi lưu");
        }
      }
      showToast("Đã chọn công cụ AI chính cho công ty.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Chưa lưu được.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ManagerWorkspaceShell>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Công cụ AI chính của công ty
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-2">
            Chọn 1 công cụ chính cho cả công ty dùng để soạn thảo, phân tích.
            Nhân viên sẽ thấy đúng công cụ này trong mọi bài học. Một số bài
            cần ảnh/video sẽ tự gợi ý công cụ chuyên dụng riêng.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-card px-5 py-4 shadow-sm md:min-w-64">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-3">
            Đang áp dụng
          </p>
          <p className="mt-2 text-lg font-bold text-ink">
            {PRIMARY_TOOLS.find((tool) => tool.key === selected)?.name ?? "Claude"}
          </p>
          <p className="mt-1 text-xs text-ink-3">
            {saving ? "Đang lưu thay đổi..." : "Có thể đổi lại bất cứ lúc nào"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {PRIMARY_TOOLS.map((tool) => {
          const active = selected === tool.key;
          return (
            <button
              key={tool.key}
              type="button"
              disabled={saving}
              onClick={() => void choose(tool.key as PrimaryAiTool)}
              className={`relative min-h-48 rounded-2xl border p-5 text-left shadow-sm transition disabled:opacity-60 ${
                active
                  ? "border-brand bg-brand-soft"
                  : "border-line bg-card hover:border-brand/40 hover:shadow-md"
              }`}
            >
              {tool.recommended && (
                <span className="absolute right-3 top-3 rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-brand-foreground shadow-sm">
                  Khuyên dùng
                </span>
              )}
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={tool.icon}
                  alt={tool.name}
                  width={40}
                  height={40}
                  className="rounded-xl"
                />
                <div>
                  <p className="font-display text-lg font-bold text-ink">
                    {tool.name}
                  </p>
                  <p className="text-xs text-ink-3">{tool.provider}</p>
                </div>
                {active && (
                  <CheckCircle2
                    className="ml-auto h-5 w-5 text-brand"
                    aria-hidden="true"
                  />
                )}
              </div>
              <ul className="mt-3 space-y-1">
                {tool.pros.map((p) => (
                  <li key={p} className="flex gap-2 text-sm text-ink-2">
                    <span
                      className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    {p}
                  </li>
                ))}
              </ul>
              {tool.note && (
                <p className="mt-3 rounded-lg bg-brand/10 px-3 py-1.5 text-xs text-brand">
                  {tool.note}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <DeptToolSection onToast={showToast} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg">
          {toast}
        </div>
      )}
    </ManagerWorkspaceShell>
  );
}

// Chọn tool riêng cho từng PHÒNG BAN (Phần C §1). Phòng chưa chọn → dùng tool công ty.
function DeptToolSection({ onToast }: { onToast: (m: string) => void }) {
  const [deptTools, setDeptTools] = useState<Record<string, PrimaryAiTool>>({});

  useEffect(() => {
    const map: Record<string, PrimaryAiTool> = {};
    for (const dep of DEPARTMENT_OPTIONS) {
      map[dep.id] = getDeptAiTool(dep.id);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ 1 lần từ localStorage
    setDeptTools(map);
  }, []);

  function change(deptId: string, tool: string) {
    const next = setDeptAiTool(deptId, tool);
    setDeptTools((prev) => ({ ...prev, [deptId]: next }));
    onToast("Đã đặt công cụ AI cho phòng ban.");
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <h2 className="font-display text-lg font-bold text-ink">
        Công cụ AI theo phòng ban
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Mỗi phòng có thể chọn công cụ riêng. Phòng chưa chọn sẽ dùng công cụ
        chính của công ty ở trên.
      </p>
      <p className="mt-1 text-xs text-ink-3">
        Đổi công cụ chỉ áp dụng cho các bài <b>chưa học</b>. Bài đã xong giữ
        nguyên.
      </p>
      <div className="mt-4 space-y-2">
        {DEPARTMENT_OPTIONS.map((dep) => (
          <div
            key={dep.id}
            className="flex flex-col justify-between gap-3 rounded-xl border border-line bg-bg-warm/20 px-4 py-3 sm:flex-row sm:items-center"
          >
            <span className="text-sm font-medium text-ink">{dep.label}</span>
            <select
              value={deptTools[dep.id] ?? "claude"}
              onChange={(e) => change(dep.id, e.target.value)}
              className="h-10 rounded-xl border border-line bg-card px-3 text-sm font-medium text-ink-2 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            >
              {PRIMARY_TOOLS.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
