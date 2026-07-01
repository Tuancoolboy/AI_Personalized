import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadLearningActivationRecord } from "@/lib/learning-activation";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

export const metadata: Metadata = {
  title: "Chờ kích hoạt · AI Trợ Lý",
};

export default async function ChoKichHoatPage() {
  if (!isSupabaseConfigured()) {
    redirect("/lo-trinh");
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const access = await loadLearningActivationRecord(user.id);
  if (access.isPlatformAdmin) redirect("/van-hanh");
  if (access.isManager) redirect("/quan-ly");
  if (!access.roleId) redirect("/onboarding");
  if (access.learningActivated) redirect("/lo-trinh");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-10 sm:px-6 sm:py-14">
      <div className="w-full rounded-3xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Đang chờ kích hoạt
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Lộ trình học của bạn đang được tạo
        </h1>
        <p className="mt-3 text-base leading-7 text-ink-2">
          Vui lòng chờ - chúng tôi sẽ thông báo qua email khi lộ trình của bạn
          sẵn sàng.
        </p>
        <div className="mt-6 rounded-2xl border border-line bg-secondary/30 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
            Email nhận thông báo
          </p>
          <p className="mt-1 text-sm font-medium text-ink">
            {user.email ?? "Chưa có email"}
          </p>
        </div>
      </div>
    </div>
  );
}
