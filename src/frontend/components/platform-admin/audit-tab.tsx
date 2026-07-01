"use client";

import { CheckCircle2, Search, X } from "lucide-react";
import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import { EmptyState, PanelCard } from "@/components/platform-admin/platform-admin-console-ui";

export function AuditTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;

  return (
    <section className="mt-6 space-y-4">
      <PanelCard className="p-5">
        <h2 className="font-display text-xl font-bold text-ink">Nhật ký hoạt động</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-secondary/20 p-4">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Tìm nhật ký hoạt động"
              value={vm.auditQuery}
              onChange={(event) => vm.setAuditQuery(event.target.value)}
              placeholder="Tìm actor, action, chi tiết, tổ chức"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <input
            aria-label="Lọc nhật ký theo action"
            value={vm.auditActionFilter}
            onChange={(event) => vm.setAuditActionFilter(event.target.value)}
            placeholder="Lọc action"
            className="min-w-[220px] rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-3"
          />
          {(vm.auditQuery || vm.auditActionFilter) && (
            <button
              type="button"
              onClick={() => {
                vm.setAuditQuery("");
                vm.setAuditActionFilter("");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand"
            >
              <X className="h-3.5 w-3.5" />
              Xoá lọc
            </button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {vm.filteredAudits.length === 0 ? (
            <EmptyState
              title="Chưa có bản ghi audit nào khớp bộ lọc."
              description="Mở rộng điều kiện tìm kiếm hoặc đợi hệ thống phát sinh thao tác mới."
            />
          ) : (
            vm.filteredAudits.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 rounded-xl border border-line bg-secondary/20 px-4 py-3"
              >
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">
                    {entry.actor} · {entry.action}
                  </p>
                  <p className="text-xs text-ink-2">
                    {entry.detail}
                    {entry.organizationName ? ` · ${entry.organizationName}` : ""}
                  </p>
                  <p className="text-xs text-ink-3">{entry.at}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </PanelCard>
    </section>
  );
}
