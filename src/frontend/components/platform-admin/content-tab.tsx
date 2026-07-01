"use client";

import { Save, Search, X } from "lucide-react";
import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import { EmptyState, MetricCard, PanelCard, Td, Th } from "@/components/platform-admin/platform-admin-console-ui";
import { Workflow } from "lucide-react";

export function ContentTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {report.content.map((item) => (
          <MetricCard key={item.label} icon={Workflow} label={item.label} value={item.count} />
        ))}
      </div>

      <PanelCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-secondary/20 px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Tìm nội dung"
              value={vm.contentQuery}
              onChange={(event) => vm.setContentQuery(event.target.value)}
              placeholder="Tìm tiêu đề, mã, tổ chức, phạm vi"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <select
            aria-label="Lọc nội dung theo danh mục"
            value={vm.contentCollectionFilter}
            onChange={(event) =>
              vm.setContentCollectionFilter(event.target.value as typeof vm.contentCollectionFilter)
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="learning_modules">learning_modules</option>
            <option value="training_modules">training_modules</option>
            <option value="learning_paths">learning_paths</option>
            <option value="assessments">assessments</option>
          </select>
          <select
            aria-label="Lọc nội dung theo trạng thái"
            value={vm.contentStatusFilter}
            onChange={(event) =>
              vm.setContentStatusFilter(event.target.value as typeof vm.contentStatusFilter)
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
          {(vm.contentQuery || vm.contentCollectionFilter !== "all" || vm.contentStatusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                vm.setContentQuery("");
                vm.setContentCollectionFilter("all");
                vm.setContentStatusFilter("all");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand"
            >
              <X className="h-3.5 w-3.5" />
              Xoá lọc
            </button>
          )}
        </div>
      </PanelCard>

      <PanelCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <Th>Danh mục</Th>
                <Th>Tiêu đề</Th>
                <Th>Trạng thái</Th>
                <Th>Phạm vi</Th>
                <Th>Tổ chức</Th>
                <Th>Phiên bản</Th>
                <Th>Cập nhật</Th>
                <Th>Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {vm.filteredContentItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6">
                    <EmptyState
                      title="Không có nội dung nào khớp bộ lọc."
                      description="Thử đổi danh mục hoặc trạng thái để xem thêm dữ liệu."
                    />
                  </td>
                </tr>
              ) : (
                vm.filteredContentItems.map((item) => {
                  const key = `${item.collection}:${item.id}`;
                  const draft = vm.drafts.contentDrafts[key] ?? { status: item.status };
                  return (
                    <tr key={key} className="border-t border-line align-top">
                      <Td className="font-mono text-xs text-ink-2">{item.collection}</Td>
                      <Td>
                        <div className="space-y-1">
                          <p className="font-medium text-ink">{item.title}</p>
                          <p className="text-xs text-ink-3">{item.id}</p>
                        </div>
                      </Td>
                      <Td>
                        <select
                          aria-label={`Trạng thái nội dung ${item.title}`}
                          value={draft.status}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              contentDrafts: {
                                ...current.contentDrafts,
                                [key]: { status: event.target.value },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        >
                          <option value="draft">draft</option>
                          <option value="published">published</option>
                          <option value="archived">archived</option>
                        </select>
                      </Td>
                      <Td className="text-ink-2">{item.scope ?? "—"}</Td>
                      <Td className="text-ink-2">{item.organizationName ?? "—"}</Td>
                      <Td className="text-ink-2">{item.version ?? "—"}</Td>
                      <Td className="text-ink-2">{item.updatedAt ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt)) : "Chưa có"}</Td>
                      <Td>
                        <button
                          type="button"
                          disabled={!vm.canMutate || vm.savingKey === `content:${key}`}
                          onClick={() =>
                            void vm.runAction(`content:${key}`, "set-content-status", {
                              collection: item.collection,
                              id: item.id,
                              status: draft.status,
                            })
                          }
                          className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Lưu
                        </button>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </section>
  );
}
