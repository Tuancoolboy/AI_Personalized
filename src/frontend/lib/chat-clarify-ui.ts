import { MAX_CLARIFY_QUESTIONS, type ClarifyingQuestion } from "@/lib/chat-clarify-types";
import { isClarifyUserAnswer, parseClarifyUserAnswer } from "@/lib/chat-clarify-parse";

type ClarifyMessage = {
  id: string;
  role: "user" | "assistant" | "safety";
  content: string;
  clarify?: ClarifyingQuestion;
};

export function getClarifyMessageState(
  messages: ClarifyMessage[],
  index: number,
  typing: boolean,
): { interactive: boolean; selectedAnswer: string | null } {
  const msg = messages[index];
  if (!msg?.clarify || msg.role !== "assistant") {
    return { interactive: false, selectedAnswer: null };
  }

  const priorClarifyAnswers = messages
    .slice(0, index)
    .filter((m) => m.role === "user" && isClarifyUserAnswer(m.content)).length;
  if (priorClarifyAnswers >= MAX_CLARIFY_QUESTIONS) {
    return { interactive: false, selectedAnswer: null };
  }

  const nextUser = messages
    .slice(index + 1)
    .find((m) => m.role === "user");
  if (nextUser) {
    const qa = parseClarifyUserAnswer(nextUser.content);
    return {
      interactive: false,
      selectedAnswer: qa?.answer ?? nextUser.content.trim(),
    };
  }

  const hasLaterAssistant = messages
    .slice(index + 1)
    .some((m) => m.role === "assistant");
  if (hasLaterAssistant) {
    return { interactive: false, selectedAnswer: null };
  }

  return { interactive: !typing, selectedAnswer: null };
}
