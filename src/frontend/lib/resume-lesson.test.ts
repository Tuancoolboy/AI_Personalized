import { describe, expect, it } from "vitest";
import { getLearningModulesByRole } from "./learning-modules-data";
import { resolveResumeLesson } from "./resume-lesson";

describe("resolveResumeLesson", () => {
  it("prefers dang-hoc module over next chua-hoc", () => {
    const modules = getLearningModulesByRole("marketing", 0);
    const first = modules[0]!;
    const second = modules[1]!;

    const lesson = resolveResumeLesson("marketing", {
      [first.id]: "hoan-thanh",
      [second.id]: "dang-hoc",
    });

    expect(lesson?.moduleId).toBe(second.id);
    expect(lesson?.status).toBe("dang-hoc");
    expect(lesson?.href).toBe(`/lo-trinh/${second.id}`);
  });

  it("falls back to first incomplete module", () => {
    const modules = getLearningModulesByRole("marketing", 0);
    const first = modules[0]!;

    const lesson = resolveResumeLesson("marketing", {});

    expect(lesson?.moduleId).toBe(first.id);
    expect(lesson?.status).toBe("chua-hoc");
  });

  it("returns null when all modules are complete", () => {
    const modules = getLearningModulesByRole("marketing", 0);
    const progress = Object.fromEntries(
      modules.map((mod) => [mod.id, "hoan-thanh"]),
    );

    expect(resolveResumeLesson("marketing", progress)).toBeNull();
  });
});
