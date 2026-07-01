import { apiError, apiOk } from "@/lib/api-error";
import { getClientIp, checkRateLimit } from "@/lib/rate-limit-memory";
import {
  loadPlatformAdminConsoleReport,
  performPlatformAdminAction,
} from "@/lib/platform-admin-console";
import { requirePlatformAdminContext } from "@/lib/platform-admin-auth";
import type { PlatformAdminConsoleFilters } from "@/lib/platform-admin-types";

export const runtime = "nodejs";

type ActionBody = {
  action?: unknown;
  payload?: unknown;
};

const PLATFORM_ADMIN_RATE_LIMIT = 20;
const PLATFORM_ADMIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;

function parseActionBody(body: ActionBody | null) {
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  const payload =
    body?.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? (body.payload as Record<string, unknown>)
      : {};
  return { action, payload };
}

function platformAdminRateLimitKey(request: Request, contextUserId: string) {
  return `platform-admin:${contextUserId}:${getClientIp(request)}`;
}

function getEnumParam<T extends string>(
  searchParams: URLSearchParams,
  name: string,
  allowed: readonly T[],
): T | undefined {
  const value = searchParams.get(name)?.trim();
  return value && allowed.includes(value as T) ? (value as T) : undefined;
}

function getTextParam(searchParams: URLSearchParams, name: string): string | undefined {
  const value = searchParams.get(name)?.trim();
  return value ? value : undefined;
}

function compactFilters(filters: PlatformAdminConsoleFilters): PlatformAdminConsoleFilters {
  const entries = Object.entries(filters).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as PlatformAdminConsoleFilters;
}

function parsePlatformAdminFilters(request: Request): PlatformAdminConsoleFilters {
  const searchParams = new URL(request.url).searchParams;
  return compactFilters({
    organizationQuery: getTextParam(searchParams, "organizationQuery"),
    organizationStatus: getEnumParam(searchParams, "organizationStatus", [
      "active",
      "suspended",
      "archived",
    ] as const),
    organizationTool: getTextParam(searchParams, "organizationTool"),
    userQuery: getTextParam(searchParams, "userQuery"),
    userRole: getEnumParam(searchParams, "userRole", [
      "platform-admin",
      "manager",
      "employee",
    ] as const),
    userAccount: getEnumParam(searchParams, "userAccount", [
      "company",
      "individual",
    ] as const),
    userActivation: getEnumParam(searchParams, "userActivation", [
      "activated",
      "pending",
    ] as const),
    contentQuery: getTextParam(searchParams, "contentQuery"),
    contentCollection: getEnumParam(searchParams, "contentCollection", [
      "learning_modules",
      "training_modules",
      "learning_paths",
      "assessments",
    ] as const),
    contentStatus: getEnumParam(searchParams, "contentStatus", [
      "draft",
      "published",
      "archived",
    ] as const),
    inviteQuery: getTextParam(searchParams, "inviteQuery"),
    inviteStatus: getEnumParam(searchParams, "inviteStatus", [
      "active",
      "inactive",
    ] as const),
    auditQuery: getTextParam(searchParams, "auditQuery"),
    auditAction: getTextParam(searchParams, "auditAction"),
  });
}

export async function GET(request: Request) {
  const context = await requirePlatformAdminContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản trị hệ thống mới xem được bảng điều khiển.");
  }

  const rateLimit = checkRateLimit(
    platformAdminRateLimitKey(request, context.userId),
    PLATFORM_ADMIN_RATE_LIMIT,
    PLATFORM_ADMIN_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
      {
        resetAt: rateLimit.resetAt,
      },
    );
  }

  try {
    const report = await loadPlatformAdminConsoleReport(
      context.userId,
      parsePlatformAdminFilters(request),
    );
    return apiOk({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[platform-admin:get]", message);
    return apiError("INTERNAL_ERROR", "Không tải được bảng điều khiển quản trị.");
  }
}

export async function POST(request: Request) {
  const context = await requirePlatformAdminContext();
  if (!context) {
    return apiError("FORBIDDEN", "Chỉ quản trị hệ thống mới thao tác được.");
  }

  if (context.mode === "demo") {
    return apiError("FORBIDDEN", "Demo mode chỉ hỗ trợ xem dữ liệu.");
  }

  const rateLimit = checkRateLimit(
    platformAdminRateLimitKey(request, context.userId),
    PLATFORM_ADMIN_RATE_LIMIT,
    PLATFORM_ADMIN_RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.allowed) {
    return apiError(
      "RATE_LIMIT_EXCEEDED",
      "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
      {
        resetAt: rateLimit.resetAt,
      },
    );
  }

  try {
    const body = (await request.json().catch(() => null)) as ActionBody | null;
    const { action, payload } = parseActionBody(body);
    if (!action) {
      return apiError("VALIDATION_ERROR", "Thiếu action.");
    }

    const result = await performPlatformAdminAction({
      action: action as Parameters<typeof performPlatformAdminAction>[0]["action"],
      actorId: context.userId,
      payload,
    });

    return apiOk(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[platform-admin:post]", message);
    if (message.startsWith("VALIDATION:")) {
      return apiError("VALIDATION_ERROR", message.replace(/^VALIDATION:\s*/, ""));
    }
    if (message.startsWith("NOT_FOUND:")) {
      return apiError("NOT_FOUND", message.replace(/^NOT_FOUND:\s*/, ""));
    }
    return apiError("INTERNAL_ERROR", "Không thực hiện được thao tác quản trị.");
  }
}
