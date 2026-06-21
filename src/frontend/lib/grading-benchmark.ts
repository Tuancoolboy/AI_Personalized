import benchmarkFixtures from "@/lib/fixtures/grading-benchmark.vi.json";

export type GradingBenchmarkBand = "pass" | "borderline" | "fail";

export type GradingBenchmarkCase = {
  id: string;
  moduleId: string;
  roleId: string;
  answerText: string;
  expectedBand: GradingBenchmarkBand;
  expectedScoreMin: number;
  expectedScoreMax: number;
  reviewerNote?: string;
};

export type GradingBenchmarkFixture = {
  version: number;
  tolerancePoints: number;
  cases: GradingBenchmarkCase[];
};

export function loadGradingBenchmarkFixture(): GradingBenchmarkFixture {
  return benchmarkFixtures as GradingBenchmarkFixture;
}

export function assertScoreInBand(
  score: number,
  testCase: GradingBenchmarkCase,
  tolerancePoints: number,
): boolean {
  const min = Math.max(0, testCase.expectedScoreMin - tolerancePoints);
  const max = Math.min(100, testCase.expectedScoreMax + tolerancePoints);
  return score >= min && score <= max;
}

export function validateBenchmarkFixture(
  fixture: GradingBenchmarkFixture,
): string[] {
  const errors: string[] = [];

  if (!Number.isFinite(fixture.tolerancePoints) || fixture.tolerancePoints < 0) {
    errors.push("tolerancePoints must be a non-negative number");
  }

  if (!Array.isArray(fixture.cases) || fixture.cases.length === 0) {
    errors.push("cases must be a non-empty array");
    return errors;
  }

  for (const testCase of fixture.cases) {
    if (!testCase.id?.trim()) errors.push("case missing id");
    if (!testCase.answerText?.trim()) errors.push(`${testCase.id}: empty answerText`);
    if (testCase.expectedScoreMin > testCase.expectedScoreMax) {
      errors.push(`${testCase.id}: min score exceeds max score`);
    }
    if (
      testCase.expectedBand === "pass" &&
      testCase.expectedScoreMin < 70
    ) {
      errors.push(`${testCase.id}: pass band should start at 70+`);
    }
  }

  return errors;
}
