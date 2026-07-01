"use client";

import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import { MetricMini, PanelCard, formatNumber } from "@/components/platform-admin/platform-admin-console-ui";

export function AiUsageTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;

  return (
    <section className="mt-6 grid gap-4 xl:grid-cols-2">
      <PanelCard className="p-5">
        <h2 className="font-display text-xl font-bold text-ink">AI & sử dụng</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricMini label="OpenAI bật" value={report.platform.openaiConfigured ? 1 : 0} />
          <MetricMini label="Giới hạn/ngày" value={report.platform.rateLimitPerDay} />
          <MetricMini label="Chat 7 ngày" value={report.overview.chatUsage7d} />
          <MetricMini label="Chat 30 ngày" value={report.overview.chatUsage30d} />
          <MetricMini label="Quiz trung bình" value={report.overview.quizAvgScore} suffix="/100" />
          <MetricMini label="Giờ tiết kiệm" value={Math.round(report.overview.totalHoursSaved)} suffix="h" />
        </div>
      </PanelCard>

      <PanelCard className="p-5">
        <h2 className="font-display text-xl font-bold text-ink">Mục nổi bật</h2>
        <div className="mt-4 space-y-3 text-sm text-ink-2">
          <p>
            <strong className="text-ink">Mô hình hiện tại:</strong> {report.platform.openaiModel}
          </p>
          <p>
            <strong className="text-ink">Hệ thống có:</strong> {formatNumber(report.overview.totalModules)} module,{" "}
            {formatNumber(report.overview.totalPaths)} lộ trình, {formatNumber(report.overview.assessments)} bài đánh giá.
          </p>
          <p>
            <strong className="text-ink">Hàng đợi duyệt:</strong> {formatNumber(report.overview.gradingQueue)} bài đang chờ quản lý duyệt.
          </p>
          <p>
            <strong className="text-ink">Aha reflections:</strong> {formatNumber(report.overview.ahaReflections)} bản ghi đang có trong hệ thống.
          </p>
        </div>
      </PanelCard>
    </section>
  );
}
