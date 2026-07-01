import { describe, expect, it } from "vitest";
import { ROLE_LIST, getModulesForUser, getRole } from "./roles";

const EXPECTED_ROLES = [
  "nhan-su",
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
];

describe("roles", () => {
  it("has 6 roles", () => {
    expect(ROLE_LIST).toHaveLength(6);
    expect(ROLE_LIST.map((r) => r.id).sort()).toEqual([...EXPECTED_ROLES].sort());
  });

  it.each(EXPECTED_ROLES)("role %s has >=3 modules and quiz", (roleId) => {
    const role = getRole(roleId);
    expect(role).not.toBeNull();
    expect(role!.modules.length).toBeGreaterThanOrEqual(3);
    expect(role!.quiz.length).toBeGreaterThanOrEqual(10);
    expect(role!.quiz.length).toBeLessThanOrEqual(15);
    expect(role!.starterKit.prompts.length).toBeGreaterThanOrEqual(3);
    expect(role!.starterKit.tools.length).toBeGreaterThanOrEqual(3);
  });

  it("kinh-doanh and ke-toan have different module ids", () => {
    const kd = getRole("kinh-doanh")!;
    const kt = getRole("ke-toan")!;
    expect(kd.modules[0].id).not.toBe(kt.modules[0].id);
  });

  it("getModulesForUser returns all modules at level 0", () => {
    const modules = getModulesForUser("kinh-doanh", 0);
    expect(modules.length).toBe(getRole("kinh-doanh")!.modules.length);
  });

  it("getModulesForUser skips level 1 when aiLevel >= 5", () => {
    const all = getRole("kinh-doanh")!.modules;
    const filtered = getModulesForUser("kinh-doanh", 5);
    expect(filtered.length).toBeLessThan(all.length);
    expect(filtered.every((m) => m.level >= 2)).toBe(true);
  });

  it("returns empty for unknown role", () => {
    expect(getModulesForUser("unknown", 0)).toEqual([]);
  });
});
