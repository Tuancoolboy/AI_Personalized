import type { Metadata } from "next";
import { HocTapDashboard } from "@/components/hoc-tap-dashboard";
import { resolveAppUserDisplayName } from "@/lib/app-user";

export const metadata: Metadata = {
  title: "Chơi với team · AI Trợ Lý",
  description:
    "Tạo phòng, tham gia bằng mã phòng và chơi quiz online cùng team.",
};

export default async function ChoiVoiTeamPage() {
  const displayName = await resolveAppUserDisplayName();
  return <HocTapDashboard displayName={displayName} initialTab="team" />;
}
