import type { Metadata } from "next";
import { HocTapDashboard } from "@/components/hoc-tap-dashboard";
import { resolveAppUserDisplayName } from "@/lib/app-user";

export const metadata: Metadata = {
  title: "Học tập · AI Trợ Lý",
  description:
    "Luyện quiz, tham gia phòng cùng team, tích lũy XP thật và theo dõi bảng xếp hạng.",
};

export default async function HocTapPage() {
  const displayName = await resolveAppUserDisplayName();
  return <HocTapDashboard displayName={displayName} />;
}
