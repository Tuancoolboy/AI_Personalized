"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle, MoreVertical } from "lucide-react";
import { DashboardFeed } from "@/components/dashboard-feed";
import { ManagerDirectChatModal } from "@/components/manager-direct-chat-modal";
import {
  fetchLeads,
  fetchManagerTeam,
  isSupabaseBackend,
} from "@/lib/client-api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  computeTeamStats,
  DEPARTMENT_COLORS,
  initialsOf,
  TEAM_MEMBERS,
  type TeamMember,
} from "@/lib/team-data";

export function ManagerDashboard() {
  const useDemoTeam = !isSupabaseBackend();
  const [leadCount, setLeadCount] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>(
    useDemoTeam ? TEAM_MEMBERS : [],
  );
  const [organizationName, setOrganizationName] = useState(
    useDemoTeam ? "Tổ chức demo" : "Tổ chức của bạn",
  );
  const [persistedTeam, setPersistedTeam] = useState(false);
  const [teamMessage, setTeamMessage] = useState("");
  const [chatMember, setChatMember] = useState<TeamMember | null>(null);
  const stats = computeTeamStats(members);
  const topMembers = [...members]
    .sort((a, b) => b.completionPct - a.completionPct)
    .slice(0, 6);

  useEffect(() => {
    void fetchLeads()
      .then((res) => setLeadCount(res.total))
      .catch(() => setLeadCount(null));
    void fetchManagerTeam()
      .then((res) => {
        setMembers(res.members);
        setOrganizationName(res.organizationName);
        setPersistedTeam(Boolean(res.persisted));
        setTeamMessage(res.message ?? "");
      })
      .catch(() => {
        setMembers(useDemoTeam ? TEAM_MEMBERS : []);
        setOrganizationName(useDemoTeam ? "Tổ chức demo" : "Tổ chức của bạn");
        setPersistedTeam(false);
        setTeamMessage(
          useDemoTeam
            ? "Đang dùng dữ liệu demo/local."
            : "Không tải được danh sách nhân viên thật.",
        );
      });
  }, [useDemoTeam]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Dashboard quản lý
          </p>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
            Năng lực AI của toàn đội
          </h1>
          <p className="mt-1.5 text-sm text-ink-2">
            Theo dõi tiến độ học tập của {stats.total} nhân viên ·{" "}
            {organizationName}
          </p>
          <p className="mt-1 text-xs font-medium text-ink-3">
            {persistedTeam
              ? "Dữ liệu Supabase theo tổ chức"
              : useDemoTeam
                ? "Dữ liệu demo khi chưa có Supabase/membership"
                : teamMessage || "Chưa có dữ liệu nhân viên thật"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/quan-ly/leads"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Đăng ký nhận tin
            {leadCount !== null && (
              <span className="ml-2 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">
                {leadCount}
              </span>
            )}
          </Link>
          <Link
            href="/quan-ly/lo-trinh"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Thiết kế lộ trình →
          </Link>
          <Link
            href="/quan-ly/nhan-vien"
            className="inline-flex h-11 items-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Quản lý nhân viên →
          </Link>
          <Link
            href="/quan-ly/bai-lam"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Duyệt bài chấm
          </Link>
          <Link
            href="/quan-ly/agent-health"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Trạng thái agent
          </Link>
          <Link
            href="/quan-ly/phan-cong"
            className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Gợi ý lộ trình
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Link
          href="/quan-ly/leads"
          className="rounded-2xl border border-line bg-card p-5 transition hover:border-brand/40 hover:shadow-sm"
        >
          <p className="text-2xl">✉</p>
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-ink-3">
            Đăng ký landing
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">
            {leadCount === null ? "…" : leadCount}
          </p>
          <p className="mt-0.5 text-xs text-ink-3">pre-launch · xem danh sách</p>
        </Link>
        <StatCard
          icon="👥"
          label="Tổng nhân viên"
          value={stats.total}
          meta={`${stats.byDept.filter((d) => d.count > 0).length} phòng ban`}
        />
        <StatCard
          icon="📈"
          label="Hoàn thành TB"
          value={`${stats.avgCompletion}%`}
          meta="lộ trình học AI"
        />
        <StatCard
          icon="🔥"
          label="Đang học"
          value={stats.active}
          meta="nhân viên tích cực"
        />
        <StatCard
          icon="✎"
          label="Điểm kiểm tra TB"
          value={`${stats.avgQuiz}%`}
          meta={`trên ${stats.quizzedCount} người đã làm`}
        />
      </div>

      {/* Charts */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <ChartBox
          title="Hoàn thành theo phòng ban"
          subtitle="Phòng nào đang dẫn đầu, phòng nào cần hỗ trợ"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={stats.byDept}
              margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
              <CartesianGrid stroke="#EFE8DB" vertical={false} />
              <XAxis dataKey="dept" tick={{ fontSize: 12 }} stroke="#94A099" />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#94A099"
                tickFormatter={(v) => `${v}%`}
                domain={[0, 100]}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Trung bình"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E7DFD1",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="avgCompletion" radius={[8, 8, 0, 0]}>
                {stats.byDept.map((entry) => (
                  <Cell
                    key={entry.dept}
                    fill={
                      DEPARTMENT_COLORS[
                        entry.dept as keyof typeof DEPARTMENT_COLORS
                      ] ?? "#15463B"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        <ChartBox
          title="Trạng thái toàn đội"
          subtitle="Phân bổ tiến độ học"
          height={260}
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
              >
                {stats.statusDistribution.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={3} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E7DFD1",
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs">
            {stats.statusDistribution.map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 text-ink-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                {s.name} ({s.value})
              </span>
            ))}
          </div>
        </ChartBox>
      </div>

      <ChartBox
        title="Tiến bộ toàn đội qua 6 tuần"
        subtitle="Tỷ lệ hoàn thành trung bình tăng dần"
        height={220}
        className="mt-3"
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={stats.trend}
            margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
          >
            <CartesianGrid stroke="#EFE8DB" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94A099" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#94A099"
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, "Hoàn thành TB"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #E7DFD1",
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="#15463B"
              strokeWidth={3}
              dot={{ fill: "#DB6E4C", r: 5 }}
              activeDot={{ r: 7 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartBox>

      {/* Leaderboard */}
      <div className="mt-8 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Bảng xếp hạng nhân viên
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-ink">
            Top theo mức độ hoàn thành
          </h2>
        </div>
        <Link
          href="/quan-ly/nhan-vien"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Xem tất cả →
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <TeamTable members={topMembers} onChatMember={setChatMember} />
      </div>

      {/* Bảng tin hoạt động (mục 4) */}
      <div className="mt-8">
        <DashboardFeed defaultScope="company" />
      </div>

      {chatMember && (
        <ManagerDirectChatModal
          key={chatMember.id}
          member={chatMember}
          onClose={() => setChatMember(null)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  meta,
}: {
  icon: string;
  label: string;
  value: string | number;
  meta?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-sm">
      <span className="absolute right-4 top-4 text-2xl opacity-30">{icon}</span>
      <p className="text-xs font-medium text-ink-2">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold tracking-tight text-ink">
        {value}
      </p>
      {meta && <p className="mt-0.5 text-xs text-ink-3">{meta}</p>}
    </div>
  );
}

function ChartBox({
  title,
  subtitle,
  height,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  height: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-line bg-card p-5 shadow-sm ${className ?? ""}`}
    >
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      <p className="mb-3 text-xs text-ink-2">{subtitle}</p>
      <div className="min-w-0 overflow-hidden" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export function TeamTable({
  members,
  onChatMember,
}: {
  members: TeamMember[];
  onChatMember?: (member: TeamMember) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line bg-bg-warm/40 text-xs uppercase tracking-wider text-ink-3">
            <th className="px-5 py-4 text-left font-bold">Nhân viên</th>
            <th className="px-5 py-4 text-left font-bold">Phòng ban</th>
            <th className="px-5 py-4 text-left font-bold">Hoàn thành</th>
            <th className="px-5 py-4 text-left font-bold">Điểm KT</th>
            <th className="px-5 py-4 text-left font-bold">Hoạt động</th>
            <th className="w-40 px-5 py-4 text-left font-bold">Liên hệ</th>
          </tr>
        </thead>
        <tbody>
          {members.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="px-5 py-10 text-center text-sm text-ink-3"
              >
                Chưa có nhân viên trong tổ chức này.
              </td>
            </tr>
          )}
          {members.map((m) => {
            const color = DEPARTMENT_COLORS[m.department];
            const barColor =
              m.completionPct === 100
                ? "#2E7D5B"
                : m.completionPct > 0
                  ? "#DB6E4C"
                  : "#D9CFBD";
            const status =
              m.invitationStatus === "pending"
                ? { label: "Đã mời", cls: "bg-secondary text-ink-3" }
                : m.completionPct === 100
                ? { label: "Hoàn thành", cls: "bg-brand-soft text-brand" }
                : m.completionPct > 0
                  ? { label: "Đang học", cls: "bg-accent/15 text-accent" }
                  : { label: "Chưa bắt đầu", cls: "bg-secondary text-ink-3" };
            const roleLabel =
              m.memberRole === "owner"
                ? "Chủ sở hữu"
                : m.memberRole === "manager"
                  ? "Quản lý"
                  : null;
            return (
              <tr
                key={m.id}
                className="border-b border-line-2 transition last:border-0 hover:bg-bg-warm/35"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 flex-none place-items-center rounded-full font-display text-xs font-bold text-white shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {initialsOf(m.fullName)}
                    </span>
                    <span>
                      <span className="block font-medium text-ink">
                        {m.fullName}
                      </span>
                      {m.email && (
                        <span className="block text-xs text-ink-3">
                          {m.email}
                        </span>
                      )}
                      {m.phoneNumber && (
                        <span className="block text-xs text-ink-3">
                          {m.phoneNumber}
                        </span>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-ink-2">{m.department}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${m.completionPct}%`,
                          backgroundColor: barColor,
                        }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-ink">
                      {m.completionPct}%
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 font-medium text-ink">
                  {m.quizScore > 0 ? `${m.quizScore}%` : "—"}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${status.cls}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-xs text-ink-3">{m.lastActivity}</span>
                  </div>
                  {roleLabel && (
                    <span className="mt-1 inline-flex rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
                      {roleLabel}
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {onChatMember ? (
                      <button
                        type="button"
                        onClick={() => onChatMember(m)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Chat
                      </button>
                    ) : (
                      <Link
                        href="/tro-ly"
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-card px-3 text-xs font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
                      >
                        <MessageCircle className="h-4 w-4" aria-hidden="true" />
                        Chat
                      </Link>
                    )}
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded-xl text-ink-3 transition hover:bg-secondary hover:text-ink"
                      aria-label={`Mở tùy chọn cho ${m.fullName}`}
                    >
                      <MoreVertical className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
