import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCandidatePool, getRoleSkillSlugs } from "./path-agent-catalog";
import type { AgentFlowInput } from "./path-agent-types";

const logSpy = vi.fn();

vi.mock("./path-agent-log", () => ({
  logPathFallback: (...args: unknown[]) => logSpy(...args),
}));

vi.mock("@/lib/openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/openai")>();
  return {
    ...actual,
    isOpenAIConfigured: vi.fn(() => false),
    getOpenAIClient: vi.fn(() => null),
  };
});

import { generatePath } from "./path-agent";

function hrInput(overrides: Partial<AgentFlowInput> = {}): AgentFlowInput {
  const roleId = "nhan-su";
  const aiLevel = 1;
  return {
    flow: "individual",
    roleId,
    aiLevel,
    skillSlugs: getRoleSkillSlugs(roleId),
    primaryTool: "chatgpt",
    completedModuleIds: [],
    dailyTasks: ["tuyen-dung"],
    goalTags: ["tuyen-dung"],
    assessmentGapModuleIds: ["nhan-su-m1"],
    ...overrides,
  };
}

describe("generatePath", () => {
  beforeEach(() => {
    logSpy.mockClear();
  });

  it("HR (nhan-su): fallback vẫn trả lộ trình đúng vai trò + source", async () => {
    const input = hrInput();
    const result = await generatePath(input, "fp-hr");
    expect(result.source).toBe("fallback");
    expect(result.flow).toBe("individual");
    expect(result.orderedModuleIds.length).toBeGreaterThan(0);
    const pool = buildCandidatePool(input);
    const hrModuleIds = new Set(
      pool.filter((m) => m.roleId === "nhan-su").map((m) => m.id),
    );
    expect(result.orderedModuleIds.some((id) => hrModuleIds.has(id))).toBe(true);
  });

  it("logs structured fallback reason when OpenAI not configured", async () => {
    const input = hrInput();
    await generatePath(input, "fp-log");
    expect(logSpy).toHaveBeenCalledWith(
      "no-key",
      expect.objectContaining({ roleId: "nhan-su" }),
      undefined,
    );
  });
});
