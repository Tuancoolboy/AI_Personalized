import type { Metadata } from "next";
import { HocTapTeamRoom } from "@/components/hoc-tap-team-room";
import { resolveAppUserDisplayName } from "@/lib/app-user";

type PageProps = { params: Promise<{ code: string }> };

export const metadata: Metadata = {
  title: "Phòng chơi team · AI Trợ Lý",
  description: "Sảnh chơi quiz online theo mã phòng trong Học tập.",
};

export default async function HocTapRoomPage({ params }: PageProps) {
  const [{ code }, displayName] = await Promise.all([
    params,
    resolveAppUserDisplayName(),
  ]);

  return <HocTapTeamRoom code={code} displayName={displayName} />;
}
