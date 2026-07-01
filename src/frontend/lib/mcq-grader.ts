import { deriveReviewStatus } from "@/lib/agents/grader-types";
import type { PracticeReviewResult } from "@/lib/practice-grader";
import { UNANSWERED_QUIZ_OPTION } from "@/lib/quiz-answers";
import { getRole } from "@/lib/roles";

export const MCQ_PASS_SCORE = 70;

export type McqGradingInput = {
  roleId: string;
  answers: number[];
};

export type McqGradingResult = {
  score: number;
  correctCount: number;
  questionCount: number;
  review: PracticeReviewResult;
};

type McqRubricBreakdown = NonNullable<
  PracticeReviewResult["grading"]
>["rubricBreakdown"];

export function gradeMcqQuiz(input: McqGradingInput): McqGradingResult | null {
  const role = getRole(input.roleId);
  if (!role?.quiz.length) return null;

  const questions = role.quiz;
  if (input.answers.length !== questions.length) return null;

  let correctCount = 0;
  const rubricBreakdown: McqRubricBreakdown = [];
  for (let index = 0; index < questions.length; index += 1) {
    const q = questions[index];
    if (!q) return null;
    const selected = input.answers[index];
    if (
      typeof selected !== "number" ||
      !Number.isInteger(selected) ||
      selected >= q.options.length
    ) {
      return null;
    }
    const valid =
      selected !== UNANSWERED_QUIZ_OPTION &&
      selected >= 0 &&
      selected < q.options.length;
    const isCorrect = valid && selected === q.correctIndex;
    if (isCorrect) correctCount += 1;
    rubricBreakdown.push({
      criterion: `Câu ${index + 1}: ${q.question.slice(0, 80)}`,
      points: isCorrect ? 1 : 0,
      maxPoints: 1,
      note: isCorrect ? "Đúng" : q.explanation.slice(0, 120),
    });
  }

  const questionCount = questions.length;
  const score = Math.round((correctCount / questionCount) * 100);
  const confidence = 1;
  const reviewStatus = deriveReviewStatus(score, confidence, MCQ_PASS_SCORE);

  const passed = score >= MCQ_PASS_SCORE;
  const improvements = questions
    .map((q, index) => {
      const selected = input.answers[index];
      if (selected === q.correctIndex) return null;
      return q.explanation;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    score,
    correctCount,
    questionCount,
    review: {
      score,
      feedback: passed
        ? `Bạn trả lời đúng ${correctCount}/${questionCount} câu — đạt ngưỡng kiểm tra.`
        : `Bạn trả lời đúng ${correctCount}/${questionCount} câu — cần ≥${MCQ_PASS_SCORE}% để pass.`,
      strengths: passed
        ? ["Nắm được các tình huống cơ bản trong bài kiểm tra"]
        : [],
      improvements: passed
        ? []
        : improvements.length > 0
          ? improvements
          : ["Ôn lại module và làm lại bài kiểm tra"],
      grading: {
        rubricBreakdown,
        evidence: [`Đúng ${correctCount}/${questionCount} câu trắc nghiệm`],
        confidence,
        reviewStatus,
        rubricVersion: "mcq-v1",
        model: null,
      },
    },
  };
}
