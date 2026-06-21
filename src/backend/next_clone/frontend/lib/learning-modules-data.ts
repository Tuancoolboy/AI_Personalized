// Nguồn dữ liệu bài học mở rộng — seed vào Supabase learning_modules.
// Sinh từ ROLES + mở rộng sections / content đầy đủ cho từng module.

import {
  ROLES,
  type AttachedFile,
  type RoleModule,
  type RubricCriterion,
} from "@/lib/roles";

export type { AttachedFile, RubricCriterion };

export type ModuleSection = {
  title: string;
  body: string;
};

export type LearningModuleRecord = {
  id: string;
  role_id: string;
  title: string;
  duration_min: number;
  level: 1 | 2 | 3;
  sort_order: number;
  summary: string;
  content: string;
  learnings: string[];
  sections: ModuleSection[];
  practice_prompt: string;
  // Tool chuyên dụng theo bài (mục 3); NULL = dùng tool chính công ty.
  tool: string | null;
  toolReason: string | null;
  // Rubric chấm điểm (mục 1); rỗng = chấm tự do như Phase 1.
  rubric: RubricCriterion[];
  // File mẫu đính kèm (Phần C §5); null = bài không có file.
  attached_file: AttachedFile | null;
};

const ROLE_CONTEXT: Record<string, string> = {
  "kinh-doanh": "nhân viên kinh doanh / bán hàng tại SME Việt Nam",
  "ke-toan": "nhân viên kế toán tại doanh nghiệp vừa và nhỏ",
  marketing: "nhân viên marketing nội bộ hoặc agency nhỏ",
  "van-hanh": "nhân viên vận hành / hành chính / điều phối",
  khac: "nhân viên văn phòng đa nhiệm",
};

function pickPracticePrompt(roleId: string, moduleIndex: number): string {
  const prompts = ROLES[roleId]?.starterKit.prompts ?? [];
  return prompts[moduleIndex % prompts.length]?.prompt ?? "";
}

function expandModule(
  roleId: string,
  mod: RoleModule,
  sortOrder: number,
): LearningModuleRecord {
  const ctx = ROLE_CONTEXT[roleId] ?? "nhân viên";
  const practice = mod.practicePrompt ?? pickPracticePrompt(roleId, sortOrder - 1);

  const levelLabel =
    mod.level === 1 ? "Nhập môn" : mod.level === 2 ? "Trung cấp" : "Nâng cao";

  const sections: ModuleSection[] = [
    {
      title: "Mục tiêu bài học",
      body: `Sau ${mod.durationMin} phút, bạn — ${ctx} — sẽ nắm được: ${mod.learnings.join("; ")}. Đây là bài ${levelLabel} trong lộ trình, bám sát công việc thực tế chứ không đi vào lý thuyết AI trừu tượng.`,
    },
    {
      title: "Nội dung chính",
      body: mod.content,
    },
    {
      title: "Các bước áp dụng ngay",
      body: `1) Mở công cụ AI bạn đang dùng (ChatGPT, Claude…).\n2) Copy prompt thực hành ở cuối bài — chỉnh [NGẶC] cho đúng tình huống của bạn.\n3) Đọc kết quả AI, chỉnh lại giọng văn / số liệu cho sát thực tế.\n4) Dùng thử trong 1 việc nhỏ hôm nay (email, tóm tắt, checklist…).\n5) Đánh dấu hoàn thành khi đã thử ít nhất 1 lần.`,
    },
    {
      title: "Lưu ý an toàn & chất lượng",
      body:
        roleId === "ke-toan" || roleId === "kinh-doanh"
          ? "Không dán tên khách, số tài khoản, hợp đồng mật, bảng lương lên công cụ AI công cộng. Mô tả tình huống chung, ẩn danh dữ liệu. Mọi con số AI đưa ra phải đối chiếu sổ gốc trước khi dùng."
          : "Không đưa dữ liệu nội bộ nhạy cảm (nhân sự, hợp đồng, mật khẩu) lên AI công cộng. Luôn biên tập lại — AI làm nháp, bạn chịu trách nhiệm nội dung gửi đi.",
    },
  ];

  const content = [
    mod.content,
    "",
    "**Bạn sẽ học được:**",
    ...mod.learnings.map((l) => `• ${l}`),
    "",
    "**Thực hành:** Dùng prompt mẫu cuối bài trong công việc hôm nay. Không cần hoàn hảo — mục tiêu là quen tay và thấy AI tiết kiệm được bao nhiêu phút.",
  ].join("\n");

  return {
    id: mod.id,
    role_id: roleId,
    title: mod.title,
    duration_min: mod.durationMin,
    level: mod.level,
    sort_order: sortOrder,
    summary: mod.content,
    content,
    learnings: mod.learnings,
    sections,
    practice_prompt: practice,
    tool: mod.tool ?? null,
    toolReason: mod.toolReason ?? null,
    rubric: mod.rubric ?? [],
    attached_file: mod.attachedFile ?? null,
  };
}

export const LEARNING_MODULES: LearningModuleRecord[] = Object.entries(ROLES).flatMap(
  ([roleId, role]) =>
    role.modules.map((mod, idx) => expandModule(roleId, mod, idx + 1)),
);

export function getLearningModuleById(
  moduleId: string,
): LearningModuleRecord | null {
  return LEARNING_MODULES.find((m) => m.id === moduleId) ?? null;
}

export function getLearningModulesByRole(
  roleId: string,
  aiLevel = 0,
): LearningModuleRecord[] {
  const list = LEARNING_MODULES.filter((m) => m.role_id === roleId).sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  if (aiLevel >= 5) {
    return list.filter((m) => m.level >= 2);
  }
  return list;
}

export function getNextModuleId(
  roleId: string,
  currentModuleId: string,
  aiLevel = 0,
): string | null {
  const modules = getLearningModulesByRole(roleId, aiLevel);
  const idx = modules.findIndex((m) => m.id === currentModuleId);
  if (idx < 0 || idx >= modules.length - 1) return null;
  return modules[idx + 1]?.id ?? null;
}

export function resolveNextModuleId(
  modules: LearningModuleRecord[],
  currentModuleId: string,
): string | null {
  const sorted = [...modules].sort((a, b) => a.sort_order - b.sort_order);
  const idx = sorted.findIndex((m) => m.id === currentModuleId);
  if (idx < 0 || idx >= sorted.length - 1) return null;
  return sorted[idx + 1]?.id ?? null;
}
