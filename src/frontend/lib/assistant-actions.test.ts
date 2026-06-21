import { describe, expect, it } from "vitest";
import { getAssistantNavActions } from "./assistant-actions";

describe("assistant-actions", () => {
  it("returns onboarding actions when no role", () => {
    const actions = getAssistantNavActions(null, "employee");
    expect(actions.some((a) => a.kind === "navigate" && a.href === "/onboarding")).toBe(
      true,
    );
  });

  it("returns manager leads route", () => {
    const actions = getAssistantNavActions(null, "manager");
    expect(
      actions.some((a) => a.kind === "navigate" && a.href === "/quan-ly/leads"),
    ).toBe(true);
  });

  it("returns employee routes when role set", () => {
    const actions = getAssistantNavActions("kinh-doanh", "employee");
    expect(actions.some((a) => a.kind === "navigate" && a.href === "/lo-trinh")).toBe(
      true,
    );
    expect(
      actions.some(
        (a) => a.kind === "navigate" && a.href === "/kiem-tra/kinh-doanh",
      ),
    ).toBe(true);
  });
});
