import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerDashboard } from "@/components/manager-dashboard";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Quản lý · AI Trợ Lý",
};

export default async function QuanLyPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerDashboard />;
}
