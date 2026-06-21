import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerPathAssignments } from "@/components/manager-path-assignments";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Phân công lộ trình · AI Trợ Lý",
};

export default async function QuanLyPhanCongPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerPathAssignments />;
}
