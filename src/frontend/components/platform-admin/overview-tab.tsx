"use client";

import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardList,
  Users,
} from "lucide-react";
import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import {
  MetricCard,
  MetricMini,
  PanelCard,
} from "@/components/platform-admin/platform-admin-console-ui";

export function OverviewTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;

  return (
    <section className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Building2} label="Tổ chức" value={report.overview.organizations} />
        <MetricCard icon={Users} label="Người dùng" value={report.overview.users} />
        <MetricCard
          icon={ClipboardList}
          label="Nội dung"
          value={report.overview.totalModules + report.overview.totalPaths + report.overview.assessments}
        />
        <MetricCard icon={Activity} label="Sự kiện 30 ngày" value={report.overview.auditEvents30d} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <PanelCard className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-ink">Tổng hợp vận hành</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">
              mức quyền tối đa
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MetricMini label="Tổ chức đang hoạt động" value={report.overview.activeOrganizations} />
            <MetricMini label="Quản trị hệ thống" value={report.overview.platformAdmins} />
            <MetricMini label="Quản lý" value={report.overview.managers} />
            <MetricMini label="Nhân viên" value={report.overview.employees} />
            <MetricMini label="Bài chờ duyệt" value={report.overview.gradingQueue} />
            <MetricMini label="Link mời đang mở" value={report.overview.inviteLinks} />
          </div>
        </PanelCard>

        <PanelCard className="p-5">
          <h2 className="font-display text-xl font-bold text-ink">Cảnh báo</h2>
          <div className="mt-4 space-y-3">
            {report.alerts.length === 0 ? (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Chưa thấy cảnh báo nào nổi bật.
              </p>
            ) : (
              report.alerts.map((alert) => (
                <div
                  key={alert}
                  className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{alert}</span>
                </div>
              ))
            )}
          </div>
        </PanelCard>
      </div>
    </section>
  );
}
