// Lưu trữ tạm Aha Moment trong localStorage (demo mode).
// Khi Supabase bật → ghi vào bảng aha_reflections (migration 0013).

export type AhaVisibility = "private" | "department" | "company";

export type DemoAhaReflection = {
  id: string;
  moduleId: string;
  insight: string;
  linkPrior: string;
  nextAction: string;
  visibility: AhaVisibility;
  aiQuestion?: string;
  createdAt: string;
};

const KEY = "ai_troly_demo_aha";

function read(): DemoAhaReflection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoAhaReflection[]) : [];
  } catch {
    return [];
  }
}

function write(value: DemoAhaReflection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // ignore quota / privacy errors
  }
}

export function getDemoAhaReflections(): DemoAhaReflection[] {
  return read();
}

export function addDemoAhaReflection(
  input: Omit<DemoAhaReflection, "id" | "createdAt">,
): DemoAhaReflection {
  const entry: DemoAhaReflection = {
    ...input,
    id: `aha-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: new Date().toISOString(),
  };
  write([entry, ...read()]);
  return entry;
}

// Câu hỏi đào sâu mẫu (dùng khi chưa bật OpenAI). Bám vào câu trả lời để
// nghe tự nhiên hơn, không dồn câu hỏi.
export function buildFallbackAhaQuestion(insight: string): string {
  const trimmed = insight.trim();
  const topic =
    trimmed.length > 0
      ? trimmed.replace(/[.!?…]+$/, "")
      : "điều bạn vừa nhận ra";
  return `Nếu áp dụng "${topic}" vào một việc thật trong tuần này, bạn nghĩ rào cản lớn nhất là gì — và bạn sẽ vượt qua nó thế nào?`;
}
