import { describe, expect, it } from "vitest";
import { buildFallbackPath } from "./path-agent-fallback";
import {
  buildDeptPreviewInput,
  buildSupabaseFlowInput,
  computeFingerprint,
  resolveFlowInput,
} from "./path-agent-input";
import type { AgentFlowInput } from "./path-agent-types";

const demoSession = { mode: "demo", userId: "demo-user" } as const;

describe("resolveFlowInput (demo mode = cá nhân)", () => {
  it("map vị trí + level từ hint, luồng cá nhân", async () => {
    const input = await resolveFlowInput(demoSession, {
      roleId: "kinh-doanh",
      aiLevel: 3,
      completedModuleIds: ["kinh-doanh-m1"],
      dailyTasks: ["email"],
    });
    expect(input.flow).toBe("individual");
    expect(input.roleId).toBe("kinh-doanh");
    expect(input.aiLevel).toBe(3);
    expect(input.completedModuleIds).toContain("kinh-doanh-m1");
    expect(Array.isArray(input.skillSlugs)).toBe(true);
    expect(input.primaryTool).toBeTruthy();
    expect(input.assignedPathModules).toEqual([]);
  });

  it("vai trò có gắn skills (van-hanh) → skillSlugs suy từ vai trò", async () => {
    const input = await resolveFlowInput(demoSession, { roleId: "van-hanh" });
    expect(input.skillSlugs.length).toBeGreaterThan(0);
  });

  it("clamp level ngoài [0,5] và roleId rỗng → khac", async () => {
    const input = await resolveFlowInput(demoSession, { aiLevel: 99 });
    expect(input.aiLevel).toBe(5);
    expect(input.roleId).toBe("khac");
  });
});

describe("buildSupabaseFlowInput (Supabase org flow)", () => {
  const learningContext = {
    organizationName: "Cty Demo",
    departmentId: "van-hanh" as const,
    departmentLabel: "Vận hành",
    companyTool: "chatgpt",
    assignedPathTitle: "Onboarding vận hành",
    assignedPathModules: [
      {
        id: "van-hanh-m1",
        title: "Module path",
        level: 1 as const,
        isFoundation: false,
        isRequired: true,
      },
    ],
  };

  it("organization_members có org → luồng công ty + assigned path", () => {
    const input = buildSupabaseFlowInput({
      roleId: "van-hanh",
      aiLevel: 2,
      dailyTasks: ["email"],
      completedModuleIds: ["van-hanh-m1"],
      organizationId: "org-uuid",
      positionSkillSlugs: [],
      learningContext,
    });
    expect(input.flow).toBe("company");
    expect(input.organizationName).toBe("Cty Demo");
    expect(input.assignedPathTitle).toBe("Onboarding vận hành");
    expect(input.assignedPathModules.map((m) => m.id)).toEqual(["van-hanh-m1"]);
    expect(input.primaryTool).toBe("chatgpt");
  });

  it("không thuộc org → luồng cá nhân, bỏ assigned path", () => {
    const input = buildSupabaseFlowInput({
      roleId: "kinh-doanh",
      aiLevel: 1,
      dailyTasks: [],
      completedModuleIds: [],
      organizationId: null,
      positionSkillSlugs: [],
      learningContext,
    });
    expect(input.flow).toBe("individual");
    expect(input.assignedPathModules).toEqual([]);
    expect(input.organizationName).toBeNull();
  });

  it("org member có position skills → ưu tiên skill từ vị trí", () => {
    const input = buildSupabaseFlowInput({
      roleId: "van-hanh",
      aiLevel: 1,
      dailyTasks: [],
      completedModuleIds: [],
      organizationId: "org-uuid",
      positionSkillSlugs: ["loc-cv", "email-noi-bo"],
      learningContext,
    });
    expect(input.skillSlugs).toEqual(["loc-cv", "email-noi-bo"]);
  });
});

describe("buildDeptPreviewInput (preview phòng ban)", () => {
  it("map skill list + vị trí + level → input luồng công ty", () => {
    const input = buildDeptPreviewInput({
      skillSlugs: ["loc-cv", "email-noi-bo", "loc-cv"],
      roleId: "van-hanh",
      aiLevel: 2,
      primaryTool: "chatgpt",
    });
    expect(input.flow).toBe("company");
    expect(input.roleId).toBe("van-hanh");
    expect(input.aiLevel).toBe(2);
    expect(input.skillSlugs).toEqual(["loc-cv", "email-noi-bo"]); // khử trùng
    expect(input.primaryTool).toBe("chatgpt");
    expect(input.completedModuleIds).toEqual([]);
  });

  it("mặc định level=1, role=khac, tool hợp lệ khi thiếu", () => {
    const input = buildDeptPreviewInput({ skillSlugs: ["loc-cv"] });
    expect(input.aiLevel).toBe(1);
    expect(input.roleId).toBe("khac");
    expect(input.primaryTool).toBeTruthy();
  });
});

describe("computeFingerprint", () => {
  const base: AgentFlowInput = {
    flow: "individual",
    roleId: "marketing",
    aiLevel: 2,
    skillSlugs: ["a", "b"],
    primaryTool: "chatgpt",
    completedModuleIds: ["m1", "m2"],
    dailyTasks: ["x"],
    organizationName: "Cty A",
    departmentId: "marketing",
    assignedPathTitle: "Path marketing",
    assignedPathModules: [
      { id: "m3", title: "Module 3", level: 2, isFoundation: false, isRequired: true },
    ],
  };

  it("ổn định khi đầu vào không đổi (kể cả thứ tự skill/completed)", () => {
    const fp1 = computeFingerprint(base);
    const fp2 = computeFingerprint({
      ...base,
      skillSlugs: ["b", "a"],
      completedModuleIds: ["m2", "m1"],
      dailyTasks: ["x"],
    });
    expect(fp1).toBe(fp2);
  });

  it("đổi khi level / completed thay đổi", () => {
    const fp1 = computeFingerprint(base);
    expect(computeFingerprint({ ...base, aiLevel: 4 })).not.toBe(fp1);
    expect(
      computeFingerprint({ ...base, completedModuleIds: ["m1"] }),
    ).not.toBe(fp1);
  });

  it("đổi khi lộ trình công ty thay đổi", () => {
    const fp1 = computeFingerprint(base);
    expect(
      computeFingerprint({
        ...base,
        assignedPathTitle: "Path marketing mới",
      }),
    ).not.toBe(fp1);
  });
});

describe("buildFallbackPath (cả 2 luồng)", () => {
  it("company: ưu tiên nền tảng, id hợp lệ, không rỗng", () => {
    const input: AgentFlowInput = {
      flow: "company",
      roleId: "van-hanh",
      aiLevel: 1,
      skillSlugs: ["loc-cv", "email-noi-bo"],
      primaryTool: "claude",
      completedModuleIds: [],
      dailyTasks: [],
      organizationName: "Cty B",
      departmentId: "van-hanh",
      assignedPathTitle: "Onboarding vận hành",
      assignedPathModules: [
        {
          id: "van-hanh-m1",
          title: "Module path",
          level: 1,
          isFoundation: false,
          isRequired: true,
        },
      ],
    };
    const r = buildFallbackPath(input, "fp1");
    expect(r.source).toBe("fallback");
    expect(r.orderedModuleIds.length).toBeGreaterThan(0);
    expect(r.fingerprint).toBe("fp1");
    expect(r.groups.some((g) => g.title.includes("Lộ trình công ty"))).toBe(true);
  });

  it("individual: lộ trình theo vai trò, không rỗng", () => {
    const input: AgentFlowInput = {
      flow: "individual",
      roleId: "ke-toan",
      aiLevel: 0,
      skillSlugs: [],
      primaryTool: "copilot",
      completedModuleIds: [],
      dailyTasks: [],
    };
    const r = buildFallbackPath(input, "fp2");
    expect(r.flow).toBe("individual");
    expect(r.orderedModuleIds.length).toBeGreaterThan(0);
  });

  it("kỹ năng không có bài → missingSkills, KHÔNG rỗng lộ trình", () => {
    const input: AgentFlowInput = {
      flow: "company",
      roleId: "van-hanh",
      aiLevel: 1,
      skillSlugs: ["loc-cv", "ky-nang-khong-ton-tai"],
      primaryTool: "claude",
      completedModuleIds: [],
      dailyTasks: [],
    };
    const r = buildFallbackPath(input, "fp3");
    expect(r.missingSkills.length).toBeGreaterThan(0);
    expect(r.orderedModuleIds.length).toBeGreaterThan(0);
  });
});
