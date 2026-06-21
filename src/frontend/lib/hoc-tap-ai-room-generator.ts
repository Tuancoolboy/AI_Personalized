import {
  getOpenAIClient,
  getOpenAIModel,
  isOpenAIConfigured,
} from "@/lib/openai";
import {
  HocTapRoomError,
  type HocTapRoomQuestionInput,
  type HocTapRoomType,
} from "@/lib/hoc-tap-room-store";

export type HocTapAiRoomDifficulty =
  | "Dễ"
  | "Trung bình"
  | "Khó"
  | "Thực chiến";

export type HocTapAiRoomQuestionSource = "openai" | "fallback";

export type HocTapAiRoomPreviewInput = {
  title: string;
  topic: string;
  context: string;
  questionCount: number;
  difficulty: HocTapAiRoomDifficulty;
  roomType: HocTapRoomType;
};

export type HocTapAiRoomPreviewResult = HocTapAiRoomPreviewInput & {
  questions: HocTapRoomQuestionInput[];
  source: HocTapAiRoomQuestionSource;
};

const MIN_AI_QUESTIONS = 3;
const MAX_AI_QUESTIONS = 30;
const DEFAULT_QUESTION_COUNT = 8;
const DEFAULT_TITLE = "Project AI Quiz";
const DEFAULT_TOPIC = "Project AI";
const DEFAULT_CONTEXT =
  "Team đang học cách dùng AI vào một project thực tế và cần kiểm tra hiểu biết trước khi áp dụng.";
const DIFFICULTIES: HocTapAiRoomDifficulty[] = [
  "Dễ",
  "Trung bình",
  "Khó",
  "Thực chiến",
];

const QUESTION_VERBS: Record<HocTapAiRoomDifficulty, string[]> = {
  Dễ: ["Nhận biết", "Chọn", "Xác định", "Nêu"],
  "Trung bình": ["Phân tích", "Lựa chọn", "Sắp xếp", "Đánh giá"],
  Khó: ["Thiết kế", "Tối ưu", "So sánh", "Kiểm chứng"],
  "Thực chiến": [
    "Xử lý tình huống",
    "Ra quyết định",
    "Đề xuất hành động",
    "Audit",
  ],
};

const QUESTION_ANGLES = [
  "mục tiêu quan trọng nhất",
  "dữ liệu đầu vào cần cung cấp cho AI",
  "rủi ro khi áp dụng AI",
  "prompt phù hợp để triển khai",
  "tiêu chí đánh giá kết quả AI tạo ra",
  "bước kiểm tra trước khi dùng kết quả AI",
  "hành động tiếp theo sau khi AI đưa gợi ý",
] as const;

const CORRECT_ANSWERS = [
  "Xác định rõ mục tiêu, dữ liệu đầu vào và tiêu chí đánh giá trước khi dùng AI.",
  "Dùng context project cụ thể, có vai trò người dùng, dữ liệu liên quan và đầu ra mong muốn.",
  "Kiểm tra lại độ chính xác, bảo mật dữ liệu và tính phù hợp với quy trình thực tế.",
  "So sánh kết quả AI với tiêu chí thành công của project trước khi áp dụng.",
] as const;

const DISTRACTORS = [
  "Chỉ cần nhập một câu lệnh ngắn, không cần mô tả bối cảnh.",
  "Dùng nguyên kết quả AI mà không cần kiểm tra lại.",
  "Ưu tiên câu trả lời dài nhất thay vì câu trả lời đúng với mục tiêu.",
  "Bỏ qua dữ liệu và quy trình hiện tại của team.",
] as const;

export function normalizeHocTapAiRoomPreviewInput(
  raw: Record<string, unknown>,
): HocTapAiRoomPreviewInput {
  const title = sanitizeSingleLine(raw.title, 90) || DEFAULT_TITLE;
  const topic = sanitizeSingleLine(raw.topic, 140) || DEFAULT_TOPIC;
  const context = sanitizeMultiline(raw.context, 6000) || DEFAULT_CONTEXT;
  const questionCount = clampQuestionCount(raw.questionCount);
  const difficulty = normalizeDifficulty(raw.difficulty);
  const roomType = normalizeRoomType(raw.roomType);

  if (title.length < 2) {
    throw new HocTapRoomError("INVALID_INPUT", "Tên phòng cần từ 2 ký tự.");
  }
  if (topic.length < 2) {
    throw new HocTapRoomError("INVALID_INPUT", "Chủ đề project cần từ 2 ký tự.");
  }
  if (context.length < 10) {
    throw new HocTapRoomError(
      "INVALID_INPUT",
      "Context project cần ít nhất 10 ký tự.",
    );
  }

  return { title, topic, context, questionCount, difficulty, roomType };
}

export async function generateHocTapAiRoomQuestions(
  input: HocTapAiRoomPreviewInput,
): Promise<HocTapAiRoomPreviewResult> {
  const openAiQuestions = await generateQuestionsWithOpenAI(input);
  if (openAiQuestions) {
    return {
      ...input,
      questions: openAiQuestions,
      source: "openai",
    };
  }

  return {
    ...input,
    questions: generateFallbackQuestions(input),
    source: "fallback",
  };
}

export function generateFallbackQuestions(
  input: HocTapAiRoomPreviewInput,
): HocTapRoomQuestionInput[] {
  return Array.from({ length: input.questionCount }, (_, index) => {
    const verb = QUESTION_VERBS[input.difficulty][index % QUESTION_VERBS[input.difficulty].length];
    const angle = QUESTION_ANGLES[index % QUESTION_ANGLES.length];
    const contextHint =
      input.context
        .split(/[,.\n]/)
        .map((item) => item.trim())
        .find(Boolean) ?? "bối cảnh dự án";
    const correct = `${CORRECT_ANSWERS[index % CORRECT_ANSWERS.length]} Chủ đề: “${input.topic}”.`;

    return {
      question: `${verb} ${angle} trong project “${input.topic}” khi context là: ${contextHint}?`,
      options: [correct, ...DISTRACTORS.slice(0, 3)],
      correctIndex: 0,
      explanation:
        "Đáp án đúng luôn bám mục tiêu, context, kiểm chứng và tiêu chí áp dụng thực tế thay vì dùng AI một cách mơ hồ.",
    };
  });
}

function clampQuestionCount(value: unknown): number {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : DEFAULT_QUESTION_COUNT;
  if (!Number.isFinite(numeric)) return DEFAULT_QUESTION_COUNT;
  return Math.min(MAX_AI_QUESTIONS, Math.max(MIN_AI_QUESTIONS, Math.floor(numeric)));
}

function normalizeDifficulty(value: unknown): HocTapAiRoomDifficulty {
  return DIFFICULTIES.includes(value as HocTapAiRoomDifficulty)
    ? (value as HocTapAiRoomDifficulty)
    : "Trung bình";
}

function normalizeRoomType(value: unknown): HocTapRoomType {
  return value === "ai-secret" ? "ai-secret" : "host-review";
}

function sanitizeSingleLine(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultiline(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

async function generateQuestionsWithOpenAI(
  input: HocTapAiRoomPreviewInput,
): Promise<HocTapRoomQuestionInput[] | null> {
  if (!isOpenAIConfigured()) return null;
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: getOpenAIModel(),
      temperature: 0.25,
      max_tokens: Math.min(5000, Math.max(1200, input.questionCount * 260)),
      messages: [
        {
          role: "system",
          content:
            "Bạn là AI tạo câu hỏi trắc nghiệm cho nhân viên Việt Nam học cách áp dụng AI vào project thật. Chỉ trả JSON hợp lệ, không markdown. Schema: {\"questions\":[{\"question\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"correctIndex\":0,\"explanation\":\"...\"}]}. Mỗi câu có đúng 4 options, correctIndex từ 0-3, explanation ngắn. Không đưa dữ liệu nhạy cảm mới ngoài context user cung cấp.",
        },
        {
          role: "user",
          content: JSON.stringify({
            title: input.title,
            topic: input.topic,
            difficulty: input.difficulty,
            questionCount: input.questionCount,
            context: input.context,
          }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const parsed = parseQuestionJson(content);
    return normalizeGeneratedQuestions(parsed, input.questionCount);
  } catch {
    return null;
  }
}

function parseQuestionJson(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) throw new Error("empty");

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstObject = trimmed.indexOf("{");
    const lastObject = trimmed.lastIndexOf("}");
    if (firstObject >= 0 && lastObject > firstObject) {
      return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
    }
    const firstArray = trimmed.indexOf("[");
    const lastArray = trimmed.lastIndexOf("]");
    if (firstArray >= 0 && lastArray > firstArray) {
      return JSON.parse(trimmed.slice(firstArray, lastArray + 1));
    }
    throw new Error("invalid-json");
  }
}

function normalizeGeneratedQuestions(
  parsed: unknown,
  expectedCount: number,
): HocTapRoomQuestionInput[] {
  const maybeQuestions =
    Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (parsed as { questions?: unknown }).questions
        : null;
  if (!Array.isArray(maybeQuestions)) {
    throw new Error("missing-questions");
  }

  const questions = maybeQuestions
    .slice(0, expectedCount)
    .map((item, index) => normalizeGeneratedQuestion(item, index));
  if (questions.length < MIN_AI_QUESTIONS) {
    throw new Error("too-few-questions");
  }
  return questions;
}

function normalizeGeneratedQuestion(
  item: unknown,
  index: number,
): HocTapRoomQuestionInput {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`invalid-question-${index + 1}`);
  }
  const row = item as Record<string, unknown>;
  const question = sanitizeSingleLine(row.question, 500);
  const options = Array.isArray(row.options)
    ? row.options
        .map((option) => sanitizeSingleLine(option, 220))
        .filter(Boolean)
        .slice(0, 4)
    : [];
  const correctIndex =
    typeof row.correctIndex === "number" ? Math.floor(row.correctIndex) : -1;
  const explanation = sanitizeSingleLine(row.explanation, 600);

  if (question.length < 8) {
    throw new Error(`short-question-${index + 1}`);
  }
  if (options.length !== 4) {
    throw new Error(`invalid-options-${index + 1}`);
  }
  if (correctIndex < 0 || correctIndex >= options.length) {
    throw new Error(`invalid-correct-${index + 1}`);
  }
  if (explanation.length < 8) {
    throw new Error(`short-explanation-${index + 1}`);
  }

  return { question, options, correctIndex, explanation };
}
