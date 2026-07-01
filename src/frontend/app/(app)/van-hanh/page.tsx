import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlatformAdminConsole } from "@/components/platform-admin-console";
import { isPlatformAdminUser } from "@/lib/platform-admin-auth";

export const metadata: Metadata = {
  title: "Vận hành hệ thống · AI Trợ Lý",
};

export default async function VanHanhPage() {
  if (!(await isPlatformAdminUser())) {
    redirect("/van-hanh/login");
  }

  return <PlatformAdminConsole />;
}
