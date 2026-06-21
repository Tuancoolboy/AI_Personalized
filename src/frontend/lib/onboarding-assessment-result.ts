import type { AssessmentAnswer, AssessmentResult } from "@/lib/assessment";

export type OnboardingAssessmentResultInsert = {
  role_id: string;
  answers: AssessmentAnswer[];
  result: AssessmentResult;
  total_score: number;
  ai_level: number;
  daily_tasks: string[];
  tools_tried: string[];
  industry: string | null;
  position: string | null;
};

export function buildOnboardingAssessmentResultInsert(input: {
  roleId: string;
  answers: AssessmentAnswer[];
  result: AssessmentResult;
}): OnboardingAssessmentResultInsert {
  return {
    role_id: input.roleId,
    answers: input.answers.map((answer) => ({
      questionId: answer.questionId,
      value: Array.isArray(answer.value) ? [...answer.value] : answer.value,
    })),
    result: input.result,
    total_score: input.result.totalScore,
    ai_level: input.result.aiLevel,
    daily_tasks: [...input.result.dailyTasks],
    tools_tried: [...input.result.toolsTried],
    industry: input.result.industry || null,
    position: input.result.position || null,
  };
}
