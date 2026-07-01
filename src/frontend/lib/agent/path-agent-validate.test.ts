import { describe, expect, it } from "vitest";
import { buildCandidatePool, getRoleSkillSlugs } from "./path-agent-catalog";
import { buildFallbackPath } from "./path-agent-fallback";
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
  goalTags: [],
  assessmentGapModuleIds: [],
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

  it("output rỗng khi mọi id bịa (individual, không lộ trình giao)", () => {
    const input: AgentFlowInput = {
      ...companyInput,
      flow: "individual",
      assignedPathModules: [],
      assignedPathTitle: null,
    };
    const out = validateAgentOutput(
      {
        groups: [
          { title: "X", reason: "", moduleIds: ["id-bia-1", "id-bia-2"] },
        ],
      },
      pool,
      input,
    );
    expect(out.orderedModuleIds.length).toBe(0);
  });

  it("output rỗng khi tất cả module đã hoàn thành (individual)", () => {
    const roleId = "nhan-su";
    const input: AgentFlowInput = {
      flow: "individual",
      roleId,
      aiLevel: 1,
      skillSlugs: getRoleSkillSlugs(roleId),
      primaryTool: "chatgpt",
      completedModuleIds: [],
      dailyTasks: [],
      goalTags: [],
      assessmentGapModuleIds: [],
    };
    const hrPool = buildCandidatePool(input);
    const allDone = {
      ...input,
      completedModuleIds: hrPool.map((m) => m.id),
    };
    const out = validateAgentOutput(
      {
        groups: [
          {
            title: "All",
            reason: "",
            moduleIds: hrPool.map((m) => m.id),
          },
        ],
      },
      hrPool,
      allDone,
    );
    expect(out.orderedModuleIds.length).toBe(0);
  });

  it("HR (nhan-su): pool có module HR; fallback ưu tiên gap assessment", () => {
    const roleId = "nhan-su";
    const gapId = "nhan-su-m1";
    const input: AgentFlowInput = {
      flow: "individual",
      roleId,
      aiLevel: 1,
      skillSlugs: getRoleSkillSlugs(roleId),
      primaryTool: "chatgpt",
      completedModuleIds: [],
      dailyTasks: ["tuyen-dung"],
      goalTags: ["tuyen-dung"],
      assessmentGapModuleIds: [gapId],
    };
    const hrPool = buildCandidatePool(input);
    expect(hrPool.some((m) => m.id === gapId && m.roleId === "nhan-su")).toBe(
      true,
    );
    const result = buildFallbackPath(input, "fp-hr");
    expect(result.orderedModuleIds[0]).toBe(gapId);
    expect(result.source).toBe("fallback");
  });

  it("HR (nhan-su): validate giữ module gap khi agent chọn đúng id", () => {
    const roleId = "nhan-su";
    const gapId = "nhan-su-m1";
    const input: AgentFlowInput = {
      flow: "individual",
      roleId,
      aiLevel: 1,
      skillSlugs: getRoleSkillSlugs(roleId),
      primaryTool: "chatgpt",
      completedModuleIds: [],
      dailyTasks: [],
      goalTags: ["tuyen-dung"],
      assessmentGapModuleIds: [gapId],
    };
    const hrPool = buildCandidatePool(input);
    const foundationId = hrPool.find((m) => m.isFoundation)!.id;
    const out = validateAgentOutput(
      {
        groups: [
          { title: "Gap", reason: "", moduleIds: [gapId] },
          { title: "Nền tảng", reason: "", moduleIds: [foundationId] },
        ],
      },
      hrPool,
      input,
    );
    expect(out.orderedModuleIds).toContain(gapId);
    expect(out.orderedModuleIds[0]).toBe(foundationId);
  });
});
