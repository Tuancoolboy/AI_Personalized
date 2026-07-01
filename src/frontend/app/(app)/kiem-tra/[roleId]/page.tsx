import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KiemTraQuiz } from "@/components/kiem-tra-quiz";
import { resolveQuizReturnHref } from "@/lib/hoc-tap-quiz-catalog";
import { loadLearningActivationRecord } from "@/lib/learning-activation";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { getCurrentUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bài kiểm tra · AI Trợ Lý",
};

export default async function KiemTraPage({
  params,
  searchParams,
}: {
  params: Promise<{ roleId: string }>;
  searchParams: Promise<{ from?: string | string[]; quiz?: string | string[] }>;
}) {
  const [{ roleId }, query] = await Promise.all([params, searchParams]);
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    const access = await loadLearningActivationRecord(user.id);
    if (access.isPlatformAdmin) redirect("/van-hanh");
    if (access.isManager) redirect("/quan-ly");
    if (!access.roleId) redirect("/onboarding");
    if (!access.learningActivated) redirect("/cho-kich-hoat");
  }

  const returnHref = resolveQuizReturnHref(query.from);
  const hocTapQuizId =
    returnHref === "/hoc-tap" && typeof query.quiz === "string"
      ? query.quiz
      : null;

  return (
    <KiemTraQuiz
      roleId={roleId}
      returnHref={returnHref}
      hocTapQuizId={hocTapQuizId}
    />
  );
}
