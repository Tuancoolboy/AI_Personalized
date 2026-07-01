import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  isSupabaseConfigured: vi.fn(() => true),
  loadLearningActivationRecord: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/kiem-tra-quiz", () => ({
  KiemTraQuiz: () => null,
}));

vi.mock("@/lib/supabase/is-configured", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));

vi.mock("@/lib/learning-activation", () => ({
  loadLearningActivationRecord: mocks.loadLearningActivationRecord,
}));

import KiemTraPage from "./page";

function renderPage(query: { from?: string; quiz?: string } = {}) {
  return KiemTraPage({
    params: Promise.resolve({ roleId: "marketing" }),
    searchParams: Promise.resolve(query),
  });
}

describe("KiemTraPage access guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.loadLearningActivationRecord.mockResolvedValue({
      roleId: "marketing",
      learningActivated: true,
      isManager: false,
      isPlatformAdmin: false,
    });
  });

  it("redirects unauthenticated real-mode users to login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    await expect(renderPage()).rejects.toThrow("redirect:/login");
    expect(mocks.loadLearningActivationRecord).not.toHaveBeenCalled();
  });

  it("redirects users without onboarding role before showing the quiz", async () => {
    mocks.loadLearningActivationRecord.mockResolvedValue({
      roleId: null,
      learningActivated: false,
      isManager: false,
      isPlatformAdmin: false,
    });

    await expect(renderPage()).rejects.toThrow("redirect:/onboarding");
  });

  it("redirects pending learners before showing the quiz", async () => {
    mocks.loadLearningActivationRecord.mockResolvedValue({
      roleId: "marketing",
      learningActivated: false,
      isManager: false,
      isPlatformAdmin: false,
    });

    await expect(renderPage()).rejects.toThrow("redirect:/cho-kich-hoat");
  });

  it("keeps hoc-tap quiz routing for activated learners", async () => {
    const result = (await renderPage({
      from: "hoc-tap",
      quiz: "ai-marketing",
    })) as ReactElement<{
      roleId: string;
      returnHref: string;
      hocTapQuizId: string | null;
    }>;

    expect(result.props).toMatchObject({
      roleId: "marketing",
      returnHref: "/hoc-tap",
      hocTapQuizId: "ai-marketing",
    });
  });
});
