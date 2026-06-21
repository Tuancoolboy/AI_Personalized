import { describe, expect, it, vi } from "vitest";
import {
  acceptOrganizationInvite,
  inviteAcceptErrorPath,
} from "@/lib/invite-acceptance";

const TOKEN = "abcDEF_123-safeTOKEN4567890abcdef";
const USER_ID = "user-1";
const ORG_ID = "org-1";

function createMockSupabase(options: {
  invite?: Record<string, unknown> | null;
  memberships?: Array<Record<string, unknown>>;
  profileRoleId?: string | null;
  insertError?: string;
  updateError?: string;
}) {
  const rpc = vi.fn().mockResolvedValue({ error: null });

  const from = vi.fn((table: string) => {
    if (table === "organization_invite_links") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: options.invite ?? null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }

    if (table === "organization_members") {
      const chain = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: options.memberships ?? [],
            error: null,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: options.updateError ? { message: options.updateError } : null,
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({
          error: options.insertError ? { message: options.insertError } : null,
        }),
      };
      return chain;
    }

    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data:
                options.profileRoleId === undefined
                  ? { role_id: null }
                  : { role_id: options.profileRoleId },
              error: null,
            }),
          }),
        }),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return { from, rpc };
}

describe("invite-acceptance", () => {
  it("builds invite error redirect paths", () => {
    expect(inviteAcceptErrorPath(TOKEN, "invalid")).toBe(
      `/moi/${TOKEN}?error=invalid`,
    );
  });

  it("rejects invalid or missing invite tokens", async () => {
    const supabase = createMockSupabase({ invite: null });

    const result = await acceptOrganizationInvite({
      token: TOKEN,
      userId: USER_ID,
      userEmail: "employee@example.com",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: false, error: "invalid" });
  });

  it("blocks users who already belong to another organization", async () => {
    const supabase = createMockSupabase({
      invite: {
        id: "invite-1",
        organization_id: ORG_ID,
        created_by: "manager-1",
        token: TOKEN,
        is_active: true,
        expires_at: null,
        max_uses: null,
        used_count: 0,
        organizations: { name: "Công ty A" },
      },
      memberships: [
        {
          organization_id: "org-other",
          member_role: "employee",
          department_id: "khac",
          organizations: { name: "Công ty B" },
        },
      ],
    });

    const result = await acceptOrganizationInvite({
      token: TOKEN,
      userId: USER_ID,
      userEmail: "employee@example.com",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: false, error: "already-member" });
  });

  it("accepts a new employee invite and redirects to onboarding", async () => {
    const supabase = createMockSupabase({
      invite: {
        id: "invite-1",
        organization_id: ORG_ID,
        created_by: "manager-1",
        token: TOKEN,
        is_active: true,
        expires_at: null,
        max_uses: null,
        used_count: 0,
        organizations: { name: "Công ty A" },
      },
      memberships: [],
      profileRoleId: null,
    });

    const result = await acceptOrganizationInvite({
      token: TOKEN,
      userId: USER_ID,
      userEmail: "employee@example.com",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: true, redirectPath: "/onboarding" });
    expect(supabase.rpc).toHaveBeenCalledWith("increment_invite_used_count", {
      link_id: "invite-1",
    });
  });

  it("is idempotent for an existing member of the same organization", async () => {
    const supabase = createMockSupabase({
      invite: {
        id: "invite-1",
        organization_id: ORG_ID,
        created_by: "manager-1",
        token: TOKEN,
        is_active: true,
        expires_at: null,
        max_uses: null,
        used_count: 1,
        organizations: { name: "Công ty A" },
      },
      memberships: [
        {
          organization_id: ORG_ID,
          member_role: "employee",
          department_id: "marketing",
          organizations: { name: "Công ty A" },
        },
      ],
      profileRoleId: "marketing",
    });

    const result = await acceptOrganizationInvite({
      token: TOKEN,
      userId: USER_ID,
      userEmail: "employee@example.com",
      supabase: supabase as never,
    });

    expect(result).toEqual({ ok: true, redirectPath: "/lo-trinh" });
  });
});
