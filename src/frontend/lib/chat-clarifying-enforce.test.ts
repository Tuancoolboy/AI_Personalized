import { describe, expect, it } from "vitest";
import {
  enforceSingleClarifyingQuestion,
  shouldEnforceSingleQuestion,
} from "./chat-clarifying-enforce";

const BULLET_RESPONSE = `Chào bạn! Em rất vui khi bạn muốn làm báo cáo marketing cho tháng này. Để bắt đầu, em cần biết một chút thông tin:

- Bạn có thể cho em biết số liệu cụ thể muốn đưa vào báo cáo không? Ví dụ: số liệu từ Meta Ads, GA4 hoặc các chỉ số khác?

- Đối tượng báo cáo là ai: sếp, team hay khách hàng?

Khi có những thông tin này, em sẽ giúp bạn xây dựng khung báo cáo phù hợp!`;

describe("chat-clarifying-enforce", () => {
  it("detects multi-question bullet clarifying response", () => {
    expect(shouldEnforceSingleQuestion(BULLET_RESPONSE)).toBe(true);
  });

  it("keeps only one question with natural bridge", () => {
    const result = enforceSingleClarifyingQuestion(BULLET_RESPONSE);
    expect(result.match(/\?/g)?.length ?? 0).toBe(1);
    expect(result).not.toContain("Đối tượng báo cáo");
    expect(result).not.toContain("Khi có những thông tin");
    expect(result).toContain("Em muốn hỏi thêm một chút");
    expect(result).toContain("số liệu");
  });

  it("does not change single-question coaching reply", () => {
    const single =
      "Em muốn hỏi bạn thêm một chút — báo cáo này ai sẽ đọc: sếp, team hay khách?";
    expect(shouldEnforceSingleQuestion(single)).toBe(false);
    expect(enforceSingleClarifyingQuestion(single)).toBe(single);
  });

  it("does not change instructional bullet steps without clarifying", () => {
    const steps = `Đây là các bước:
- Bước 1: xác định mục tiêu
- Bước 2: chọn kênh`;
    expect(shouldEnforceSingleQuestion(steps)).toBe(false);
  });
});
