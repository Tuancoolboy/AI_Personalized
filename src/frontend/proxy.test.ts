import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { proxy } from "./proxy";

function createRequest(pathname: string, cookie = "") {
  return new NextRequest(`http://localhost${pathname}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function makeRealSupabaseMock({
  userId,
  email,
  roleId = null,
  learningActivated = false,
  memberRole = null,
  platformAdmin = false,
}: {
  userId: string;
  email: string;
  roleId?: string | null;
  learningActivated?: boolean;
  memberRole?: "owner" | "manager" | "employee" | null;
  platformAdmin?: boolean;
}) {
  const builder = (table: string) => {
    const query: Record<string, unknown> = {
      select: () => query,
      eq: () => query,
      in: () => query,
      limit: () => query,
      maybeSingle: async () => {
        if (table === "profiles") {
          return {
            data: roleId
              ? { role_id: roleId, learning_activated: learningActivated }
              : null,
            error: null,
          };
        }
        if (table === "organization_members") {
          return { data: memberRole ? { member_role: memberRole } : null, error: null };
        }
        if (table === "platform_admins") {
          return {
            data: platformAdmin ? { user_id: userId } : null,
            error: null,
          };
        }
        return { data: null, error: null };
      },
    };
    return query;
  };

  return {
    auth: {
      getUser: async () => ({ data: { user: { id: userId, email } }, error: null }),
    },
    from: builder,
  };
}

describe("proxy RBAC", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    mocks.createServerClient.mockReset();
  });

  it("redirects unauthenticated users away from /van-hanh to /van-hanh/login", async () => {
    const response = await proxy(createRequest("/van-hanh"));
    expect(response.headers.get("location")).toContain("/van-hanh/login");
  });

  it("keeps /van-hanh/login public when not signed in", async () => {
    const response = await proxy(createRequest("/van-hanh/login"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects demo employee from /van-hanh with denied notice", async () => {
    const response = await proxy(
      createRequest(
        "/van-hanh",
        "ai_troly_demo_session=true; ai_troly_demo_user_type=employee",
      ),
    );
    expect(response.headers.get("location")).toContain("/onboarding");
    expect(response.headers.get("location")).toContain("denied=1");
  });

  it("redirects demo manager from /van-hanh with denied notice", async () => {
    const response = await proxy(
      createRequest(
        "/van-hanh",
        "ai_troly_demo_session=true; ai_troly_demo_user_type=manager",
      ),
    );
    expect(response.headers.get("location")).toContain("/quan-ly");
    expect(response.headers.get("location")).toContain("denied=1");
  });

  it("redirects real employee from /van-hanh with denied notice", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    mocks.createServerClient.mockReturnValue(
      makeRealSupabaseMock({
        userId: "user-1",
        email: "employee@vinuni.vn",
        roleId: "kinh-doanh",
        learningActivated: false,
        memberRole: "employee",
        platformAdmin: false,
      }),
    );

    const response = await proxy(createRequest("/van-hanh"));
    expect(response.headers.get("location")).toContain("/cho-kich-hoat");
    expect(response.headers.get("location")).toContain("denied=1");
  });

  it("redirects real manager from /van-hanh with denied notice", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    mocks.createServerClient.mockReturnValue(
      makeRealSupabaseMock({
        userId: "user-2",
        email: "manager@vinuni.vn",
        roleId: null,
        memberRole: "manager",
        platformAdmin: false,
      }),
    );

    const response = await proxy(createRequest("/van-hanh"));
    expect(response.headers.get("location")).toContain("/quan-ly");
    expect(response.headers.get("location")).toContain("denied=1");
  });

  it("lets real platform admin access /van-hanh/login and bounces to /van-hanh", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    mocks.createServerClient.mockReturnValue(
      makeRealSupabaseMock({
        userId: "admin-1",
        email: "admin@vinuni.vn",
        roleId: "van-hanh",
        memberRole: "manager",
        platformAdmin: true,
      }),
    );

    const response = await proxy(createRequest("/van-hanh/login"));
    expect(response.headers.get("location")).toContain("/van-hanh");
  });

  it.each(["/lo-trinh", "/tien-bo", "/kiem-tra/marketing-m1"])(
    "redirects real platform admin away from employee learning path %s",
    async (pathname) => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
      mocks.createServerClient.mockReturnValue(
        makeRealSupabaseMock({
          userId: "admin-1",
          email: "admin@vinuni.vn",
          roleId: "van-hanh",
          memberRole: "manager",
          platformAdmin: true,
        }),
      );

      const response = await proxy(createRequest(pathname));
      expect(response.headers.get("location")).toContain("/van-hanh");
      expect(response.headers.get("location")).toContain("operator_notice=learning");
    },
  );

  it("redirects demo platform admin away from employee learning paths", async () => {
    const response = await proxy(
      createRequest(
        "/lo-trinh",
        "ai_troly_demo_session=true; ai_troly_demo_platform_admin=true",
      ),
    );

    expect(response.headers.get("location")).toContain("/van-hanh");
    expect(response.headers.get("location")).toContain("operator_notice=learning");
  });
});
