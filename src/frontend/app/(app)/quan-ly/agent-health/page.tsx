import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ManagerAgentHealth } from "@/components/manager-agent-health";
import { isManagerUser } from "@/lib/manager-auth";

export const metadata: Metadata = {
  title: "Trạng thái agent · AI Trợ Lý",
};

export default async function QuanLyAgentHealthPage() {
  if (!(await isManagerUser())) {
    redirect("/lo-trinh");
  }
  return <ManagerAgentHealth />;
}
