import { describe, expect, it } from "vitest";
import {
  formatCurriculumKnowledgeBlock,
  mergeModulesWithAssigned,
} from "./chat-knowledge-curriculum";
import { getLearningModulesByRole, type LearningModuleRecord } from "./learning-modules-data";

const sampleModule: LearningModuleRecord = {
  id: "test-ban-hang",
  role_id: "kinh-doanh",
  title: "Email bán hàng hiệu quả",
  duration_min: 10,
  level: 1,
  sort_order: 1,
  summary: "Viết email chốt sale nhanh hơn với AI",
  content: "Nội dung về bán hàng qua email",
  learnings: ["bán hàng", "email"],
  sections: [{ title: "Mục tiêu", body: "Chốt sale qua email bán hàng" }],
  practice_prompt: "Viết email cho khách hàng",
  tool: null,
  toolReason: null,
  rubric: [],
  attached_file: null,
};

describe("formatCurriculumKnowledgeBlock", () => {
  it("includes module list and starter kit for role", () => {
    const modules = getLearningModulesByRole("kinh-doanh", 0).slice(0, 2);
    const text = formatCurriculumKnowledgeBlock({
      roleId: "kinh-doanh",
      aiLevel: 2,
      progressByModuleId: { [modules[0]!.id]: "dang-hoc" },
      assignedPathTitle: null,
      modules,
      query: "email bán hàng",
    });

    expect(text).toContain("Lộ trình vai trò");
    expect(text).toContain("Starter kit");
    expect(text).toContain("đang học");
    expect(text).toContain("](/lo-trinh/");
    expect(text).toContain("Liên quan câu hỏi hiện tại");
  });

  it("matches Vietnamese query without diacritics", () => {
    const text = formatCurriculumKnowledgeBlock({
      roleId: "kinh-doanh",
      aiLevel: 1,
      progressByModuleId: {},
      assignedPathTitle: null,
      modules: [sampleModule],
      query: "email ban hang",
    });

    expect(text).toContain("Liên quan câu hỏi hiện tại");
    expect(text).toContain("test-ban-hang");
  });

  it("marks assigned required modules in official module list", () => {
    const modules = getLearningModulesByRole("kinh-doanh", 0).slice(0, 1);
    const mod = modules[0]!;
    const text = formatCurriculumKnowledgeBlock({
      roleId: "kinh-doanh",
      aiLevel: 1,
      progressByModuleId: {},
      assignedPathTitle: "Path công ty",
      assignedPathModules: [
        {
          id: mod.id,
          title: mod.title,
          level: mod.level,
          isFoundation: false,
          isRequired: true,
        },
      ],
      modules,
      query: null,
    });

    expect(text).toContain("bắt buộc");
    expect(text).toContain(mod.id);
  });

  it("prioritizes exact title matches over longer modules", () => {
    const longModule: LearningModuleRecord = {
      ...sampleModule,
      id: "long-module",
      title: "Tóm tắt tài liệu",
      summary:
        "Một module rất dài với rất nhiều nội dung nhắc lại email bán hàng và bán hàng và email.",
      content:
        "Nội dung dài dài dài về chủ đề khác nhưng vẫn có nhắc email bán hàng ở giữa đoạn.",
      sections: [
        {
          title: "Mở đầu",
          body:
            "Một đoạn thật dài thật dài thật dài thật dài thật dài về nội dung không liên quan.",
        },
      ],
    };
    const exactModule: LearningModuleRecord = {
      ...sampleModule,
      id: "exact-module",
      title: "Email bán hàng",
      summary: "Mục tiêu viết email bán hàng",
    };
    const text = formatCurriculumKnowledgeBlock({
      roleId: "kinh-doanh",
      aiLevel: 1,
      progressByModuleId: {},
      assignedPathTitle: null,
      modules: [longModule, exactModule],
      query: "email bán hàng",
    });

    const marker = text.indexOf("Liên quan câu hỏi hiện tại");
    const relevantText = marker >= 0 ? text.slice(marker) : text;
    const exactIndex = relevantText.indexOf("exact-module");
    const longIndex = relevantText.indexOf("long-module");
    expect(exactIndex).toBeGreaterThanOrEqual(0);
    expect(longIndex).toBeGreaterThanOrEqual(0);
    expect(exactIndex).toBeLessThan(longIndex);
  });
});

describe("mergeModulesWithAssigned", () => {
  it("puts assigned modules first, preserving company path order", () => {
    const roleModules = getLearningModulesByRole("kinh-doanh", 0).slice(0, 3);
    const third = roleModules[2]!;
    const first = roleModules[0]!;
    const merged = mergeModulesWithAssigned(roleModules, [
      {
        id: third.id,
        title: third.title,
        level: third.level,
        isFoundation: false,
        isRequired: false,
      },
      {
        id: first.id,
        title: first.title,
        level: first.level,
        isFoundation: false,
        isRequired: false,
      },
    ]);
    expect(merged[0]?.id).toBe(third.id);
    expect(merged[1]?.id).toBe(first.id);
  });
});
