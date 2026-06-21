import { describe, expect, it } from "vitest";
import { summarizeChatSessionTitle } from "./chat-session-title";

describe("summarizeChatSessionTitle", () => {
  it("summarizes marketing report request instead of raw question", () => {
    const title = summarizeChatSessionTitle(
      "Okayy giờ nhé, mình đang có nhu cầu làm 1 bài báo cáo marketing cho tháng này nhưng mà tôi chưa biết làm",
    );
    expect(title).toContain("Báo cáo");
    expect(title).toContain("marketing");
    expect(title).not.toContain("Okayy");
    expect(title).not.toContain("chưa biết");
  });

  it("summarizes learning progress question", () => {
    expect(summarizeChatSessionTitle("Mình đang học đến đâu rồi nhỉ?")).toBe(
      "Tiến độ học tập",
    );
  });

  it("summarizes support request for marketing report", () => {
    const title = summarizeChatSessionTitle(
      "Anh đang tính làm báo cáo marketing, e hỗ trợ anh được không?",
    );
    expect(title).toContain("Báo cáo");
    expect(title).toContain("marketing");
    expect(title).not.toMatch(/\?/);
  });

  it("summarizes HR report request with proper domain", () => {
    const title = summarizeChatSessionTitle(
      "Okayy giờ nhé, mình đang có nhu cầu làm 1 bài báo cáo nhân sự cho tháng này nhưng mà tôi chưa biết làm",
    );
    expect(title).toContain("Báo cáo");
    expect(title).toContain("nhân sự");
    expect(title).not.toContain("Okayy");
  });
});
