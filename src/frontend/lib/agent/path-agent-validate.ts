// Validate output agent: loại id bịa, cap 8-10, ưu tiên Nền tảng, bỏ bài đã xong,
// skip level nhập môn nếu level cao. Dùng chung cho agent + fallback.

import type {
  AgentFlowInput,
  AgentPathGroup,
  AgentRawOutput,
  CandidateModule,
} from "./path-agent-types";

import { shouldSkipBasicModule } from "@/lib/agent/path-agent-eligibility";

const MAX_MODULES = 10;
const MIN_MODULES = 8;

type PoolIndex = Map<string, CandidateModule>;

function indexPool(pool: CandidateModule[]): PoolIndex {
  const m: PoolIndex = new Map();
  for (const c of pool) m.set(c.id, c);
  return m;
}

// Sắp xếp ổn định: Nền tảng trước, rồi theo level, giữ thứ tự gốc khi hòa.
function sortFoundationFirst(ids: string[], pool: PoolIndex): string[] {
  return ids
    .map((id, idx) => ({ id, idx, mod: pool.get(id)! }))
    .sort((a, b) => {
      const fa = a.mod.isFoundation ? 0 : 1;
      const fb = b.mod.isFoundation ? 0 : 1;
      if (fa !== fb) return fa - fb;
      if (a.mod.level !== b.mod.level) return a.mod.level - b.mod.level;
      return a.idx - b.idx;
    })
    .map((x) => x.id);
}

// Khi có lộ trình công ty giao: giữ thứ tự assigned trước, phần còn lại sort nền tảng.
function sortWithAssignedPathFirst(
  ids: string[],
  pool: PoolIndex,
  assignedOrder: string[],
): string[] {
  if (assignedOrder.length === 0) {
    return sortFoundationFirst(ids, pool);
  }
  const assignedSet = new Set(assignedOrder);
  const idSet = new Set(ids);
  const pinned = assignedOrder.filter((id) => idSet.has(id));
  const rest = ids.filter((id) => !assignedSet.has(id));
  return [...pinned, ...sortFoundationFirst(rest, pool)];
}

// Lọc 1 danh sách id thô: chỉ giữ id ∈ pool, khử trùng, bỏ bài đã hoàn thành,
// skip level-1 (không nền tảng) nếu level cao.
function cleanIds(
  ids: string[],
  pool: PoolIndex,
  input: AgentFlowInput,
  seen: Set<string>,
): string[] {
  const out: string[] = [];
  const completed = new Set(input.completedModuleIds);
  for (const id of ids) {
    if (typeof id !== "string") continue;
    if (seen.has(id)) continue;
    const mod = pool.get(id);
    if (!mod) continue; // id bịa hoặc ngoài pool
    if (completed.has(id)) continue; // đã xong → bỏ
    if (shouldSkipBasicModule(input.aiLevel, mod.level, mod.isFoundation)) {
      continue;
    }
    seen.add(id);
    out.push(id);
  }
  return out;
}

function normalizeGroups(raw: unknown): AgentPathGroup[] {
  if (!Array.isArray(raw)) return [];
  const groups: AgentPathGroup[] = [];
  for (const g of raw) {
    if (!g || typeof g !== "object") continue;
    const obj = g as Record<string, unknown>;
    const ids = Array.isArray(obj.moduleIds)
      ? obj.moduleIds.filter((x): x is string => typeof x === "string")
      : [];
    groups.push({
      title: typeof obj.title === "string" ? obj.title : "Lộ trình",
      reason: typeof obj.reason === "string" ? obj.reason : "",
      moduleIds: ids,
    });
  }
  return groups;
}

export type ValidatedPath = {
  groups: AgentPathGroup[];
  orderedModuleIds: string[];
};

// Cap tối đa; module bắt buộc trong lộ trình giao được giữ trước khi cắt phần còn lại.
function capOrderedModules(ordered: string[], input: AgentFlowInput): string[] {
  if (ordered.length <= MAX_MODULES) return ordered;
  const requiredOrder = (input.assignedPathModules ?? [])
    .filter((mod) => mod.isRequired)
    .map((mod) => mod.id);
  const orderedSet = new Set(ordered);
  const pinned = requiredOrder.filter((id) => orderedSet.has(id));
  const pinnedSet = new Set(pinned);
  const rest = ordered.filter((id) => !pinnedSet.has(id));
  return [...pinned, ...rest].slice(0, MAX_MODULES);
}
export function validateAgentOutput(
  raw: AgentRawOutput,
  pool: CandidateModule[],
  input: AgentFlowInput,
): ValidatedPath {
  const idx = indexPool(pool);
  const rawGroups = normalizeGroups(raw.groups);
  const seen = new Set<string>();

  const cleanGroups: AgentPathGroup[] = [];
  const assignedOrder = (input.assignedPathModules ?? []).map((mod) => mod.id);
  if (input.flow === "company" && assignedOrder.length > 0) {
    const assignedIds = cleanIds(assignedOrder, idx, input, seen);
    if (assignedIds.length > 0) {
      cleanGroups.push({
        title: input.assignedPathTitle
          ? `Lộ trình công ty: ${input.assignedPathTitle}`
          : "Lộ trình công ty đang giao",
        reason: "Ưu tiên module công ty đã giao trước khi bổ sung phần còn thiếu.",
        moduleIds: assignedIds,
      });
    }
  }
  for (const g of rawGroups) {
    const ids = cleanIds(g.moduleIds, idx, input, seen);
    if (ids.length === 0) continue;
    cleanGroups.push({ title: g.title, reason: g.reason, moduleIds: ids });
  }

  const flatIds = cleanGroups.flatMap((g) => g.moduleIds);
  let ordered =
    input.flow === "company" && assignedOrder.length > 0
      ? sortWithAssignedPathFirst(flatIds, idx, assignedOrder)
      : sortFoundationFirst(flatIds, idx);

  // Cap tối đa; nếu thiếu (< MIN) thì giữ nguyên những gì có (không bịa thêm).
  if (ordered.length > MAX_MODULES) ordered = capOrderedModules(ordered, input);

  // Đồng bộ groups theo tập id đã cap (loại id bị cắt).
  const keep = new Set(ordered);
  const syncedGroups = cleanGroups
    .map((g) => ({
      ...g,
      moduleIds: g.moduleIds.filter((id) => keep.has(id)),
    }))
    .filter((g) => g.moduleIds.length > 0);

  return { groups: syncedGroups, orderedModuleIds: ordered };
}

export { MAX_MODULES, MIN_MODULES };
export { SKIP_BASIC_MODULE_LEVEL as SKIP_BASIC_LEVEL } from "@/lib/agent/path-agent-eligibility";
