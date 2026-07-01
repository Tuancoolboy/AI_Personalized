import { describe, expect, it } from "vitest";
import { coerceRoleId, VALID_ROLE_IDS } from "./role-ids";

describe("role-ids", () => {
  it("includes nhan-su in VALID_ROLE_IDS", () => {
    expect(VALID_ROLE_IDS).toContain("nhan-su");
  });

  it("coerceRoleId keeps nhan-su", () => {
    expect(coerceRoleId("nhan-su")).toBe("nhan-su");
  });

  it("coerceRoleId falls back unknown roles to khac", () => {
    expect(coerceRoleId("hr-invalid")).toBe("khac");
    expect(coerceRoleId(null)).toBe("khac");
  });
});
