import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerTeamList } from "@/components/manager-team-list";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Quản lý nhân viên · AI Trợ Lý",
};

export default async function QuanLyNhanVienPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerTeamList />;
}
