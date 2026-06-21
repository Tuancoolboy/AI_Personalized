/** Phát hiện tin nhắn hỏi làm rò bị gộp nhiều câu / bullet. */
export function shouldEnforceSingleQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const questionCount = (trimmed.match(/\?/g) ?? []).length;
  const hasBulletLines = /(?:^|\n)\s*(?:[-•*]|\d+[.)])\s+/m.test(trimmed);

  if (questionCount >= 2) return true;
  if (questionCount >= 1 && hasBulletLines) return true;

  return (
    questionCount >= 1 &&
    /(?:cần biết|một chút thông tin|cho em biết|thông tin sau)/i.test(trimmed) &&
    hasBulletLines
  );
}

/**
 * Giữ intro ngắn + đúng MỘT câu hỏi; bỏ bullet và câu hỏi thứ hai trở đi.
 */
export function enforceSingleClarifyingQuestion(text: string): string {
  const trimmed = text.trim();
  if (!trimmed || !shouldEnforceSingleQuestion(trimmed)) {
    return trimmed;
  }

  const lines = trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^khi có (?:những )?thông tin/i.test(line))
    .filter((line) => !/^em sẽ (?:giúp|hướng dẫn)/i.test(line));

  const introLines: string[] = [];
  let questionLine: string | null = null;

  for (const line of lines) {
    const isBullet = /^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line);
    const cleaned = line
      .replace(/^[-•*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();

    if (questionLine) continue;

    if ((isBullet || cleaned.includes("?")) && cleaned.includes("?")) {
      questionLine = cleaned;
      continue;
    }

    if (!questionLine && !isBullet) {
      introLines.push(cleaned);
    }
  }

  if (!questionLine) {
    const qIndex = trimmed.indexOf("?");
    if (qIndex >= 0) return trimmed.slice(0, qIndex + 1).trim();
    return trimmed;
  }

  let intro = introLines.join(" ").trim();
  intro = intro
    .replace(
      /(?:,\s*)?(?:để bắt đầu,\s*)?(?:em\s+)?cần biết(?:\s+một chút)?(?:\s+thông tin)?:?\s*$/i,
      "",
    )
    .replace(/:\s*$/, "")
    .trim();

  questionLine = questionLine.replace(/\s+/g, " ").trim();
  const firstQuestionEnd = questionLine.indexOf("?");
  if (firstQuestionEnd >= 0) {
    questionLine = questionLine.slice(0, firstQuestionEnd + 1).trim();
  } else if (!questionLine.endsWith("?")) {
    questionLine = `${questionLine.replace(/[.!…]+$/, "")}?`;
  }

  if (!intro) return questionLine;

  const introSentences = intro.match(/[^.!?]+[.!?]+/g) ?? [intro];
  intro = introSentences.slice(0, 2).join(" ").trim();
  intro = intro.replace(/[.!…]+$/, "");

  return `${intro}. Em muốn hỏi thêm một chút — ${questionLine}`;
}
