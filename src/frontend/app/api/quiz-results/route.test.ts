import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHocTapQuiz } from "@/lib/hoc-tap-quiz-catalog";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: vi.fn(async () => ({
    mode: "supabase",
    userId: "user-1",
  })),
}));

vi.mock("@/lib/supabase/is-configured", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    rpc: mocks.rpc,
  }),
  createSupabaseServiceClient: () => ({
    rpc: mocks.rpc,
  }),
}));

vi.mock("@/lib/hoc-tap-audience", () => ({
  resolveHocTapAudience: vi.fn(async () => ({
    organizationId: "org-1",
    organizationName: "Công ty A",
    type: "company",
    departmentId: "marketing",
  })),
}));

import { POST } from "./route";

describe("POST /api/quiz-results hoc-tap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({
      data: {
        score: 100,
        passed: true,
        xp_earned: 100,
        total_xp: 100,
        level: 2,
        current_level_xp: 0,
        target_level_xp: 100,
        idempotent: false,
      },
      error: null,
    });
  });

  it("grades answers on the server and ignores a spoofed client score", async () => {
    const quiz = getHocTapQuiz("ai-marketing")!;
    const answers = quiz.questions.map((question) => question.correctIndex);
    const attemptId = "01945d36-3b7d-4c2d-8fd1-d8d469a38991";

    const response = await POST(
      new Request("http://localhost/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: "marketing",
          quizId: quiz.id,
          answers,
          attemptId,
          score: 0,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_hoc_tap_quiz_attempt",
      expect.objectContaining({
        p_user_id: "user-1",
        p_quiz_id: quiz.id,
        p_role_id: "marketing",
        p_score: 100,
        p_max_xp: quiz.xp,
        p_attempt_id: attemptId,
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      score: 100,
      xpEarned: 100,
      totalXp: 100,
      level: 2,
      passed: true,
    });
  });

  it("rejects a quiz that does not match the submitted role", async () => {
    const quiz = getHocTapQuiz("ai-marketing")!;
    const response = await POST(
      new Request("http://localhost/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: "kinh-doanh",
          quizId: quiz.id,
          answers: quiz.questions.map((question) => question.correctIndex),
          attemptId: "d0ef397f-4ed2-42f0-bb11-0696369a6ae8",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("returns an idempotent retry without inventing extra XP", async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: {
        score: 75,
        passed: true,
        xp_earned: 0,
        total_xp: 75,
        level: 1,
        current_level_xp: 75,
        target_level_xp: 100,
        idempotent: true,
      },
      error: null,
    });
    const quiz = getHocTapQuiz("ai-marketing")!;

    const response = await POST(
      new Request("http://localhost/api/quiz-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: "marketing",
          quizId: quiz.id,
          answers: [0, 1, 0, 1],
          attemptId: "01945d36-3b7d-4c2d-8fd1-d8d469a38991",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      xpEarned: 0,
      totalXp: 75,
      idempotent: true,
    });
  });
});
