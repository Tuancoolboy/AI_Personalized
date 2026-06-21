import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin-console";
import { isPlatformAdminUser } from "@/lib/platform-admin-auth";

export const metadata: Metadata = {
  title: "Quản trị nền tảng · AI Trợ Lý",
};

export default async function QuanTriPage() {
  // Chỉ platform_admin (super-admin) truy cập — chặn ở cả route lẫn nền RLS.
  if (!(await isPlatformAdminUser())) {
    redirect("/lo-trinh");
  }
  return <AdminConsole />;
}
