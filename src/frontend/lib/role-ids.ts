import type { RoleId } from "@/lib/openai";

/** Vai trò hợp lệ — dùng chung recommender, path-agent, API routes. */
export const VALID_ROLE_IDS: readonly RoleId[] = [
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
  "nhan-su",
] as const;

export const VALID_ROLE_ID_SET = new Set<RoleId>(VALID_ROLE_IDS);

export function coerceRoleId(
  value: unknown,
  fallback: RoleId = "khac",
): RoleId {
  if (typeof value === "string" && VALID_ROLE_ID_SET.has(value as RoleId)) {
    return value as RoleId;
  }
  return fallback;
}
