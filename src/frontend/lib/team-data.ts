// Mock team data cho manager dashboard demo.
// Khi cấu hình Supabase thật, query bảng profiles + module_progress + quiz_results.

export type DepartmentId =
  | "kinh-doanh"
  | "ke-toan"
  | "marketing"
  | "van-hanh"
  | "khac";

export type DepartmentLabel =
  | "Kinh doanh"
  | "Kế toán"
  | "Marketing"
  | "Vận hành"
  | "Khác";

export type MemberRole = "employee" | "manager" | "owner";

export type InvitationStatus = "active" | "pending";

export type TeamMember = {
  id: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  department: DepartmentLabel;
  departmentId?: DepartmentId;
  memberRole?: MemberRole;
  invitationStatus?: InvitationStatus;
  completionPct: number;
  quizScore: number; // 0 = chưa làm
  lastActivity: string;
};

export const DEPARTMENT_OPTIONS: Array<{
  id: DepartmentId;
  label: DepartmentLabel;
}> = [
  { id: "kinh-doanh", label: "Kinh doanh" },
  { id: "ke-toan", label: "Kế toán" },
  { id: "marketing", label: "Marketing" },
  { id: "van-hanh", label: "Vận hành" },
  { id: "khac", label: "Khác" },
];

export const DEPARTMENTS = DEPARTMENT_OPTIONS.map((dep) => dep.label);

const DEPARTMENT_LABEL_BY_ID: Record<DepartmentId, DepartmentLabel> =
  DEPARTMENT_OPTIONS.reduce(
    (acc, dep) => ({ ...acc, [dep.id]: dep.label }),
    {} as Record<DepartmentId, DepartmentLabel>,
  );

const DEPARTMENT_ID_BY_LABEL: Record<DepartmentLabel, DepartmentId> =
  DEPARTMENT_OPTIONS.reduce(
    (acc, dep) => ({ ...acc, [dep.label]: dep.id }),
    {} as Record<DepartmentLabel, DepartmentId>,
  );

export function isDepartmentId(value: string): value is DepartmentId {
  return value in DEPARTMENT_LABEL_BY_ID;
}

export function departmentIdToLabel(id: DepartmentId): DepartmentLabel {
  return DEPARTMENT_LABEL_BY_ID[id];
}

export function departmentLabelToId(label: DepartmentLabel): DepartmentId {
  return DEPARTMENT_ID_BY_LABEL[label];
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "m1", fullName: "Nguyễn Thu Hà", department: "Kinh doanh", completionPct: 100, quizScore: 92, lastActivity: "Hôm nay" },
  { id: "m2", fullName: "Trần Văn Minh", department: "Kinh doanh", completionPct: 67, quizScore: 78, lastActivity: "Hôm qua" },
  { id: "m3", fullName: "Lê Hoàng Nam", department: "Kinh doanh", completionPct: 33, quizScore: 65, lastActivity: "2 ngày trước" },
  { id: "m4", fullName: "Phạm Thị Lan", department: "Kế toán", completionPct: 100, quizScore: 95, lastActivity: "Hôm nay" },
  { id: "m5", fullName: "Vũ Đức Anh", department: "Kế toán", completionPct: 83, quizScore: 88, lastActivity: "Hôm nay" },
  { id: "m6", fullName: "Đỗ Mai Phương", department: "Kế toán", completionPct: 17, quizScore: 0, lastActivity: "4 ngày trước" },
  { id: "m7", fullName: "Hoàng Quốc Bảo", department: "Marketing", completionPct: 100, quizScore: 90, lastActivity: "Hôm qua" },
  { id: "m8", fullName: "Ngô Thanh Tú", department: "Marketing", completionPct: 50, quizScore: 72, lastActivity: "Hôm nay" },
  { id: "m9", fullName: "Bùi Khánh Linh", department: "Marketing", completionPct: 67, quizScore: 80, lastActivity: "2 ngày trước" },
  { id: "m10", fullName: "Dương Văn Hùng", department: "Vận hành", completionPct: 100, quizScore: 85, lastActivity: "Hôm nay" },
  { id: "m11", fullName: "Đặng Thu Trang", department: "Vận hành", completionPct: 33, quizScore: 60, lastActivity: "3 ngày trước" },
  { id: "m12", fullName: "Phan Gia Huy", department: "Vận hành", completionPct: 0, quizScore: 0, lastActivity: "Chưa bắt đầu" },
];

export const DEPARTMENT_COLORS: Record<TeamMember["department"], string> = {
  "Kinh doanh": "#DB6E4C",
  "Kế toán": "#2E6B4F",
  Marketing: "#C8923B",
  "Vận hành": "#3C6E8F",
  Khác: "#6F6B7A",
};

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}

// Stats aggregations
export function computeTeamStats(members: TeamMember[] = TEAM_MEMBERS) {
  const total = members.length;
  const avgCompletion = total === 0 ? 0 : Math.round(
    members.reduce((acc, m) => acc + m.completionPct, 0) / total,
  );
  const active = members.filter((m) => m.completionPct > 0 && m.completionPct < 100).length;
  const completed = members.filter((m) => m.completionPct === 100).length;
  const notStarted = members.filter((m) => m.completionPct === 0).length;
  const quizzed = members.filter((m) => m.quizScore > 0);
  const avgQuiz = quizzed.length === 0 ? 0 : Math.round(
    quizzed.reduce((acc, m) => acc + m.quizScore, 0) / quizzed.length,
  );

  const byDept = DEPARTMENTS.map((dept) => {
    const group = members.filter((m) => m.department === dept);
    const avg =
      group.length === 0
        ? 0
        : Math.round(
            group.reduce((acc, m) => acc + m.completionPct, 0) / group.length,
          );
    return { dept, avgCompletion: avg, count: group.length };
  });

  // Mock progress trend qua 6 tuần (cuối kỳ = avgCompletion thực tế)
  const trend = [
    { week: "Tuần 1", avg: 8 },
    { week: "Tuần 2", avg: 21 },
    { week: "Tuần 3", avg: 35 },
    { week: "Tuần 4", avg: 48 },
    { week: "Tuần 5", avg: 59 },
    { week: "Tuần 6", avg: avgCompletion },
  ];

  return {
    total,
    avgCompletion,
    active,
    completed,
    notStarted,
    avgQuiz,
    quizzedCount: quizzed.length,
    byDept,
    trend,
    statusDistribution: [
      { name: "Hoàn thành", value: completed, color: "#2E7D5B" },
      { name: "Đang học", value: active, color: "#DB6E4C" },
      { name: "Chưa bắt đầu", value: notStarted, color: "#D9CFBD" },
    ],
  };
}

// Tóm tắt tiến độ đội từ dữ liệu DEMO (TEAM_MEMBERS) — thay getTeamAnalysisSummary
// (vốn cần Supabase) cho Trợ lý AI quản lý ở demo mode. Đủ dữ liệu để phân tích,
// gợi ý ai cần kèm, phòng nào yếu — KHÔNG hỏi ngược người dùng.
export function buildDemoTeamSummary(members: TeamMember[] = TEAM_MEMBERS): string {
  const stats = computeTeamStats(members);
  const lines: string[] = [];
  lines.push(
    `Tổng ${stats.total} nhân viên · hoàn thành TB ${stats.avgCompletion}% · điểm quiz TB ${stats.avgQuiz}/100 (đã làm quiz: ${stats.quizzedCount}).`,
  );
  lines.push(
    `Trạng thái: ${stats.completed} hoàn thành, ${stats.active} đang học, ${stats.notStarted} chưa bắt đầu.`,
  );
  lines.push(
    "Theo phòng: " +
      stats.byDept
        .map((d) => `${d.dept} ${d.avgCompletion}% (${d.count} người)`)
        .join("; ") +
      ".",
  );

  const needHelp = members.filter(
    (m) => m.completionPct < 30 || (m.quizScore > 0 && m.quizScore < 70),
  );
  if (needHelp.length) {
    lines.push(
      "Cần kèm thêm: " +
        needHelp
          .map(
            (m) =>
              `${m.fullName} (${m.department}, hoàn thành ${m.completionPct}%, quiz ${m.quizScore > 0 ? m.quizScore : "chưa làm"}, hoạt động ${m.lastActivity})`,
          )
          .join("; ") +
        ".",
    );
  }

  const top = members.filter((m) => m.completionPct === 100 && m.quizScore >= 85);
  if (top.length) {
    lines.push(
      "Làm tốt: " + top.map((m) => `${m.fullName} (${m.department})`).join("; ") + ".",
    );
  }
  return lines.join("\n");
}
