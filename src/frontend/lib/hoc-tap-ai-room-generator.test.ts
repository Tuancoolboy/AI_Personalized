import { describe, expect, it } from "vitest";
import { normalizeHocTapAiRoomPreviewInput } from "./hoc-tap-ai-room-generator";

describe("normalizeHocTapAiRoomPreviewInput", () => {
  it("defaults AI-generated rooms to 10 questions", () => {
    expect(
      normalizeHocTapAiRoomPreviewInput({
        title: "Project AI Quiz",
        topic: "Ứng dụng AI",
        context: "Team cần luyện ứng dụng AI vào quy trình thật.",
        difficulty: "Trung bình",
        roomType: "host-review",
      }).questionCount,
    ).toBe(10);
  });

  it("caps AI-generated room question count at 15", () => {
    expect(
      normalizeHocTapAiRoomPreviewInput({
        title: "Project AI Quiz",
        topic: "Ứng dụng AI",
        context: "Team cần luyện ứng dụng AI vào quy trình thật.",
        difficulty: "Trung bình",
        questionCount: 30,
        roomType: "host-review",
      }).questionCount,
    ).toBe(15);
  });
});
