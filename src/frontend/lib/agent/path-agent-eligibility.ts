/**
 * Eligibility / role logic dùng CHUNG cho:
 * - `generatePath` (path-agent catalog + validate)
 * - `rankModules` (recommender panel — xem `lib/agents/recommender.ts`)
 *
 * `/lo-trinh` UI gọi `POST /api/agent/lo-trinh` → `generatePath` (LLM + fallback).
 * Panel gợi ý bên cạnh dùng `rankModules` qua `/api/agents/recommender`.
 * Cả hai đều validate role qua `coerceRoleId` / `VALID_ROLE_ID_SET`.
 */

import type { RoleId } from "@/lib/openai";
import { VALID_ROLE_ID_SET } from "@/lib/role-ids";

export function isKnownRoleId(roleId: string): roleId is RoleId {
  return VALID_ROLE_ID_SET.has(roleId as RoleId);
}

/** Ngưỡng AI level cao → bỏ bài nhập môn (khớp path-agent-validate SKIP_BASIC_LEVEL). */
export const SKIP_BASIC_MODULE_LEVEL = 5;

export function shouldSkipBasicModule(
  aiLevel: number,
  moduleLevel: number,
  isFoundation: boolean,
): boolean {
  return (
    aiLevel >= SKIP_BASIC_MODULE_LEVEL &&
    moduleLevel === 1 &&
    !isFoundation
  );
}
