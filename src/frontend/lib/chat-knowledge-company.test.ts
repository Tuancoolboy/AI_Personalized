import { describe, expect, it } from "vitest";
import {
  buildAssignedPathContext,
  formatOrganizationLearningContext,
} from "./chat-knowledge-company";

describe("buildAssignedPathContext", () => {
  it("merges modules from multiple assignments in one batch map", () => {
    const modulesByPathId = new Map([
      [
        "path-a",
        [
          {
            learning_path_id: "path-a",
            legacy_module_id: "m-a1",
            is_required: true,
            training_modules: { title: "Bài A1", level: 1 },
          },
        ],
      ],
      [
        "path-b",
        [
          {
            learning_path_id: "path-b",
            legacy_module_id: "m-b1",
            is_required: false,
            training_modules: { title: "Bài B1", level: 2 },
          },
        ],
      ],
    ]);

    const result = buildAssignedPathContext(
      [
        {
          learning_path_id: "path-a",
          learning_paths: { title: "Path A" },
        },
        {
          learning_path_id: "path-b",
          learning_paths: { title: "Path B" },
        },
      ],
      modulesByPathId,
    );

    expect(result.assignedPathTitle).toContain("Path A");
    expect(result.assignedPathTitle).toContain("+1 lộ trình khác");
    expect(result.assignedPathModules.map((mod) => mod.id)).toEqual([
      "m-a1",
      "m-b1",
    ]);
    expect(result.assignedPathModules[0]?.isRequired).toBe(true);
  });
});

describe("formatOrganizationLearningContext", () => {
  it("includes org, department, assigned path, and modules", () => {
    const text = formatOrganizationLearningContext({
      organizationName: "Công ty A",
      departmentId: "marketing",
      departmentLabel: "Marketing",
      companyTool: "chatgpt",
      assignedPathTitle: "Marketing Path",
      assignedPathModules: [
        {
          id: "m1",
          title: "Bài 1",
          level: 1,
          isFoundation: false,
          isRequired: true,
        },
      ],
    });

    expect(text).toContain("Công ty A");
    expect(text).toContain("Marketing");
    expect(text).toContain("Marketing Path");
    expect(text).toContain("Bài 1");
    expect(text).toContain("bắt buộc");
  });
});
