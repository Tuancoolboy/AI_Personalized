import { describe, expect, it } from "vitest";
import { buildCandidatePool } from "./path-agent-catalog";
import type { AgentFlowInput } from "./path-agent-types";
import { MAX_MODULES, validateAgentOutput } from "./path-agent-validate";

const companyInput: AgentFlowInput = {
  flow: "company",
  roleId: "van-hanh",
  aiLevel: 1,
  skillSlugs: ["loc-cv", "email-noi-bo", "van-ban-hanh-chinh"],
  primaryTool: "claude",
  completedModuleIds: [],
  dailyTasks: [],
  assignedPathModules: [
    {
      id: "company-path-m1",
      title: "Lộ trình công ty",
      level: 2,
      isFoundation: false,
      isRequired: true,
    },
  ],
};

const pool = buildCandidatePool(companyInput);
const someFoundationId = pool.find((m) => m.isFoundation)!.id;
const someSkillId = pool.find((m) => !m.isFoundation)!.id;

describe("validateAgentOutput", () => {
  it("loại id bịa, chỉ giữ id ∈ kho", () => {
    const out = validateAgentOutput(
      {
        groups: [
          { title: "X", reason: "r", moduleIds: [someSkillId, "id-bia-khong-co"] },
        ],
      },
      pool,
      companyInput,
    );
    expect(out.orderedModuleIds).toContain(someSkillId);
    expect(out.orderedModuleIds).not.toContain("id-bia-khong-co");
  });

  it("ưu tiên Nền tảng đứng trước bài kỹ năng (khi không có lộ trình giao)", () => {
    const inputWithoutAssigned = {
      ...companyInput,
      assignedPathModules: [],
    };
    const out = validateAgentOutput(
      {
        groups: [
          { title: "Kỹ năng", reason: "", moduleIds: [someSkillId] },
          { title: "Nền tảng", reason: "", moduleIds: [someFoundationId] },
        ],
      },
      pool,
      inputWithoutAssigned,
    );
    expect(out.orderedModuleIds[0]).toBe(someFoundationId);
  });

  it("cap tối đa MAX_MODULES bài", () => {
    const many = pool.map((m) => m.id);
    const out = validateAgentOutput(
      { groups: [{ title: "All", reason: "", moduleIds: many }] },
      pool,
      companyInput,
    );
    expect(out.orderedModuleIds.length).toBeLessThanOrEqual(MAX_MODULES);
  });

  it("bỏ bài đã hoàn thành", () => {
    const input = { ...companyInput, completedModuleIds: [someSkillId] };
    const out = validateAgentOutput(
      { groups: [{ title: "X", reason: "", moduleIds: [someSkillId] }] },
      pool,
      input,
    );
    expect(out.orderedModuleIds).not.toContain(someSkillId);
  });

  it("level cao (>=5) bỏ bài nhập môn level 1 không phải nền tảng", () => {
    const basic = pool.find((m) => m.level === 1 && !m.isFoundation);
    if (!basic) return; // pool công ty có thể không có → skip
    const input = { ...companyInput, aiLevel: 5 };
    const out = validateAgentOutput(
      { groups: [{ title: "X", reason: "", moduleIds: [basic.id] }] },
      pool,
      input,
    );
    expect(out.orderedModuleIds).not.toContain(basic.id);
  });

  it("khử trùng id trùng giữa các nhóm", () => {
    const out = validateAgentOutput(
      {
        groups: [
          { title: "A", reason: "", moduleIds: [someFoundationId] },
          { title: "B", reason: "", moduleIds: [someFoundationId] },
        ],
      },
      pool,
      companyInput,
    );
    const count = out.orderedModuleIds.filter((id) => id === someFoundationId)
      .length;
    expect(count).toBe(1);
  });

  it("bao gồm module trong lộ trình công ty nếu có", () => {
    expect(pool.some((m) => m.id === "company-path-m1")).toBe(true);
  });

  it("giữ thứ tự lộ trình công ty giao trước nền tảng", () => {
    const input = {
      ...companyInput,
      assignedPathModules: [
        {
          id: "company-path-m1",
          title: "Path",
          level: 2 as const,
          isFoundation: false,
          isRequired: true,
        },
        {
          id: someFoundationId,
          title: "Foundation",
          level: 1 as const,
          isFoundation: true,
          isRequired: true,
        },
      ],
    };
    const out = validateAgentOutput(
      {
        groups: [
          { title: "Nền tảng", reason: "", moduleIds: [someFoundationId] },
          { title: "Path", reason: "", moduleIds: ["company-path-m1"] },
        ],
      },
      pool,
      input,
    );
    expect(out.orderedModuleIds[0]).toBe("company-path-m1");
    expect(out.orderedModuleIds[1]).toBe(someFoundationId);
  });

  it("company: validate tự giữ lộ trình công ty dù agent bỏ sót", () => {
    const input = {
      ...companyInput,
      assignedPathModules: [
        {
          id: "company-path-m1",
          title: "Lộ trình công ty",
          level: 2 as const,
          isFoundation: false,
          isRequired: true,
        },
      ],
    };
    const out = validateAgentOutput(
      {
        groups: [{ title: "Kỹ năng", reason: "", moduleIds: [someSkillId] }],
      },
      pool,
      input,
    );
    expect(out.orderedModuleIds[0]).toBe("company-path-m1");
    expect(out.groups[0]?.title).toContain("Lộ trình công ty");
  });

  it("giữ module bắt buộc trong lộ trình khi cap MAX_MODULES", () => {
    if (pool.length <= MAX_MODULES) return;
    const many = pool.map((m) => m.id);
    const out = validateAgentOutput(
      { groups: [{ title: "All", reason: "", moduleIds: many }] },
      pool,
      companyInput,
    );
    expect(out.orderedModuleIds.length).toBeLessThanOrEqual(MAX_MODULES);
    expect(out.orderedModuleIds).toContain("company-path-m1");
  });
});
