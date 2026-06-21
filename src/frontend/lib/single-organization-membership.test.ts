import { describe, expect, it } from "vitest";
import {
  getSingleOrganizationConflict,
  selectCanonicalMembershipRow,
  type OrganizationMembershipRow,
} from "./single-organization-membership";

function row(
  overrides: Partial<OrganizationMembershipRow>,
): OrganizationMembershipRow {
  return {
    organization_id: "org-a",
    member_role: "employee",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    organizations: { name: "Công ty A" },
    ...overrides,
  };
}

describe("single-organization-membership", () => {
  it("allows joining when the user has no memberships", () => {
    expect(getSingleOrganizationConflict([], "org-a")).toEqual({
      hasConflict: false,
    });
  });

  it("allows idempotent writes to the same organization", () => {
    expect(
      getSingleOrganizationConflict([row({ organization_id: "org-a" })], "org-a"),
    ).toEqual({ hasConflict: false });
  });

  it("blocks writes when the user already belongs to another organization", () => {
    expect(
      getSingleOrganizationConflict(
        [
          row({
            organization_id: "org-b",
            organizations: { name: "Công ty B" },
          }),
        ],
        "org-a",
      ),
    ).toEqual({
      hasConflict: true,
      existingOrganizationId: "org-b",
      existingOrganizationName: "Công ty B",
    });
  });

  it("keeps the private organization for the user's email first", () => {
    const canonical = selectCanonicalMembershipRow(
      [
        row({
          organization_id: "default-org",
          member_role: "owner",
          organizations: { name: "Tổ chức mặc định" },
        }),
        row({
          organization_id: "private-org",
          member_role: "manager",
          organizations: { name: "Công ty của mixi@gmail.com" },
          created_at: "2026-06-05T00:00:00.000Z",
        }),
      ],
      "mixi@gmail.com",
    );

    expect(canonical?.organization_id).toBe("private-org");
  });

  it("keeps owner before manager and employee when there is no private organization", () => {
    const canonical = selectCanonicalMembershipRow([
      row({
        organization_id: "employee-org",
        member_role: "employee",
        created_at: "2026-06-01T00:00:00.000Z",
      }),
      row({
        organization_id: "manager-org",
        member_role: "manager",
        created_at: "2026-06-01T00:00:00.000Z",
      }),
      row({
        organization_id: "owner-org",
        member_role: "owner",
        created_at: "2026-06-03T00:00:00.000Z",
      }),
    ]);

    expect(canonical?.organization_id).toBe("owner-org");
  });

  it("keeps the earliest membership when priority is otherwise equal", () => {
    const canonical = selectCanonicalMembershipRow([
      row({
        organization_id: "newer-org",
        member_role: "employee",
        created_at: "2026-06-02T00:00:00.000Z",
      }),
      row({
        organization_id: "older-org",
        member_role: "employee",
        created_at: "2026-06-01T00:00:00.000Z",
      }),
    ]);

    expect(canonical?.organization_id).toBe("older-org");
  });
});
