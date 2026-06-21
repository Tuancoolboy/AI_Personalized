import { describe, expect, it } from "vitest";
import {
  enrichWithClarifyBlock,
  finalizeClarifyingAssistantText,
  formatClarifyUserAnswer,
  parseAssistantMessageContent,
  parseClarifyUserAnswer,
} from "./chat-clarify-parse";
import {
  buildClarifyRuntimeHint,
  getClarifyStepTemplate,
} from "./chat-clarify-steps";
import { buildSynthesizedCoachAnswer } from "./chat-clarify-synthesize";

describe("chat-clarify-parse", () => {
  it("parses __CLARIFY__ block from assistant message", () => {
    const raw = `Chào bạn! Em cần hiểu rõ hơn một chút.

__CLARIFY__:{"step":1,"total":3,"question":"Báo cáo này tập trung vào hoạt động marketing nào?","options":["Social media","Quảng cáo","Tổng quan","Khác"]}`;

    const parsed = parseAssistantMessageContent(raw);
    expect(parsed.content).toContain("Em cần hiểu rõ");
    expect(parsed.clarify?.step).toBe(1);
    expect(parsed.clarify?.options).toHaveLength(4);
  });

  it("infers options from inline hay-list", () => {
    const enriched = enrichWithClarifyBlock(
      "Chào bạn! Em muốn hỏi thêm một chút — báo cáo này thuộc loại nào: social media, performance ads, hay tổng kết gửi sếp?",
    );
    const parsed = parseAssistantMessageContent(enriched);
    expect(parsed.clarify?.question).toContain("loại nào");
    expect(parsed.clarify?.options.length).toBeGreaterThanOrEqual(3);
  });

  it("does not infer clarify from question marks inside markdown links", () => {
    const text =
      "Chào bạn! Bạn có thể bắt đầu với module đầu tiên là [AI là gì? Nó giúp được gì cho hành chính & HR](/lo-trinh/hanh-chinh-hr-m1) — bấm để mở và học tiếp.";

    const parsed = parseAssistantMessageContent(enrichWithClarifyBlock(text));
    expect(parsed.clarify).toBeUndefined();
    expect(parsed.content).toContain("[AI là gì? Nó giúp được gì cho hành chính & HR]");
  });

  it("formats user clarify answer as Q/A block", () => {
    expect(
      formatClarifyUserAnswer("Bạn cần output gì?", "Chỉ dàn ý"),
    ).toBe("Q: Bạn cần output gì?\nA: Chỉ dàn ý");
  });

  it("parses clarify user answer", () => {
    const parsed = parseClarifyUserAnswer("Q: Loại báo cáo?\nA: Social media");
    expect(parsed?.answer).toBe("Social media");
  });

  it("replaces yes/no options when question asks which type", () => {
    const enriched = enrichWithClarifyBlock(
      "Em muốn hỏi thêm một chút — Báo cáo này sẽ tập trung vào hoạt động marketing nào?",
      1,
      { namedAddress: "bạn", casualAddress: "bạn", topicHint: "báo cáo marketing tháng này" },
    );
    const parsed = parseAssistantMessageContent(enriched);
    expect(parsed.clarify?.options.some((o) => /^có$/i.test(o))).toBe(false);
    expect(parsed.clarify?.options.some((o) => /social media/i.test(o))).toBe(
      true,
    );
  });

  it("forces step 2 card after user answered step 1", () => {
    const result = finalizeClarifyingAssistantText(
      "Cảm ơn bạn! Vậy bạn có thể cho em biết cụ thể hoạt động marketing mà bạn muốn báo cáo là gì không?",
      2,
      {
        userJustAnsweredClarify: true,
        clarifyCompleted: 1,
        clarifyContext: {
          namedAddress: "bạn",
          casualAddress: "bạn",
          topicHint: "báo cáo marketing tháng này",
        },
      },
    );
    const parsed = parseAssistantMessageContent(result);
    expect(parsed.clarify?.step).toBe(2);
    expect(parsed.clarify?.question).toMatch(/số liệu|tài liệu/i);
  });

  it("strips clarify card after 3 answers — no 4th card", () => {
    const modelText = `Tuyệt! Em sẽ hướng dẫn bạn làm slide báo cáo ads.

Em muốn hỏi thêm một chút — A có muốn tìm hiểu thêm về cách phân tích số liệu không?

__CLARIFY__:{"step":3,"total":3,"question":"A có muốn tìm hiểu thêm?","options":["Có","Không","Khác"]}`;

    const answers = [
      { question: "Q1", answer: "Quảng cáo" },
      { question: "Q2", answer: "Đã có số liệu" },
      { question: "Q3", answer: "Slide thuyết trình" },
    ];

    const result = finalizeClarifyingAssistantText(modelText, 4, {
      userJustAnsweredClarify: true,
      clarifyCompleted: 3,
      clarifyAnswers: answers,
      clarifyContext: { namedAddress: "bạn", casualAddress: "bạn", topicHint: "báo cáo marketing" },
    });

    expect(result).not.toContain("__CLARIFY__");
    expect(result).not.toMatch(/Em muốn hỏi|cần làm rõ/i);
    expect(result).toMatch(/Các bước|Prompt mẫu/i);
    expect(result).toContain("```");
  });

  it("synthesizes coach answer when model asks 4th plain-text question", () => {
    const modelText =
      "Cảm ơn bạn đã cung cấp đầy đủ thông tin. Em muốn hỏi thêm một chút — Mục tiêu chiến dịch là tăng traffic, doanh thu hay nhận diện thương hiệu?";

    const answers = [
      { question: "Q1", answer: "Quảng cáo (Google/Facebook Ads)" },
      { question: "Q2", answer: "Đã có số liệu sẵn" },
      { question: "Q3", answer: "Báo cáo Word hoặc PDF" },
    ];

    const result = finalizeClarifyingAssistantText(modelText, 4, {
      clarifyCompleted: 3,
      clarifyAnswers: answers,
      clarifyContext: { namedAddress: "bạn", casualAddress: "bạn", topicHint: "báo cáo marketing" },
    });

    expect(result).not.toMatch(/Em muốn hỏi|hỏi thêm|cần làm rõ mục tiêu/i);
    expect(result).not.toMatch(/Em là bạn/i);
    expect(result).not.toContain("Việc chốt nội dung cuối cùng");
    expect(result).toContain("```");
    expect(result).toContain("Bạn là trợ lý phân tích marketing");
    expect(result).toMatch(/Bài học liên quan|marketing-m5/i);
    expect(result).toMatch(/Executive Summary|What Worked|What Didn’t Work|Decision Needed/i);
    expect(result).toMatch(/Scale|Fix|Test|Stop/i);
    expect(result).toMatch(/Tư duy cần giữ/i);
  });

  it("still returns canonical prompt and lesson sections even when model answer looks acceptable", () => {
    const modelText = `Cảm ơn bạn đã cung cấp đủ thông tin!

## Tóm tắt nhu cầu
- Chủ đề: Báo cáo nhân sự

## Các bước tự làm
1. Thu thập dữ liệu
2. Phân tích dữ liệu
3. Soạn slide`;

    const answers = [
      { question: "Q1", answer: "Chấm công và nghỉ phép" },
      { question: "Q2", answer: "Chỉ có một phần dữ liệu" },
      { question: "Q3", answer: "Slide thuyết trình" },
    ];

    const result = finalizeClarifyingAssistantText(modelText, 4, {
      clarifyCompleted: 3,
      clarifyAnswers: answers,
      clarifyContext: {
        namedAddress: "bạn",
        casualAddress: "bạn",
        topicHint: "báo cáo nhân sự tháng này",
        roleId: "van-hanh",
      },
    });

    expect(result).toContain("## Prompt mẫu");
    expect(result).toContain("## Chỗ nhập prompt");
    expect(result).toMatch(/Bài học liên quan|van-hanh-m10|van-hanh-m9/i);
  });

  it("adds decision-driven mindset to generic coach synthesis without removing existing guidance", () => {
    const result = buildSynthesizedCoachAnswer(
      {
        namedAddress: "bạn",
        casualAddress: "bạn",
        topicHint: "báo cáo nhân sự tháng này",
        roleId: "van-hanh",
      },
      [
        { question: "Q1", answer: "Chấm công và nghỉ phép" },
        { question: "Q2", answer: "Chỉ có một phần dữ liệu" },
        { question: "Q3", answer: "Báo cáo Word hoặc PDF" },
      ],
      `Cảm ơn bạn đã cung cấp đủ thông tin!

## Tóm tắt nhu cầu
- Chủ đề: Báo cáo nhân sự

## Các bước tự làm
1. Thu thập dữ liệu
2. Phân tích dữ liệu
3. Soạn slide`,
    );

    expect(result).toContain("## Tư duy cần giữ");
    expect(result).toContain("quyết định bước tiếp theo");
    expect(result).toContain("nếu thiếu dữ liệu thì đang thiếu gì");
    expect(result).toContain("## Prompt mẫu");
    expect(result).toContain("## Chỗ nhập prompt");
  });

  it("uses role-specific HR report options instead of marketing options", () => {
    const clarify = getClarifyStepTemplate(1, {
      namedAddress: "bạn",
      casualAddress: "bạn",
      topicHint: "báo cáo nhân sự tháng này",
      roleId: "van-hanh",
    });

    expect(clarify.question).toMatch(/hành chính|HR|nhân sự/i);
    expect(clarify.options.some((o) => /social media|facebook ads/i.test(o))).toBe(false);
    expect(clarify.options.some((o) => /nhân sự|chấm công|tuyển dụng/i.test(o))).toBe(true);
  });

  it("packages completed clarify answers as XML context and forbids re-asking", () => {
    const hint = buildClarifyRuntimeHint(
      3,
      formatClarifyUserAnswer(
        "Deliverable cuối cùng bạn cần dạng nào?",
        "Slide thuyết trình",
      ),
      `\nCác câu đã trả lời:\n1. "Báo cáo tập trung vào gì?" → "Chấm công / nghỉ phép"\n2. "Đã có số liệu chưa?" → "Chưa có — cần hướng dẫn từ đầu"\n3. "Deliverable cuối cùng?" → "Slide thuyết trình"`,
    );

    expect(hint).toContain("<context>");
    expect(hint).toContain("<task>");
    expect(hint).toContain("<format>");
    expect(hint).toContain("<do_not_ask_again>");
    expect(hint).toMatch(/không hỏi lại|CẤM hỏi thêm/i);
  });
});
