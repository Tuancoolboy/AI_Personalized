import type { Metadata } from "next";
import { KiemTraQuiz } from "@/components/kiem-tra-quiz";
import { resolveQuizReturnHref } from "@/lib/hoc-tap-quiz-catalog";

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
