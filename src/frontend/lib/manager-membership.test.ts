import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORGANIZATION_NAME,
  managerPrivateOrganizationName,
  selectManagerMembership,
  type ManagerMembershipRow,
} from "./manager-membership";

function row(
  overrides: Partial<ManagerMembershipRow>,
): ManagerMembershipRow {
  return {
    organization_id: "org-default",
    member_role: "manager",
    updated_at: "2026-06-10T10:00:00.000Z",
    created_at: "2026-06-10T09:00:00.000Z",
    organizations: { name: DEFAULT_ORGANIZATION_NAME },
    ...overrides,
  };
}

describe("manager-membership", () => {
  it("builds stable private organization names from email", () => {
    expect(managerPrivateOrganizationName(" Ronaldo36@Gmail.com ")).toBe(
      "Công ty của ronaldo36@gmail.com",
    );
  });

  it("prefers a private organization over default organization", () => {
    const selected = selectManagerMembership([
      row({ organization_id: "org-default" }),
      row({
        organization_id: "org-private",
        organizations: { name: "Công ty của manager@example.com" },
      }),
    ]);

    expect(selected?.organizationId).toBe("org-private");
  });

  it("keeps default organization when it is the only manager membership", () => {
    const selected = selectManagerMembership([row({})]);

    expect(selected?.organizationId).toBe("org-default");
    expect(selected?.organizationName).toBe(DEFAULT_ORGANIZATION_NAME);
  });

  it("prefers owner role over manager role", () => {
    const selected = selectManagerMembership([
      row({
        organization_id: "org-private-manager",
        organizations: { name: "Công ty manager" },
      }),
      row({
        organization_id: "org-default-owner",
        member_role: "owner",
      }),
    ]);

    expect(selected?.organizationId).toBe("org-default-owner");
    expect(selected?.role).toBe("owner");
  });

  it("prefers the most recently updated private organization", () => {
    const selected = selectManagerMembership([
      row({
        organization_id: "org-old",
        updated_at: "2026-06-10T10:00:00.000Z",
        organizations: { name: "Công ty cũ" },
      }),
      row({
        organization_id: "org-new",
        updated_at: "2026-06-11T10:00:00.000Z",
        organizations: { name: "Công ty mới" },
      }),
    ]);

    expect(selected?.organizationId).toBe("org-new");
  });
});
