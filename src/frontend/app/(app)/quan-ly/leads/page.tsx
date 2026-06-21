import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerLeadsList } from "@/components/manager-leads-list";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Đăng ký nhận tin · AI Trợ Lý",
};

export default async function QuanLyLeadsPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerLeadsList />;
}
