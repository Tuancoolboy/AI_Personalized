import type { Metadata } from "next";
import { LeaderboardView } from "@/components/leaderboard-view";

export const metadata: Metadata = {
  title: "Bảng xếp hạng · AI Trợ Lý",
};

export default function BangXepHangPage() {
  return <LeaderboardView />;
}
