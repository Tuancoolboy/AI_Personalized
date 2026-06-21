import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({ userId: "demo-user" })),
}));

import { POST } from "./route";

describe("POST /api/hoc-tap/rooms/preview", () => {
  it("rejects preview requests for AI secret rooms", async () => {
    const response = await POST(
      new Request("http://localhost/api/hoc-tap/rooms/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Project AI Quiz",
          topic: "Ứng dụng AI cho onboarding",
          context:
            "Team cần kiểm tra cách dùng AI để phân tích nhu cầu và tạo checklist.",
          questionCount: 8,
          difficulty: "Trung bình",
          roomType: "ai-secret",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "FORBIDDEN",
        message: "Phòng AI bí mật không cho xem trước câu hỏi hoặc đáp án.",
      },
    });
  });
});
