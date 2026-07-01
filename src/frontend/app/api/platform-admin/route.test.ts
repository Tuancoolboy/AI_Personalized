import { describe, expect, it, vi, beforeEach } from "vitest";
import type { PlatformAdminConsoleReport } from "@/lib/platform-admin-types";

const mocks = vi.hoisted(() => ({
  requirePlatformAdminContext: vi.fn(),
  loadPlatformAdminConsoleReport: vi.fn(),
  performPlatformAdminAction: vi.fn(),
}));

vi.mock("@/lib/platform-admin-auth", () => ({
  requirePlatformAdminContext: mocks.requirePlatformAdminContext,
}));

vi.mock("@/lib/platform-admin-console", () => ({
  loadPlatformAdminConsoleReport: mocks.loadPlatformAdminConsoleReport,
  performPlatformAdminAction: mocks.performPlatformAdminAction,
}));

const baseReport: PlatformAdminConsoleReport = {
  generatedAt: "2026-06-19T00:00:00.000Z",
  persisted: true,
  platform: {
    supabaseConfigured: true,
    openaiConfigured: true,
    openaiModel: "gpt-4.1",
    rateLimitPerDay: 100,
  },
  overview: {
    organizations: 0,
    activeOrganizations: 0,
    suspendedOrganizations: 0,
    archivedOrganizations: 0,
    users: 0,
    platformAdmins: 0,
    managers: 0,
    employees: 0,
    totalModules: 0,
    publishedModules: 0,
    totalPaths: 0,
    publishedPaths: 0,
    assignments: 0,
    assessments: 0,
    gradingQueue: 0,
    ahaReflections: 0,
    leads: 0,
    quizCount: 0,
    quizAvgScore: 0,
    totalHoursSaved: 0,
    chatUsage7d: 0,
    chatUsage30d: 0,
    inviteLinks: 0,
    auditEvents30d: 0,
  },
  organizations: [],
  users: [],
  content: [],
  contentItems: [],
  inviteLinks: [],
  audits: [],
  alerts: [],
};

describe("platform-admin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 for GET when the caller is not platform_admin", async () => {
    mocks.requirePlatformAdminContext.mockResolvedValue(null);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/platform-admin"));

    expect(response.status).toBe(403);
    expect(mocks.loadPlatformAdminConsoleReport).not.toHaveBeenCalled();
  });

  it("returns report for GET when the caller is platform_admin", async () => {
    mocks.requirePlatformAdminContext.mockResolvedValue({
      mode: "supabase",
      userId: "user-1",
    });
    mocks.loadPlatformAdminConsoleReport.mockResolvedValue(baseReport);
    const { GET } = await import("./route");
    const response = await GET(
      new Request("http://localhost/api/platform-admin", {
        headers: { "x-forwarded-for": "203.0.113.7" },
      }),
    );
    const body = (await response.json()) as {
      ok: boolean;
      report: PlatformAdminConsoleReport;
    };

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.report.generatedAt).toBe(baseReport.generatedAt);
    expect(mocks.loadPlatformAdminConsoleReport).toHaveBeenCalledWith("user-1", {});
  });

  it("passes list filters from GET query params", async () => {
    mocks.requirePlatformAdminContext.mockResolvedValue({
      mode: "supabase",
      userId: "user-1",
    });
    mocks.loadPlatformAdminConsoleReport.mockResolvedValue(baseReport);
    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "http://localhost/api/platform-admin?organizationStatus=active&userRole=manager&contentCollection=learning_modules&inviteStatus=inactive&auditAction=platform_admin.action",
      ),
    );

    expect(response.status).toBe(200);
    expect(mocks.loadPlatformAdminConsoleReport).toHaveBeenCalledWith("user-1", {
      auditAction: "platform_admin.action",
      contentCollection: "learning_modules",
      inviteStatus: "inactive",
      organizationStatus: "active",
      userRole: "manager",
    });
  });

  it("returns 403 for POST when the caller is not platform_admin", async () => {
    mocks.requirePlatformAdminContext.mockResolvedValue(null);
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://localhost/api/platform-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle-platform-admin",
          payload: { email: "admin@example.com", enabled: true },
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.performPlatformAdminAction).not.toHaveBeenCalled();
  });
});
