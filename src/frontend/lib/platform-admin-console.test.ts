import { describe, expect, it } from "vitest";
import {
  validatePlatformAdminActionInput,
  PLATFORM_ADMIN_ACTIONS,
} from "./platform-admin-console";

describe("platform-admin action validation", () => {
  it("exposes the expected action list", () => {
    expect(PLATFORM_ADMIN_ACTIONS).toContain("toggle-platform-admin");
    expect(PLATFORM_ADMIN_ACTIONS).toContain("rotate-invite-link");
    expect(PLATFORM_ADMIN_ACTIONS).toContain("set-user-activation");
    expect(PLATFORM_ADMIN_ACTIONS).toContain("bulk-set-activation");
  });

  it("rejects invalid roleId in update-user", () => {
    expect(() =>
      validatePlatformAdminActionInput({
        action: "update-user",
        payload: {
          userId: "user-1",
          roleId: "unknown-role",
        },
      }),
    ).toThrow(/VALIDATION:/);
  });

  it("rejects invalid memberRole in update-user", () => {
    expect(() =>
      validatePlatformAdminActionInput({
        action: "update-user",
        payload: {
          userId: "user-1",
          memberRole: "admin",
        },
      }),
    ).toThrow(/VALIDATION:/);
  });

  it("rejects invalid accountType in update-user", () => {
    expect(() =>
      validatePlatformAdminActionInput({
        action: "update-user",
        payload: {
          userId: "user-1",
          accountType: "corp",
        },
      }),
    ).toThrow(/VALIDATION:/);
  });

  it("accepts aiLevel in range for update-user", () => {
    const result = validatePlatformAdminActionInput({
      action: "update-user",
      payload: {
        userId: "user-1",
        aiLevel: 5,
      },
    });

    expect(result.payload.aiLevel).toBe(5);
  });

  it("accepts activation actions", () => {
    const single = validatePlatformAdminActionInput({
      action: "set-user-activation",
      payload: {
        userId: "user-1",
        activated: true,
      },
    });
    expect(single.payload.activated).toBe(true);

    const bulk = validatePlatformAdminActionInput({
      action: "bulk-set-activation",
      payload: {
        userIds: ["user-1", "user-2"],
        activated: true,
      },
    });
    expect(bulk.payload.userIds).toEqual(["user-1", "user-2"]);
  });

  it("accepts bulk activation with platform admin exclusion", () => {
    const bulk = validatePlatformAdminActionInput({
      action: "bulk-set-activation",
      payload: {
        userIds: ["user-1", "admin-1"],
        activated: false,
        excludePlatformAdmins: true,
      },
    });

    expect(bulk.payload.excludePlatformAdmins).toBe(true);
  });

  it("rejects aiLevel outside the allowed range", () => {
    expect(() =>
      validatePlatformAdminActionInput({
        action: "update-user",
        payload: {
          userId: "user-1",
          aiLevel: 6,
        },
      }),
    ).toThrow(/VALIDATION:/);
  });

  it("accepts the learning recommendations reset scope", () => {
    const result = validatePlatformAdminActionInput({
      action: "reset-user-learning",
      payload: {
        userId: "user-1",
        scope: "learning_recommendations",
      },
    });

    expect(result.payload.scope).toBe("learning_recommendations");
  });

  it("rejects invalid organization status and content status", () => {
    expect(() =>
      validatePlatformAdminActionInput({
        action: "toggle-organization-status",
        payload: {
          organizationId: "org-1",
          status: "pending",
        },
      }),
    ).toThrow(/VALIDATION:/);

    expect(() =>
      validatePlatformAdminActionInput({
        action: "set-content-status",
        payload: {
          collection: "learning_modules",
          id: "module-1",
          status: "hidden",
        },
      }),
    ).toThrow(/VALIDATION:/);
  });
});
