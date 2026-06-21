import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrgToolSettings } from "@/components/org-tool-settings";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Cài đặt công cụ AI · AI Trợ Lý",
};

export default async function QuanLyCaiDatPage() {
  // Chỉ quản lý đổi tool của cả công ty (chặn ở route lẫn UI).
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <OrgToolSettings />;
}
