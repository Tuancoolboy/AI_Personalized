import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
  sendActivationEmail: vi.fn(),
  logAuditEvent: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock("@/lib/email/send-activation-email", () => ({
  sendActivationEmail: mocks.sendActivationEmail,
}));

vi.mock("@/lib/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

function createProfileState(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    full_name: "Nguyen Van A",
    email: "user@example.com",
    role_id: "kinh-doanh",
    learning_activated: false,
    learning_activated_at: null,
    learning_activated_by: null,
    activation_email_sent_at: null,
    account_type: "company",
    phone_number: null,
    created_at: "2026-06-20T00:00:00.000Z",
    updated_at: "2026-06-20T00:00:00.000Z",
    ...overrides,
  };
}

function buildServiceClient(profileState: Record<string, unknown>) {
  const profiles = {
    select: () => profiles,
    eq: () => profiles,
    maybeSingle: async () => ({ data: profileState, error: null }),
    update: (patch: Record<string, unknown>) => ({
      eq: async () => {
        Object.assign(profileState, patch);
        return { data: null, error: null };
      },
    }),
  };

  const noopChain = {
    select: () => noopChain,
    update: () => noopChain,
    delete: () => noopChain,
    eq: () => noopChain,
  };

  return {
    from: (table: string) => {
      if (table === "profiles") return profiles;
      if (table === "learning_recommendations") return noopChain;
      if (table === "organization_members") return noopChain;
      if (table === "module_progress") return noopChain;
      if (table === "quiz_results") return noopChain;
      if (table === "time_logs") return noopChain;
      if (table === "chat_usage") return noopChain;
      if (table === "chat_conversations") return noopChain;
      if (table === "chat_memories") return noopChain;
      if (table === "aha_reflections") return noopChain;
      if (table === "points_ledger") return noopChain;
      if (table === "learning_assignments") return noopChain;
      return noopChain;
    },
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user: {
              id,
              email: profileState.email,
              user_metadata: { full_name: profileState.full_name },
            },
          },
          error: null,
        }),
      },
    },
  };
}

describe("platform-admin activation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("activates a user and sends activation email once", async () => {
    const profileState = createProfileState();
    mocks.createSupabaseServiceClient.mockReturnValue(buildServiceClient(profileState));
    mocks.sendActivationEmail.mockResolvedValue({ delivered: true, skipped: false });

    const { performPlatformAdminAction } = await import("./platform-admin-console");

    const first = await performPlatformAdminAction({
      action: "set-user-activation",
      actorId: "admin-1",
      payload: { userId: "user-1", activated: true },
    });

    const second = await performPlatformAdminAction({
      action: "set-user-activation",
      actorId: "admin-1",
      payload: { userId: "user-1", activated: true },
    });

    expect(first.ok).toBe(true);
    expect(first.message).toContain("kích hoạt");
    expect(profileState.learning_activated).toBe(true);
    expect(profileState.activation_email_sent_at).toBeTruthy();
    expect(mocks.sendActivationEmail).toHaveBeenCalledTimes(1);
    expect(mocks.sendActivationEmail).toHaveBeenCalledWith(
      "user@example.com",
      "Nguyen Van A",
      "kinh-doanh",
    );
    expect(second.message).toContain("đã được kích hoạt trước đó");
    expect(mocks.logAuditEvent).toHaveBeenCalled();
  });

  it("bulk activates only pending users", async () => {
    const userA = createProfileState({ id: "user-a", email: "a@example.com" });
    const userB = createProfileState({
      id: "user-b",
      email: "b@example.com",
      learning_activated: true,
      learning_activated_at: "2026-06-20T00:00:00.000Z",
    });
    const states = new Map([
      [userA.id, userA],
      [userB.id, userB],
    ]);
    mocks.createSupabaseServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table !== "profiles") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
            delete: () => ({ eq: async () => ({ data: null, error: null }) }),
          };
        }
        return {
          select: () => ({
            eq: (field: string, value: string) => ({
              maybeSingle: async () => ({
                data: states.get(value) ?? null,
                error: null,
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_field: string, value: string) => {
              const current = states.get(value);
              if (current) Object.assign(current, patch);
              return { data: null, error: null };
            },
          }),
        };
      },
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: {
              user: {
                id,
                email: states.get(id)?.email,
                user_metadata: { full_name: states.get(id)?.full_name },
              },
            },
            error: null,
          }),
        },
      },
    } as never);
    mocks.sendActivationEmail.mockResolvedValue({ delivered: true, skipped: false });

    const { performPlatformAdminAction } = await import("./platform-admin-console");
    const result = await performPlatformAdminAction({
      action: "bulk-set-activation",
      actorId: "admin-1",
      payload: { userIds: ["user-a", "user-b"], activated: true },
    });

    expect(result.ok).toBe(true);
    expect(userA.learning_activated).toBe(true);
    expect(userB.learning_activated).toBe(true);
    expect(mocks.sendActivationEmail).toHaveBeenCalledTimes(1);
  });

  it("bulk deactivates users while skipping platform admins when requested", async () => {
    const employee = createProfileState({
      id: "employee-1",
      email: "employee@example.com",
      learning_activated: true,
    });
    const admin = createProfileState({
      id: "admin-1",
      email: "admin@example.com",
      learning_activated: true,
    });
    const states = new Map([
      [employee.id, employee],
      [admin.id, admin],
    ]);

    mocks.createSupabaseServiceClient.mockReturnValue({
      from: (table: string) => {
        if (table === "platform_admins") {
          return {
            select: async () => ({
              data: [{ user_id: "admin-1" }],
              error: null,
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: () => ({
              eq: (_field: string, value: string) => ({
                maybeSingle: async () => ({
                  data: states.get(value) ?? null,
                  error: null,
                }),
              }),
            }),
            update: (patch: Record<string, unknown>) => ({
              eq: async (_field: string, value: string) => {
                const current = states.get(value);
                if (current) Object.assign(current, patch);
                return { data: null, error: null };
              },
            }),
          };
        }
        return {
          select: async () => ({ data: [], error: null }),
          update: () => ({ eq: async () => ({ data: null, error: null }) }),
          delete: () => ({ eq: async () => ({ data: null, error: null }) }),
        };
      },
      auth: {
        admin: {
          getUserById: async (id: string) => ({
            data: {
              user: {
                id,
                email: states.get(id)?.email,
                user_metadata: { full_name: states.get(id)?.full_name },
              },
            },
            error: null,
          }),
        },
      },
    } as never);

    const { performPlatformAdminAction } = await import("./platform-admin-console");
    const result = await performPlatformAdminAction({
      action: "bulk-set-activation",
      actorId: "operator-1",
      payload: {
        userIds: ["employee-1", "admin-1"],
        activated: false,
        excludePlatformAdmins: true,
      },
    });

    expect(result.ok).toBe(true);
    expect(employee.learning_activated).toBe(false);
    expect(admin.learning_activated).toBe(true);
    expect(result.data?.skippedPlatformAdminIds).toEqual(["admin-1"]);
  });
});
