import { randomUUID } from "crypto";
import type { PracticeReviewResult } from "@/lib/practice-grader";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PersistGradingInput = {
  userId: string;
  organizationId: string | null;
  moduleId: string;
  submissionId: string;
  submissionType: "practical-image" | "open-text" | "mcq";
  review: PracticeReviewResult;
};

export type PersistGradingResult = {
  submissionId: string;
  gradingResultId: string | null;
  persisted: boolean;
};

function isMissingGradingTable(message: string): boolean {
  return /grading_results|assessment_submissions|does not exist/i.test(message);
}

export async function persistPracticeGrading(
  input: PersistGradingInput,
): Promise<PersistGradingResult> {
  const grading = input.review.grading;
  if (!grading) {
    return {
      submissionId: input.submissionId,
      gradingResultId: null,
      persisted: false,
    };
  }

  const supabase = await createSupabaseServerClient();

  const { error: submissionError } = await supabase
    .from("assessment_submissions")
    .insert({
      id: input.submissionId,
      organization_id: input.organizationId,
      user_id: input.userId,
      legacy_module_id: input.moduleId,
      submission_type: input.submissionType,
      status: "graded",
    });

  if (submissionError) {
    if (isMissingGradingTable(submissionError.message)) {
      return {
        submissionId: input.submissionId,
        gradingResultId: null,
        persisted: false,
      };
    }
    throw submissionError;
  }

  const gradingResultId = randomUUID();
  const { error: gradeError } = await supabase.from("grading_results").insert({
    id: gradingResultId,
    organization_id: input.organizationId,
    submission_id: input.submissionId,
    user_id: input.userId,
    score: input.review.score,
    rubric_version: grading.rubricVersion,
    rubric_breakdown: grading.rubricBreakdown,
    evidence: grading.evidence,
    feedback: input.review.feedback,
    strengths: input.review.strengths,
    improvements: input.review.improvements,
    confidence: grading.confidence,
    review_status: grading.reviewStatus,
    model: grading.model,
  });

  if (gradeError) {
    if (isMissingGradingTable(gradeError.message)) {
      return {
        submissionId: input.submissionId,
        gradingResultId: null,
        persisted: false,
      };
    }
    throw gradeError;
  }

  return {
    submissionId: input.submissionId,
    gradingResultId,
    persisted: true,
  };
}

export async function persistOpenTextGrading(input: {
  userId: string;
  organizationId: string | null;
  moduleId?: string | null;
  prompt: string;
  answer: string;
  review: PracticeReviewResult;
}): Promise<PersistGradingResult> {
  const submissionId = randomUUID();
  const persisted = await persistPracticeGrading({
    userId: input.userId,
    organizationId: input.organizationId,
    moduleId: input.moduleId ?? "open-text",
    submissionId,
    submissionType: "open-text",
    review: input.review,
  });

  if (!persisted.persisted) return persisted;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assessment_answers").insert({
    submission_id: submissionId,
    answer_json: {
      prompt: input.prompt,
      answer: input.answer,
      moduleId: input.moduleId ?? null,
    },
  });

  if (error && !isMissingGradingTable(error.message)) {
    console.warn("[grading-persistence] assessment_answers:", error.message);
  }

  return persisted;
}

export async function persistMcqGrading(input: {
  userId: string;
  organizationId: string | null;
  roleId: string;
  moduleId?: string | null;
  answers: number[];
  review: PracticeReviewResult;
}): Promise<PersistGradingResult> {
  const submissionId = randomUUID();
  const legacyModuleId = input.moduleId ?? `quiz-${input.roleId}`;

  const persisted = await persistPracticeGrading({
    userId: input.userId,
    organizationId: input.organizationId,
    moduleId: legacyModuleId,
    submissionId,
    submissionType: "mcq",
    review: input.review,
  });

  if (!persisted.persisted) return persisted;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("assessment_answers").insert({
    submission_id: submissionId,
    answer_json: {
      roleId: input.roleId,
      moduleId: input.moduleId ?? null,
      answers: input.answers,
    },
  });

  if (error && !isMissingGradingTable(error.message)) {
    console.warn("[grading-persistence] mcq assessment_answers:", error.message);
  }

  return persisted;
}
