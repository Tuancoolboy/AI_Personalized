import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveApiSession: vi.fn(),
  isPlatformAdmin: vi.fn(),
  cookies: vi.fn(),
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/api-auth", () => ({
  resolveApiSession: mocks.resolveApiSession,
}));

vi.mock("@/lib/rbac", () => ({
  isPlatformAdmin: mocks.isPlatformAdmin,
}));

vi.mock("@/lib/supabase/is-configured", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
  DEMO_PLATFORM_ADMIN_COOKIE: "ai_troly_demo_platform_admin",
}));

describe("platform-admin whoami route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns demo cookie state when Supabase is not configured", async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === "ai_troly_demo_platform_admin"
          ? { value: "true" }
          : undefined,
    });

    const { GET } = await import("./route");
    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      isPlatformAdmin: boolean;
    };

    expect(body.isPlatformAdmin).toBe(true);
  });

  it("returns true for real platform admin", async () => {
    mocks.isSupabaseConfigured.mockReturnValue(true);
    mocks.resolveApiSession.mockResolvedValue({
      mode: "supabase",
      userId: "user-1",
    });
    mocks.isPlatformAdmin.mockResolvedValue(true);

    const { GET } = await import("./route");
    const response = await GET();
    const body = (await response.json()) as {
      ok: boolean;
      isPlatformAdmin: boolean;
    };

    expect(body.isPlatformAdmin).toBe(true);
  });
});
