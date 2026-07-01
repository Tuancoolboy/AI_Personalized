export const UNANSWERED_QUIZ_OPTION = -1;

export function isSubmittedQuizAnswer(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value)
  );
}
