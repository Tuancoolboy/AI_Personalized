import { describe, expect, it } from "vitest";
import { normalizeAccountType, roleSatisfies } from "./rbac";

describe("rbac roleSatisfies", () => {
  it("platform_admin satisfies every role", () => {
    expect(roleSatisfies("platform_admin", "member")).toBe(true);
    expect(roleSatisfies("platform_admin", "org_admin")).toBe(true);
    expect(roleSatisfies("platform_admin", "platform_admin")).toBe(true);
  });

  it("member does not satisfy manager/org_admin", () => {
    expect(roleSatisfies("member", "manager")).toBe(false);
    expect(roleSatisfies("member", "org_admin")).toBe(false);
    expect(roleSatisfies("member", "member")).toBe(true);
  });

  it("manager satisfies member but not org_admin", () => {
    expect(roleSatisfies("manager", "member")).toBe(true);
    expect(roleSatisfies("manager", "org_admin")).toBe(false);
  });
});

describe("rbac normalizeAccountType", () => {
  it("defaults to company and only allows individual override", () => {
    expect(normalizeAccountType("individual")).toBe("individual");
    expect(normalizeAccountType("company")).toBe("company");
    expect(normalizeAccountType(null)).toBe("company");
    expect(normalizeAccountType("garbage")).toBe("company");
  });
});
