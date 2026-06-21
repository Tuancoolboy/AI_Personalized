import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerGradingQueue } from "@/components/manager-grading-queue";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Duyệt bài chấm · AI Trợ Lý",
};

export default async function QuanLyBaiLamPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerGradingQueue />;
}
