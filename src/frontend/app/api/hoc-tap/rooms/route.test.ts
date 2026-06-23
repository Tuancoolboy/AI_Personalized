import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({ userId: "demo-user" })),
}));

import { resetHocTapRoomStoreForTests } from "@/lib/hoc-tap-room-store";
import { POST } from "./route";

describe("POST /api/hoc-tap/rooms", () => {
  beforeEach(() => {
    resetHocTapRoomStoreForTests();
  });

  it("creates a system-hosted room when a user enters quiz mode as player", async () => {
    const response = await POST(
      new Request("http://localhost/api/hoc-tap/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: "Lan Anh",
          avatarSeed: "lan-anh::option-5",
          quizId: "ai-marketing",
          mode: "classic",
          mapTheme: "duck-race",
          roomType: "host-review",
          maxPlayers: 20,
          entryRole: "player",
          locked: true,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toMatchObject({
      participantId: expect.any(String),
      persisted: false,
      source: "memory",
      room: {
        status: "waiting",
        phase: "waiting",
        hostMode: "system",
        hostName: "AI Host",
        isLocked: true,
        mapTheme: "duck-race",
        participantCount: 1,
      },
    });
    expect(data.room.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Lan Anh",
          avatarUrl: expect.stringContaining("lan-anh%3A%3Aoption-5"),
        }),
      ]),
    );
  });

  it("creates a system-hosted ai-project room when a user enters as player", async () => {
    const response = await POST(
      new Request("http://localhost/api/hoc-tap/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostName: "Lan Anh",
          mode: "classic",
          mapTheme: "duck-race",
          roomType: "host-review",
          maxPlayers: 20,
          entryRole: "player",
          aiProject: {
            title: "Project AI Quiz",
            topic: "Ứng dụng AI cho onboarding",
            context:
              "Team cần kiểm tra cách dùng AI để phân tích nhu cầu và tạo checklist.",
            questionCount: 3,
            difficulty: "Trung bình",
          },
          questions: [
            {
              question: "AI nên hỗ trợ bước nào đầu tiên?",
              options: ["Phân tích nhu cầu", "Đổi logo", "Tắt chat", "Xóa brief"],
              correctIndex: 0,
              explanation: "Luôn bắt đầu từ nhu cầu thực tế của team.",
            },
            {
              question: "System host dùng để làm gì?",
              options: [
                "Tự chạy countdown",
                "Trả lời thay user",
                "Sửa điểm thủ công",
                "Ẩn luôn đáp án",
              ],
              correctIndex: 0,
              explanation: "Host hệ thống chỉ điều phối flow phòng.",
            },
            {
              question: "Sau khi trả lời nên thấy gì?",
              options: [
                "Màu đúng/sai rồi mới sang leaderboard",
                "Reload trang",
                "Về dashboard ngay",
                "Không có phản hồi",
              ],
              correctIndex: 0,
              explanation: "Cần có pha hiện đáp án trước leaderboard.",
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      participantId: expect.any(String),
      persisted: false,
      source: "memory",
      room: {
        status: "waiting",
        phase: "waiting",
        hostMode: "system",
        hostName: "AI Host",
        mapTheme: "duck-race",
        participantCount: 1,
      },
    });
  });
});
