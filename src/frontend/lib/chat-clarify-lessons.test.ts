import { describe, expect, it } from "vitest";
import {
  pickRelatedLessonLinks,
  formatRelatedLessonLinksSection,
} from "./chat-clarify-lessons";

describe("chat-clarify-lessons", () => {
  it("suggests marketing analytics modules for ads report", () => {
    const links = pickRelatedLessonLinks(
      "báo cáo marketing tháng này",
      "Quảng cáo (Google/Facebook Ads)",
      "marketing",
    );
    expect(links.some((l) => l.id === "marketing-m5")).toBe(true);
    expect(formatRelatedLessonLinksSection(links)).toContain(
      "[Đọc số & phân tích hiệu quả chiến dịch](/lo-trinh/marketing-m5)",
    );
  });
});
