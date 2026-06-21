import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerPathBuilder } from "@/components/manager-path-builder";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Thiết kế lộ trình · AI Trợ Lý",
};

export default async function QuanLyLoTrinhPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerPathBuilder />;
}
