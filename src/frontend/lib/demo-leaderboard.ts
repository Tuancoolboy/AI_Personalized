// Dữ liệu demo cho Bảng xếp hạng + Bảng tin (mục 4, localStorage).
// Real mode: points_ledger (bảng tuần = tuần này, bảng tổng = sum) +
// leaderboard_visibility (migration 0016) + events (0005) cho feed.

import { TEAM_MEMBERS, type TeamMember } from "@/lib/team-data";

export type LeaderboardRow = {
  id: string;
  name: string;
  department: string;
  weeklyPoints: number;
  totalPoints: number;
  hoursSaved: number;
  isYou: boolean;
};

export type FeedKind = "lesson" | "quiz" | "share" | "challenge";

export type FeedEvent = {
  id: string;
  actorName: string;
  department: string;
  kind: FeedKind;
  text: string;
  at: string;
};

const VIS_KEY = "ai_troly_demo_lb_hide_name";

// "Bạn" trong demo — nhân viên đang đăng nhập.
const YOU: TeamMember = {
  id: "you",
  fullName: "Bạn",
  department: "Vận hành",
  completionPct: 72,
  quizScore: 84,
  lastActivity: "Hôm nay",
};

// Điểm suy ra tất định từ tiến độ + điểm test + nguồn chia sẻ/challenge giả lập.
function pointsFor(m: TeamMember): { weekly: number; total: number; hours: number } {
  const lesson = Math.round(m.completionPct * 5);
  const quiz = Math.round(m.quizScore * 2);
  const share = (m.fullName.length % 4) * 15; // chia sẻ
  const challenge = (m.quizScore % 3) * 20; // challenge
  const total = lesson + quiz + share + challenge;
  const weekly = Math.round(total * 0.35) + (m.completionPct % 7) * 6;
  const hours = Math.round((m.completionPct / 100) * 8 * 10) / 10;
  return { weekly, total, hours };
}

export function buildLeaderboard(): LeaderboardRow[] {
  const rows = [...TEAM_MEMBERS, YOU].map((m) => {
    const p = pointsFor(m);
    return {
      id: m.id,
      name: m.fullName,
      department: m.department,
      weeklyPoints: p.weekly,
      totalPoints: p.total,
      hoursSaved: p.hours,
      isYou: m.id === "you",
    };
  });
  return rows;
}

export function getYouDepartment(): string {
  return YOU.department;
}

// Bảng tin demo — trộn các loại sự kiện, mới nhất trước.
export function buildFeed(): FeedEvent[] {
  const now = Date.now();
  const raw: Array<Omit<FeedEvent, "id" | "at"> & { minsAgo: number }> = [
    { actorName: "Phạm Thị Lan", department: "Kế toán", kind: "lesson", text: "vừa hoàn thành bài « Đối chiếu công nợ bằng AI »", minsAgo: 12 },
    { actorName: "Hoàng Quốc Bảo", department: "Marketing", kind: "quiz", text: "đạt 90 điểm bài kiểm tra tình huống", minsAgo: 48 },
    { actorName: "Bạn", department: "Vận hành", kind: "share", text: "đã chia sẻ một khoảnh khắc « à há » cho phòng", minsAgo: 70 },
    { actorName: "Dương Văn Hùng", department: "Vận hành", kind: "challenge", text: "hoàn thành thử thách « Hoàn thành 3 bài trong tuần » (+20đ)", minsAgo: 130 },
    { actorName: "Nguyễn Thu Hà", department: "Kinh doanh", kind: "lesson", text: "vừa hoàn thành bài « Viết email chốt sale »", minsAgo: 200 },
    { actorName: "Vũ Đức Anh", department: "Kế toán", kind: "share", text: "chia sẻ 1 prompt lọc hóa đơn hữu ích", minsAgo: 320 },
  ];
  return raw.map((e, i) => ({
    id: `feed-${i}`,
    actorName: e.actorName,
    department: e.department,
    kind: e.kind,
    text: e.text,
    at: new Date(now - e.minsAgo * 60_000).toISOString(),
  }));
}

export function getHideName(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VIS_KEY) === "true";
}

export function setHideName(value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VIS_KEY, value ? "true" : "false");
}

export function feedKindIcon(kind: FeedKind): string {
  return kind === "lesson"
    ? "📘"
    : kind === "quiz"
      ? "🎯"
      : kind === "share"
        ? "💡"
        : "🏆";
}

export function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}
