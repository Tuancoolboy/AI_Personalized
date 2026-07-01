import { describe, expect, it } from "vitest";
import {
  buildExtraSkillLessonsPromptContext,
  findExtraSkillLessonForQuery,
  formatExtraSkillLessonAnswer,
  validateExtraSkillLessonEnrollment,
  EXTRA_SKILL_LESSON_LIMIT,
} from "./extra-skill-lessons";

describe("extra-skill-lessons", () => {
  it("finds a skill lesson outside the current role", () => {
    const lesson = findExtraSkillLessonForQuery(
      "kinh-doanh",
      "viết email nội bộ cho toàn công ty",
    );

    expect(lesson).not.toBeNull();
    expect(lesson?.roleId).not.toBe("kinh-doanh");
    expect(lesson?.moduleId).toMatch(/-/);
  });

  it("formats a cross-role answer with the extra lesson link", () => {
    const answer = formatExtraSkillLessonAnswer(
      "kinh-doanh",
      "viết email nội bộ cho toàn công ty",
    );

    expect(answer).toContain("Kỹ năng khác");
    expect(answer).toContain("/lo-trinh/");
    expect(answer).toContain("?extra=1");
  });

  it("does not match generic learning questions without a concrete skill", () => {
    const lesson = findExtraSkillLessonForQuery("kinh-doanh", "học gì tiếp");

    expect(lesson).toBeNull();
  });

  it("summarizes the extra lesson section and limit", () => {
    const context = buildExtraSkillLessonsPromptContext(
      "kinh-doanh",
      "viết email nội bộ cho toàn công ty",
      2,
      [
        { moduleId: "marketing-m2", title: "Caption đa kênh từ 1 ý", skillLabel: "Viết prompt hiệu quả" },
      ],
    );

    expect(context).toContain("Giới hạn Kỹ năng khác: 2/5");
    expect(context).toContain("Bài đang khớp câu hỏi hiện tại");
    expect(context).toContain("Caption đa kênh từ 1 ý");
    expect(context).toContain("không có nút Bài tiếp theo mặc định");
  });

  it("rejects saving a main-path lesson into Kỹ năng khác", () => {
    expect(() =>
      validateExtraSkillLessonEnrollment(
        "kinh-doanh",
        {
          moduleId: "kinh-doanh-m1",
          skillSlug: "prompt",
          sourceRoleId: "kinh-doanh",
          enrolledAt: new Date().toISOString(),
        },
        [],
      ),
    ).toThrow(/lộ trình chính/);
  });

  it("rejects enrollment when profile role is missing", () => {
    expect(() =>
      validateExtraSkillLessonEnrollment(
        null,
        {
          moduleId: "marketing-m1",
          skillSlug: "prompt",
          sourceRoleId: "marketing",
          enrolledAt: new Date().toISOString(),
        },
        [],
      ),
    ).toThrow(/onboarding/);
  });

  it("rejects enrollment beyond the 5-item cap", () => {
    const current = Array.from({ length: EXTRA_SKILL_LESSON_LIMIT }, (_, index) => ({
      moduleId: `marketing-m${index + 1}`,
      skillSlug: "prompt",
      sourceRoleId: "marketing" as const,
      enrolledAt: new Date().toISOString(),
    }));

    expect(() =>
      validateExtraSkillLessonEnrollment(
        "kinh-doanh",
        {
          moduleId: "van-hanh-m1",
          skillSlug: "prompt",
          sourceRoleId: "van-hanh",
          enrolledAt: new Date().toISOString(),
        },
        current,
      ),
    ).toThrow(/giới hạn 5/);
  });
});
