"use client";

import {
  Ban,
  Copy,
  Save,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import {
  EmptyState,
  Td,
  Th,
  MetricMini,
  PanelCard,
  chipClass,
  formatDate,
  formatNumber,
} from "@/components/platform-admin/platform-admin-console-ui";

export function OrganizationsTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;

  return (
    <section className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricMini label="Active" value={report.overview.activeOrganizations} />
        <MetricMini label="Suspended" value={report.overview.suspendedOrganizations} />
        <MetricMini label="Archived" value={report.overview.archivedOrganizations} />
        <MetricMini label="Invite links" value={report.overview.inviteLinks} />
      </div>

      <PanelCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-secondary/20 px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Tìm tổ chức"
              value={vm.organizationQuery}
              onChange={(event) => vm.setOrganizationQuery(event.target.value)}
              placeholder="Tìm công ty, slug, AI tool"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <select
            aria-label="Lọc tổ chức theo trạng thái"
            value={vm.organizationStatusFilter}
            onChange={(event) =>
              vm.setOrganizationStatusFilter(
                event.target.value as typeof vm.organizationStatusFilter,
              )
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">active</option>
            <option value="suspended">suspended</option>
            <option value="archived">archived</option>
          </select>
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-line bg-secondary/20 px-3 py-2">
            <SlidersHorizontal className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Lọc tổ chức theo công cụ AI"
              value={vm.organizationToolFilter}
              onChange={(event) => vm.setOrganizationToolFilter(event.target.value)}
              placeholder="Lọc theo AI tool"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          {(vm.organizationQuery || vm.organizationStatusFilter !== "all" || vm.organizationToolFilter) && (
            <button
              type="button"
              onClick={() => {
                vm.setOrganizationQuery("");
                vm.setOrganizationStatusFilter("all");
                vm.setOrganizationToolFilter("");
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
                <Th>Tên công ty</Th>
                <Th>Slug</Th>
                <Th>Trạng thái</Th>
                <Th>Công cụ AI</Th>
                <Th>Thành viên</Th>
                <Th>Cập nhật</Th>
                <Th>Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {vm.filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <EmptyState
                      title="Không có tổ chức nào khớp bộ lọc."
                      description="Thử bỏ bớt điều kiện tìm kiếm hoặc đổi trạng thái."
                    />
                  </td>
                </tr>
              ) : (
                vm.filteredOrganizations.map((org) => {
                  const draft = vm.drafts.orgDrafts[org.id] ?? {
                    name: org.name,
                    aiTool: org.aiTool,
                    status: org.status,
                  };
                  return (
                    <tr key={org.id} className="border-t border-line align-top">
                      <Td>
                        <input
                          aria-label={`Tên công ty ${org.name}`}
                          value={draft.name}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              orgDrafts: {
                                ...current.orgDrafts,
                                [org.id]: { ...draft, name: event.target.value },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        />
                      </Td>
                      <Td>
                        <p className="font-mono text-xs text-ink-2">{org.slug}</p>
                      </Td>
                      <Td>
                        <select
                          aria-label={`Trạng thái công ty ${org.name}`}
                          value={draft.status}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              orgDrafts: {
                                ...current.orgDrafts,
                                [org.id]: {
                                  ...draft,
                                  status: event.target.value as typeof draft.status,
                                },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        >
                          <option value="active">active</option>
                          <option value="suspended">suspended</option>
                          <option value="archived">archived</option>
                        </select>
                      </Td>
                      <Td>
                        <input
                          aria-label={`Công cụ AI của ${org.name}`}
                          value={draft.aiTool}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              orgDrafts: {
                                ...current.orgDrafts,
                                [org.id]: { ...draft, aiTool: event.target.value },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        />
                      </Td>
                      <Td className="text-ink-2">
                        <p>{formatNumber(org.memberCount)}</p>
                        <p className="text-xs text-ink-3">
                          {org.managerCount} quản lý · {org.employeeCount} nhân viên
                        </p>
                      </Td>
                      <Td className="text-ink-2">{formatDate(org.updatedAt)}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `org:${org.id}`}
                            onClick={() =>
                              void vm.runAction(`org:${org.id}`, "update-organization", {
                                organizationId: org.id,
                                name: draft.name,
                                aiTool: draft.aiTool,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Lưu
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `org-status:${org.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: "Xác nhận đổi trạng thái tổ chức",
                                description:
                                  "Thao tác này sẽ cập nhật trạng thái tổ chức ngay lập tức và ghi audit log.",
                                confirmLabel: "Xác nhận",
                                tone: "destructive",
                                onConfirm: () =>
                                  vm.runAction(`org-status:${org.id}`, "toggle-organization-status", {
                                    organizationId: org.id,
                                    status:
                                      draft.status === "active"
                                        ? "suspended"
                                        : draft.status === "suspended"
                                          ? "active"
                                          : "archived",
                                  }),
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Đổi trạng thái
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `rotate:${org.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: "Xác nhận xoay link mời",
                                description:
                                  "Link mời hiện tại của tổ chức sẽ bị thay thế. Hãy chắc chắn các bên liên quan đã được thông báo.",
                                confirmLabel: "Tạo link mới",
                                tone: "destructive",
                                onConfirm: () =>
                                  vm.runAction(`rotate:${org.id}`, "rotate-invite-link", {
                                    organizationId: org.id,
                                  }),
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Xoay link
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <PanelCard className="p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-bold text-ink">Link mời đang mở</h3>
          <span className="text-xs text-ink-3">
            {vm.filteredInviteLinks.filter((link) => link.isActive).length} link hoạt động
          </span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-secondary/20 p-4">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Tìm link mời"
              value={vm.inviteQuery}
              onChange={(event) => vm.setInviteQuery(event.target.value)}
              placeholder="Tìm tổ chức, token, người tạo"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <select
            aria-label="Lọc link mời theo trạng thái"
            value={vm.inviteStatusFilter}
            onChange={(event) =>
              vm.setInviteStatusFilter(event.target.value as typeof vm.inviteStatusFilter)
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
          {(vm.inviteQuery || vm.inviteStatusFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                vm.setInviteQuery("");
                vm.setInviteStatusFilter("all");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink-2 hover:border-brand hover:text-brand"
            >
              <X className="h-3.5 w-3.5" />
              Xoá lọc
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {vm.filteredInviteLinks.length === 0 ? (
            <div className="lg:col-span-2">
              <EmptyState
                title="Không có link mời nào khớp bộ lọc."
                description="Hiện tại chưa có invitation nào cần xử lý."
              />
            </div>
          ) : (
            vm.filteredInviteLinks.map((link) => {
              const inviteUrl = `/moi/${encodeURIComponent(link.token)}`;
              return (
                <div key={link.id} className="rounded-2xl border border-line bg-secondary/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{link.organizationName}</p>
                      <p className="text-xs text-ink-3">Cập nhật {formatDate(link.updatedAt)}</p>
                    </div>
                    <span className={chipClass(link.isActive)}>{link.isActive ? "active" : "inactive"}</span>
                  </div>
                  <p className="mt-3 break-all rounded-xl border border-dashed border-line bg-card px-3 py-2 font-mono text-xs text-ink-2">
                    {inviteUrl}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!vm.canMutate}
                      onClick={() => void vm.copyInvite(`${window.location.origin}${inviteUrl}`)}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Sao chép
                    </button>
                    <button
                      type="button"
                      disabled={!vm.canMutate || vm.savingKey === `rotate-link:${link.organizationId}`}
                      onClick={() =>
                        vm.confirmAction({
                          title: "Xác nhận tạo link mời mới",
                          description:
                            "Link mời cũ của tổ chức sẽ không còn là đường mời mới nhất sau thao tác này.",
                          confirmLabel: "Tạo link mới",
                          tone: "destructive",
                          onConfirm: () =>
                            vm.runAction(`rotate-link:${link.organizationId}`, "rotate-invite-link", {
                              organizationId: link.organizationId,
                            }),
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Tạo link mới
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PanelCard>
    </section>
  );
}
