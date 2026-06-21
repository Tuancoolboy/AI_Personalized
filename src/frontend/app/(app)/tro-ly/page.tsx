import type { Metadata } from "next";
import { TroLyChat } from "@/components/tro-ly-chat";
import {
  resolveAppUserDisplayName,
  resolveAppUserType,
} from "@/lib/app-user";

export const metadata: Metadata = {
  title: "Trợ lý AI · AI Trợ Lý",
};

export default async function TroLyPage() {
  const userType = await resolveAppUserType();
  const displayName = await resolveAppUserDisplayName();

  return <TroLyChat userType={userType} displayName={displayName} />;
}
