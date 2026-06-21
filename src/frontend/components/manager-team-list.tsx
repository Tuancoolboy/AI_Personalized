"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Link as LinkIcon,
  ListFilter,
  Plus,
  RefreshCcw,
  Search,
  Upload,
} from "lucide-react";
import {
  createManagerInviteLink,
  fetchManagerTeam,
  fetchManagerInviteLink,
  inviteManagerTeamMember,
  isSupabaseBackend,
  rotateManagerInviteLink,
  type ManagerInviteLink,
} from "@/lib/client-api";
import {
  DEPARTMENTS,
  DEPARTMENT_OPTIONS,
  computeTeamStats,
  departmentIdToLabel,
  TEAM_MEMBERS,
  type DepartmentId,
  type TeamMember,
} from "@/lib/team-data";
import { getDemoPositions, type DemoJobPosition } from "@/lib/demo-paths";
import { TeamTable } from "@/components/manager-dashboard";
import { ManagerWorkspaceShell } from "@/components/manager-workspace-shell";
import { ManagerDirectChatModal } from "@/components/manager-direct-chat-modal";

type AddMemberPayload = {
  email: string;
  grantManagerAccess: boolean;
  departmentId: DepartmentId;
  positionId?: string;
  positionName?: string;
};

type StatusFilter = "all" | "completed" | "learning" | "pending" | "not-started";

function memberMatchesStatus(member: TeamMember, status: StatusFilter) {
  if (status === "all") return true;
  if (status === "pending") return member.invitationStatus === "pending";
  if (status === "completed") return member.completionPct === 100;
  if (status === "learning") {
    return (
      member.invitationStatus !== "pending" &&
      member.completionPct > 0 &&
      member.completionPct < 100
    );
  }
  return member.invitationStatus !== "pending" && member.completionPct === 0;
}

export function ManagerTeamList() {
  const useDemoTeam = !isSupabaseBackend();
  const [members, setMembers] = useState<TeamMember[]>(
    useDemoTeam ? TEAM_MEMBERS : [],
  );
  const [persistedTeam, setPersistedTeam] = useState(false);
  const [organizationName, setOrganizationName] = useState(
    useDemoTeam ? "Tổ chức demo" : "Tổ chức của bạn",
  );
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [teamMessage, setTeamMessage] = useState("");
  const [chatMember, setChatMember] = useState<TeamMember | null>(null);

  const stats = computeTeamStats(members);
  const activeMembers = members.filter(
    (m) => m.invitationStatus !== "pending" && m.completionPct > 0,
  ).length;
  const filtered = members.filter((member) => {
    const departmentMatches = filter === "all" || member.department === filter;
    const statusMatches = memberMatchesStatus(member, statusFilter);
    const query = searchTerm.trim().toLowerCase();
    const searchMatches =
      !query ||
      member.fullName.toLowerCase().includes(query) ||
      (member.email ?? "").toLowerCase().includes(query) ||
      (member.phoneNumber ?? "").toLowerCase().includes(query);
    return departmentMatches && statusMatches && searchMatches;
  });

  function showToast(message: string) {
    setToastMsg(message);
    setTimeout(() => setToastMsg(null), 3000);
  }

  useEffect(() => {
    void fetchManagerTeam()
      .then((res) => {
        setMembers(res.members);
        setPersistedTeam(Boolean(res.persisted));
        setOrganizationName(res.organizationName);
        setTeamMessage(res.message ?? "");
      })
      .catch(() => {
        setMembers(useDemoTeam ? TEAM_MEMBERS : []);
        setPersistedTeam(false);
        setOrganizationName(useDemoTeam ? "Tổ chức demo" : "Tổ chức của bạn");
        setTeamMessage(
          useDemoTeam
            ? "Đang dùng dữ liệu demo/local."
            : "Không tải được danh sách nhân viên thật.",
        );
      });
  }, [useDemoTeam]);

  async function addMember(payload: AddMemberPayload) {
    const res = await inviteManagerTeamMember(payload);
    // Phản chiếu phòng ban + vị trí đã gán sẵn (demo hiển thị ngay).
    const member: TeamMember = {
      ...res.member,
      department: departmentIdToLabel(payload.departmentId),
      departmentId: payload.departmentId,
    };
    setMembers((prev) => {
      const existingIndex = prev.findIndex((m) => m.id === member.id);
      if (existingIndex === -1) return [...prev, member];
      return prev.map((m, index) => (index === existingIndex ? member : m));
    });
    setPersistedTeam(Boolean(res.persisted));
    setShowModal(false);
    showToast(
      payload.positionName
        ? `${res.message} · vị trí: ${payload.positionName}`
        : res.message,
    );
  }

  return (
    <ManagerWorkspaceShell
      organizationName={organizationName}
      memberCount={members.length}
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Danh sách nhân viên
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Quản lý và theo dõi hoạt động của toàn bộ nhân viên trong{" "}
            {organizationName}.
          </p>
          <p className="mt-1 text-xs font-medium text-ink-3">
            {persistedTeam
              ? "Đang đọc danh sách theo organization_members"
              : useDemoTeam
                ? "Đang dùng dữ liệu demo/local"
                : teamMessage || "Chưa có nhân viên thật trong tổ chức"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showToast("Demo: import từ Excel sẽ có ở GĐ2.")}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-card px-5 text-sm font-semibold text-ink-2 shadow-sm transition hover:border-brand hover:text-brand"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Nhập Excel
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-2"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ManagerMetricCard
          label="Tổng nhân viên"
          value={stats.total}
          meta="Thành viên"
        />
        <ManagerMetricCard
          label="Đang hoạt động"
          value={activeMembers}
          meta={`${stats.total === 0 ? 0 : Math.round((activeMembers / stats.total) * 100)}%`}
        />
        <ManagerMetricCard
          label="Hoàn thành TB"
          value={`${stats.avgCompletion}%`}
          meta="Hiệu suất chung"
        />
      </div>

      <InviteLinkPanel
        organizationName={organizationName}
        useDemoTeam={useDemoTeam}
        onToast={showToast}
      />

      <div className="mt-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label={`Tất cả (${members.length})`}
            active={filter === "all"}
            onClick={() => setFilter("all")}
          />
          {DEPARTMENTS.map((dep) => {
            const count = members.filter((m) => m.department === dep).length;
            return (
              <FilterChip
                key={dep}
                label={`${dep} (${count})`}
                active={filter === dep}
                onClick={() => setFilter(dep)}
              />
            );
          })}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
          <label className="relative min-w-0 flex-1 xl:w-72 xl:flex-none">
            <span className="sr-only">Tìm kiếm nhân viên</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhân viên..."
              className="h-11 w-full rounded-xl border border-line bg-card pl-10 pr-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-3 focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <label className="relative sm:w-56">
            <span className="sr-only">Lọc trạng thái</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-11 w-full appearance-none rounded-xl border border-line bg-card px-4 pr-10 text-sm font-medium text-ink-2 shadow-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Hoàn thành</option>
              <option value="learning">Đang học</option>
              <option value="pending">Đã mời</option>
              <option value="not-started">Chưa bắt đầu</option>
            </select>
          </label>
          <button
            type="button"
            className="grid h-11 w-11 flex-none place-items-center rounded-xl border border-line bg-card text-ink-2 shadow-sm transition hover:border-brand hover:text-brand"
            aria-label="Tùy chọn hiển thị danh sách"
          >
            <ListFilter className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <TeamTable members={filtered} onChatMember={setChatMember} />
      </div>

      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onSubmit={addMember}
        />
      )}

      {chatMember && (
        <ManagerDirectChatModal
          key={chatMember.id}
          member={chatMember}
          onClose={() => setChatMember(null)}
        />
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-brand-foreground shadow-lg">
          ✓ {toastMsg}
        </div>
      )}
    </ManagerWorkspaceShell>
  );
}

function ManagerMetricCard({
  label,
  value,
  meta,
}: {
  label: string;
  value: string | number;
  meta: string;
}) {
  return (
    <section className="min-h-28 rounded-2xl border border-line bg-card p-5 shadow-sm">
      <p className="text-sm font-medium text-ink-2">{label}</p>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-3">{meta}</p>
    </section>
  );
}

function InviteLinkPanel({
  organizationName,
  useDemoTeam,
  onToast,
}: {
  organizationName: string;
  useDemoTeam: boolean;
  onToast: (message: string) => void;
}) {
  const [link, setLink] = useState<ManagerInviteLink | null>(null);
  const [status, setStatus] = useState<
    "loading" | "idle" | "saving" | "rotating"
  >(useDemoTeam ? "idle" : "loading");
  const [message, setMessage] = useState(
    useDemoTeam ? "Cần Supabase real mode để tạo link mời thật." : "",
  );

  useEffect(() => {
    let mounted = true;
    if (useDemoTeam) {
      return () => {
        mounted = false;
      };
    }

    void fetchManagerInviteLink()
      .then((res) => {
        if (!mounted) return;
        setLink(res.link);
        setMessage(res.message ?? "");
        setStatus("idle");
      })
      .catch((err) => {
        if (!mounted) return;
        const errorMessage =
          err instanceof Error ? err.message : "Không tải được link mời.";
        setMessage(errorMessage);
        setStatus("idle");
      });

    return () => {
      mounted = false;
    };
  }, [useDemoTeam]);

  async function handleCreate() {
    setStatus("saving");
    setMessage("");
    try {
      const res = await createManagerInviteLink();
      setLink(res.link);
      onToast(res.message);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không tạo được link mời.";
      setMessage(errorMessage);
    } finally {
      setStatus("idle");
    }
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      onToast("Đã copy link mời.");
    } catch {
      setMessage("Trình duyệt chưa cho copy tự động. Hãy chọn link và copy.");
    }
  }

  async function handleRotate() {
    if (
      link &&
      !window.confirm("Đổi token sẽ làm link mời cũ không còn hiệu lực.")
    ) {
      return;
    }

    setStatus("rotating");
    setMessage("");
    try {
      const res = await rotateManagerInviteLink();
      setLink(res.link);
      onToast(res.message);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không đổi được token mời.";
      setMessage(errorMessage);
    } finally {
      setStatus("idle");
    }
  }

  const busy = status === "loading" || status === "saving" || status === "rotating";
  const disabled = useDemoTeam || busy;

  return (
    <section
      id="link-moi"
      className="mt-6 rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-soft text-brand">
              <LinkIcon className="h-4 w-4" aria-hidden="true" />
            </span>
            <h2 className="font-display text-lg font-bold text-ink">
              Link mời
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-2">
            Gửi link này cho nhân viên để họ tự tạo tài khoản và được thêm vào{" "}
            {organizationName} với quyền nhân viên.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={disabled}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {status === "saving"
            ? "Đang tạo..."
            : link
              ? "Lấy link hiện tại"
              : "Tạo link mời"}
        </button>
      </div>

      {link ? (
        <div className="mt-4 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <input
            readOnly
            value={link.url}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 rounded-xl border-2 border-line bg-secondary/40 px-4 py-2.5 font-mono text-xs text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
            aria-label="Link mời nhân viên"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-line bg-card px-4 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
            Copy
          </button>
          <button
            type="button"
            onClick={handleRotate}
            disabled={disabled}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-line bg-card px-4 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            {status === "rotating" ? "Đang đổi..." : "Đổi token"}
          </button>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-line bg-secondary/30 px-4 py-3 text-sm text-ink-3">
          {status === "loading"
            ? "Đang kiểm tra link mời..."
            : "Chưa có link mời active cho quản lý này."}
        </p>
      )}

      {message && (
        <p className="mt-3 text-xs font-medium text-ink-3">{message}</p>
      )}
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-full border px-4 text-xs font-semibold transition ${
        active
          ? "border-brand bg-brand text-brand-foreground shadow-sm"
          : "border-line bg-card text-ink-2 shadow-sm hover:border-brand/40 hover:text-brand"
      }`}
    >
      {label}
    </button>
  );
}

function AddMemberModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (payload: AddMemberPayload) => Promise<void>;
}) {
  const positions = useMemo<DemoJobPosition[]>(() => getDemoPositions(), []);
  const [email, setEmail] = useState("");
  const [grantManagerAccess, setGrantManagerAccess] = useState(false);
  const [departmentId, setDepartmentId] = useState<DepartmentId>("van-hanh");
  const [positionId, setPositionId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Email không hợp lệ.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const position = positions.find((p) => p.id === positionId);
      await onSubmit({
        email: trimmedEmail,
        grantManagerAccess,
        departmentId,
        positionId: positionId || undefined,
        positionName: position?.name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message || "Không thêm được nhân viên. Thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-line bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-6 py-4">
          <h2 className="font-display text-xl font-bold text-ink">
            Thêm nhân viên mới
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-full border border-line text-lg text-ink-2 hover:bg-secondary"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <p className="text-sm text-ink-2">
            Nhập email tài khoản đã đăng ký. Hệ thống sẽ tự lấy hồ sơ nhân viên
            nếu tài khoản tồn tại.
          </p>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink-2">
              Email công ty
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="nhanvien@congty.vn"
              className="w-full rounded-xl border-2 border-line bg-card px-4 py-2.5 text-sm transition focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              autoFocus
            />
            {error && (
              <p className="text-xs font-medium text-destructive">{error}</p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-2">
                Phòng ban
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value as DepartmentId)}
                className="w-full rounded-xl border-2 border-line bg-card px-3 py-2.5 text-sm transition focus:border-brand focus:outline-none"
              >
                {DEPARTMENT_OPTIONS.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink-2">
                Vị trí
              </label>
              <select
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full rounded-xl border-2 border-line bg-card px-3 py-2.5 text-sm transition focus:border-brand focus:outline-none"
              >
                <option value="">— Chưa gán —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="rounded-xl border border-dashed border-line bg-secondary/20 px-3 py-2 text-xs text-ink-3">
            Nhân viên nhận email mời → đăng nhập (ưu tiên &quot;Đăng nhập với
            Google&quot;) → được gán đúng phòng/vị trí đã chọn.
          </p>

          <label className="flex items-start gap-3 rounded-xl border border-line bg-secondary/30 px-4 py-3 text-sm text-ink-2">
            <input
              type="checkbox"
              checked={grantManagerAccess}
              onChange={(e) => setGrantManagerAccess(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-line accent-brand"
            />
            <span>
              <span className="block font-semibold text-ink">
                Cấp quyền quản lý
              </span>
              <span className="text-xs text-ink-3">
                Bật nếu người này cũng được xem dashboard và thêm nhân viên.
              </span>
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang kiểm tra..." : "Thêm nhân viên"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
