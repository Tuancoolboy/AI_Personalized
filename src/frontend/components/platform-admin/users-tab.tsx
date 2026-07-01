"use client";

import { Archive, KeyRound, RefreshCw, Search, X } from "lucide-react";
import type { PlatformAdminConsoleVM } from "@/hooks/use-platform-admin-console";
import { EmptyState, PanelCard, Td, Th, formatDate } from "@/components/platform-admin/platform-admin-console-ui";

const WORK_ROLE_OPTIONS = [
  { value: "kinh-doanh", label: "Kinh doanh" },
  { value: "ke-toan", label: "Kế toán" },
  { value: "marketing", label: "Marketing" },
  { value: "van-hanh", label: "Vận hành" },
  { value: "nhan-su", label: "Nhân sự" },
  { value: "khac", label: "Khác (Văn phòng)" },
] as const;

const AI_LEVEL_OPTIONS = Array.from({ length: 6 }, (_, level) => ({
  value: level,
  label: `Level ${level}`,
}));

export function UsersTab({ vm }: { vm: PlatformAdminConsoleVM }) {
  const report = vm.report;
  if (!report) return null;
  const selectedUserSet = new Set(vm.selectedUserIds);
  const visibleUserIds = vm.filteredUsers.map((user) => user.id);
  const allVisibleSelected =
    visibleUserIds.length > 0 &&
    visibleUserIds.every((userId) => selectedUserSet.has(userId));
  const pendingSelectedIds = vm.filteredUsers
    .filter((user) => selectedUserSet.has(user.id) && !user.learningActivated)
    .map((user) => user.id);
  const activatedNonAdminIds = report.users
    .filter((user) => user.learningActivated && !user.platformAdmin)
    .map((user) => user.id);

  return (
    <section className="mt-6 space-y-4">
      <PanelCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-line bg-secondary/20 px-3 py-2">
            <Search className="h-4 w-4 text-ink-3" />
            <input
              aria-label="Tìm người dùng"
              value={vm.userQuery}
              onChange={(event) => vm.setUserQuery(event.target.value)}
              placeholder="Tìm tên, email, phòng ban, số điện thoại"
              className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3"
            />
          </div>
          <select
            aria-label="Lọc người dùng theo vai trò"
            value={vm.userRoleFilter}
            onChange={(event) => vm.setUserRoleFilter(event.target.value as typeof vm.userRoleFilter)}
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="platform-admin">platform-admin</option>
            <option value="manager">manager</option>
            <option value="employee">employee</option>
          </select>
          <select
            aria-label="Lọc người dùng theo loại tài khoản"
            value={vm.userAccountFilter}
            onChange={(event) =>
              vm.setUserAccountFilter(event.target.value as typeof vm.userAccountFilter)
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả loại tài khoản</option>
            <option value="company">company</option>
            <option value="individual">individual</option>
          </select>
          <select
            aria-label="Lọc người dùng theo trạng thái kích hoạt"
            value={vm.userActivationFilter}
            onChange={(event) =>
              vm.setUserActivationFilter(event.target.value as typeof vm.userActivationFilter)
            }
            className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="activated">Đã kích hoạt</option>
            <option value="pending">Chờ kích hoạt</option>
          </select>
          {vm.selectedUserIds.length > 0 ? (
            <button
              type="button"
              disabled={!vm.canMutate || pendingSelectedIds.length === 0}
              onClick={() =>
                vm.confirmAction({
                  title: "Kích hoạt hàng loạt",
                  description: `Xác nhận kích hoạt ${pendingSelectedIds.length} nhân viên chưa kích hoạt trong số ${vm.selectedUserIds.length} đã chọn? Hệ thống sẽ gửi email thông báo cho các tài khoản pending.`,
                  confirmLabel: "Kích hoạt đã chọn",
                  onConfirm: () =>
                    vm.runAction("bulk-activate", "bulk-set-activation", {
                      userIds: pendingSelectedIds,
                      activated: true,
                    }),
                })
              }
              className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand hover:border-brand disabled:opacity-60"
            >
              Kích hoạt đã chọn
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold">
                {vm.selectedUserIds.length}
              </span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={!vm.canMutate || activatedNonAdminIds.length === 0}
            onClick={() =>
              vm.confirmAction({
                title: "Huỷ kích hoạt toàn bộ nhân viên",
                description: `Xác nhận huỷ kích hoạt ${activatedNonAdminIds.length} người dùng đang active? Platform admin sẽ được bỏ qua.`,
                confirmLabel: "Huỷ kích hoạt all",
                tone: "destructive",
                onConfirm: () =>
                  vm.runAction("bulk-deactivate-non-admin", "bulk-set-activation", {
                    userIds: activatedNonAdminIds,
                    activated: false,
                    excludePlatformAdmins: true,
                  }),
              })
            }
            className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive hover:border-destructive/40 disabled:opacity-60"
          >
            Huỷ kích hoạt all
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold">
              {activatedNonAdminIds.length}
            </span>
          </button>
          {(vm.userQuery ||
            vm.userRoleFilter !== "all" ||
            vm.userAccountFilter !== "all" ||
            vm.userActivationFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                vm.setUserQuery("");
                vm.setUserRoleFilter("all");
                vm.setUserAccountFilter("all");
                vm.setUserActivationFilter("all");
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
          <table className="min-w-[1960px] w-full text-left text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wide text-ink-3">
              <tr>
                <Th>
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả người dùng đang hiển thị"
                    checked={allVisibleSelected}
                    onChange={(event) =>
                      vm.setSelectedUserIds(event.target.checked ? visibleUserIds : [])
                    }
                    disabled={!vm.canMutate || visibleUserIds.length === 0}
                    className="h-4 w-4 rounded border-line text-brand focus:ring-brand disabled:opacity-60"
                  />
                </Th>
                <Th>Họ tên</Th>
                <Th>Email</Th>
                <Th>Loại</Th>
                <Th>Tổ chức</Th>
                <Th>Trình độ AI</Th>
                <Th>Kích hoạt</Th>
                <Th>Vai trò</Th>
                <Th>SĐT</Th>
                <Th>Admin</Th>
                <Th>Hoạt động</Th>
                <Th>Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {vm.filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-6">
                    <EmptyState
                      title="Không có user nào khớp bộ lọc."
                      description="Thử xóa bớt điều kiện tìm kiếm để mở rộng tập kết quả."
                    />
                  </td>
                </tr>
              ) : (
                vm.filteredUsers.map((user) => {
                  const draft = vm.drafts.userDrafts[user.id] ?? {
                    fullName: user.fullName,
                    phoneNumber: user.phoneNumber ?? "",
                    roleId: user.roleId ?? "",
                    aiLevel: user.aiLevel ?? 0,
                    accountType: user.accountType,
                    organizationId: user.organizationId ?? "",
                    memberRole: user.memberRole ?? "",
                    departmentId: user.departmentId ?? "",
                    platformAdmin: user.platformAdmin,
                  };
                  return (
                    <tr key={user.id} className="border-t border-line align-top">
                      <Td>
                        <input
                          type="checkbox"
                          aria-label={`Chọn ${user.email}`}
                          checked={selectedUserSet.has(user.id)}
                          onChange={() => vm.toggleUserSelection(user.id)}
                          disabled={!vm.canMutate}
                          className="mt-2 h-4 w-4 rounded border-line text-brand focus:ring-brand disabled:opacity-60"
                        />
                      </Td>
                      <Td>
                        <input
                          aria-label={`Họ tên của ${user.email}`}
                          value={draft.fullName}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              userDrafts: {
                                ...current.userDrafts,
                                [user.id]: { ...draft, fullName: event.target.value },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        />
                      </Td>
                      <Td className="text-ink-2">{user.email}</Td>
                      <Td>
                        <select
                          aria-label={`Loại tài khoản của ${user.email}`}
                          value={draft.accountType}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              userDrafts: {
                                ...current.userDrafts,
                                [user.id]: {
                                  ...draft,
                                  accountType: event.target.value as typeof draft.accountType,
                                },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        >
                          <option value="company">company</option>
                          <option value="individual">individual</option>
                        </select>
                      </Td>
                      <Td className="text-ink-2">{user.organizationName ?? "—"}</Td>
                      <Td>
                        <select
                          aria-label={`Trình độ AI của ${user.email}`}
                          value={draft.aiLevel}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              userDrafts: {
                                ...current.userDrafts,
                                [user.id]: {
                                  ...draft,
                                  aiLevel: Number(event.target.value),
                                },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="w-full min-w-[112px] rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        >
                          {AI_LEVEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Td>
                      <Td>
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            user.learningActivated
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-amber-200 bg-amber-50 text-amber-700",
                          ].join(" ")}
                        >
                          {user.learningActivated ? "Đã kích hoạt" : "Chờ kích hoạt"}
                        </span>
                        <p className="mt-2 text-xs text-ink-3">
                          {user.learningActivated
                            ? `Kích hoạt lúc: ${formatDate(user.learningActivatedAt)}`
                            : "Chưa mở quyền học"}
                        </p>
                      </Td>
                      <Td>
                        <div className="space-y-2">
                          <select
                            aria-label={`Vai trò công việc của ${user.email}`}
                            value={draft.roleId}
                            onChange={(event) =>
                              vm.setDrafts((current) => ({
                                ...current,
                                userDrafts: {
                                  ...current.userDrafts,
                                  [user.id]: {
                                    ...draft,
                                    roleId: event.target.value,
                                  },
                                },
                              }))
                            }
                            disabled={!vm.canMutate}
                            className="w-full min-w-[180px] rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                          >
                            <option value="">Chưa chọn</option>
                            {WORK_ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label={`Vai trò tổ chức của ${user.email}`}
                            value={draft.memberRole}
                            onChange={(event) =>
                              vm.setDrafts((current) => ({
                                ...current,
                                userDrafts: {
                                  ...current.userDrafts,
                                  [user.id]: {
                                    ...draft,
                                    memberRole: event.target.value as typeof draft.memberRole,
                                  },
                                },
                              }))
                            }
                            disabled={!vm.canMutate}
                            className="w-full min-w-[180px] rounded-xl border border-line bg-card px-3 py-2 text-xs text-ink outline-none focus:border-brand disabled:opacity-60"
                          >
                            <option value="">— Vai trò tổ chức —</option>
                            <option value="owner">owner</option>
                            <option value="manager">manager</option>
                            <option value="employee">employee</option>
                          </select>
                        </div>
                      </Td>
                      <Td>
                        <input
                          aria-label={`Số điện thoại của ${user.email}`}
                          value={draft.phoneNumber}
                          onChange={(event) =>
                            vm.setDrafts((current) => ({
                              ...current,
                              userDrafts: {
                                ...current.userDrafts,
                                [user.id]: { ...draft, phoneNumber: event.target.value },
                              },
                            }))
                          }
                          disabled={!vm.canMutate}
                          className="w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand disabled:opacity-60"
                        />
                      </Td>
                      <Td>
                        <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink-2">
                          <input
                            type="checkbox"
                            aria-label={`Quyền super-admin của ${user.email}`}
                            checked={draft.platformAdmin}
                            onChange={(event) =>
                              vm.setDrafts((current) => ({
                                ...current,
                                userDrafts: {
                                  ...current.userDrafts,
                                  [user.id]: { ...draft, platformAdmin: event.target.checked },
                                },
                              }))
                            }
                            disabled={!vm.canMutate}
                            className="h-4 w-4 rounded border-line text-brand focus:ring-brand disabled:opacity-60"
                          />
                          super-admin
                        </label>
                      </Td>
                      <Td className="text-ink-2">
                        <p>{formatDate(user.lastActivityAt)}</p>
                        <p className="text-xs text-ink-3">{formatDate(user.createdAt)}</p>
                      </Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `user:${user.id}`}
                            onClick={() =>
                              void vm.runAction(`user:${user.id}`, "update-user", {
                                userId: user.id,
                                fullName: draft.fullName,
                                phoneNumber: draft.phoneNumber || null,
                                roleId: draft.roleId || null,
                                aiLevel: draft.aiLevel,
                                accountType: draft.accountType,
                                organizationId: draft.organizationId || user.organizationId,
                                memberRole: draft.memberRole || null,
                                departmentId: draft.departmentId || null,
                                platformAdmin: draft.platformAdmin,
                                email: user.email,
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Lưu
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `reset:${user.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: "Xác nhận xoá dữ liệu học tập",
                                description:
                                  "Toàn bộ tiến trình học, quiz, lịch sử chat và dữ liệu liên quan của user này sẽ bị xoá.",
                                confirmLabel: "Xoá dữ liệu",
                                tone: "destructive",
                                onConfirm: () =>
                                  vm.runAction(`reset:${user.id}`, "reset-user-learning", {
                                    userId: user.id,
                                  }),
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            Xoá học tập
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `regen:${user.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: "Sinh lại lộ trình",
                                description:
                                  "Xác nhận tạo lại lộ trình mới dựa trên Trình độ và Vai trò hiện tại của nhân viên?",
                                confirmLabel: "Sinh lại lộ trình",
                                onConfirm: () =>
                                  vm.runAction(`regen:${user.id}`, "reset-user-learning", {
                                    userId: user.id,
                                    scope: "learning_recommendations",
                                  }),
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                            aria-label={`Sinh lại lộ trình cho ${user.email}`}
                            title="Sinh lại lộ trình"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `activation:${user.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: user.learningActivated
                                  ? "Huỷ kích hoạt tài khoản"
                                  : "Kích hoạt tài khoản học viên",
                                description: user.learningActivated
                                  ? "Tài khoản sẽ trở về trạng thái chờ kích hoạt và không còn vào được lộ trình học."
                                  : "Khi kích hoạt, hệ thống sẽ mở quyền học và gửi email thông báo cho nhân viên.",
                                confirmLabel: user.learningActivated ? "Huỷ kích hoạt" : "Kích hoạt",
                                tone: user.learningActivated ? "destructive" : "default",
                                onConfirm: () =>
                                  vm.runAction(`activation:${user.id}`, "set-user-activation", {
                                    userId: user.id,
                                    activated: !user.learningActivated,
                                  }),
                              })
                            }
                            className={[
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:opacity-60",
                              user.learningActivated
                                ? "border-destructive/20 bg-destructive/5 text-destructive hover:border-destructive/40"
                                : "border-brand/20 bg-brand-soft text-brand hover:border-brand",
                            ].join(" ")}
                            aria-label={
                              user.learningActivated
                                ? `Huỷ kích hoạt ${user.email}`
                                : `Kích hoạt ${user.email}`
                            }
                          >
                            {user.learningActivated ? "Huỷ kích hoạt" : "Kích hoạt"}
                          </button>
                          <button
                            type="button"
                            disabled={!vm.canMutate || vm.savingKey === `admin:${user.id}`}
                            onClick={() =>
                              vm.confirmAction({
                                title: draft.platformAdmin ? "Thu hồi quyền platform_admin" : "Cấp quyền platform_admin",
                                description:
                                  "Thao tác này sẽ thay đổi quyền truy cập cấp hệ thống và được ghi lại trong audit log.",
                                confirmLabel: draft.platformAdmin ? "Thu hồi quyền" : "Cấp quyền",
                                tone: "destructive",
                                onConfirm: () =>
                                  vm.runAction(`admin:${user.id}`, "toggle-platform-admin", {
                                    email: user.email,
                                    enabled: !draft.platformAdmin,
                                  }),
                              })
                            }
                            className="inline-flex items-center gap-2 rounded-full border border-line bg-secondary/40 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand hover:text-brand disabled:opacity-60"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            {draft.platformAdmin ? "Gỡ quyền" : "Cấp quyền"}
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
    </section>
  );
}
