import { describe, expect, it, vi } from "vitest";
import {
  roleIdToLegacyDepartmentId,
  syncMemberDepartmentFromRole,
} from "@/lib/member-department-sync";

describe("member-department-sync", () => {
  it("maps valid role ids to legacy department ids", () => {
    expect(roleIdToLegacyDepartmentId("kinh-doanh")).toBe("kinh-doanh");
    expect(roleIdToLegacyDepartmentId("invalid-role")).toBeNull();
  });

  it("updates employee department when role changes", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                member_role: "employee",
                department_id: "khac",
              },
              error: null,
            }),
          }),
        }),
        update,
      }),
    };

    const result = await syncMemberDepartmentFromRole(
      supabase as never,
      "user-1",
      "marketing",
    );

    expect(result).toEqual({ updated: true });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ department_id: "marketing" }),
    );
  });

  it("skips managers and already-synced memberships", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                member_role: "manager",
                department_id: "khac",
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn(),
      }),
    };

    await expect(
      syncMemberDepartmentFromRole(supabase as never, "user-1", "marketing"),
    ).resolves.toEqual({ updated: false, skippedReason: "not-employee" });
  });
});
