import { describe, expect, it } from "vitest";
import {
  buildDemoAgentHealthReport,
  resolveAgentStatus,
} from "@/lib/agent-health";

describe("agent-health", () => {
  it("marks inactive when no calls in 30 days", () => {
    expect(
      resolveAgentStatus({
        runtimeMode: "live",
        callsLast7Days: 0,
        callsLast30Days: 0,
      }),
    ).toBe("inactive");
  });

  it("marks healthy for live agent with recent activity", () => {
    expect(
      resolveAgentStatus({
        runtimeMode: "live",
        callsLast7Days: 3,
        callsLast30Days: 10,
      }),
    ).toBe("healthy");
  });

  it("marks degraded when OpenAI/demo mode without config issues only", () => {
    expect(
      resolveAgentStatus({
        runtimeMode: "demo",
        callsLast7Days: 2,
        callsLast30Days: 5,
      }),
    ).toBe("degraded");
  });

  it("builds demo report with four agents", () => {
    const report = buildDemoAgentHealthReport({
      organizationId: "demo",
      organizationName: "Tổ chức demo",
      role: "manager",
    });
    expect(report.agents).toHaveLength(4);
    expect(report.agents.map((a) => a.id)).toEqual([
      "tutor",
      "grader",
      "recommender",
      "manager-analytics",
    ]);
    expect(report.persisted).toBe(false);
  });
});
