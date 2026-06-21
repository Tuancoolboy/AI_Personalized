import {
  departmentLabelToId,
  departmentIdToLabel,
  isDepartmentId,
  TEAM_MEMBERS,
  type DepartmentId,
} from "@/lib/team-data";
import { getRole } from "@/lib/roles";

export type HocTapDepartmentSource = "supabase" | "profile" | "demo";

export type HocTapDepartmentOption = {
  id: DepartmentId;
  label: string;
  memberCount: number;
  isCurrentUserDepartment: boolean;
  source: HocTapDepartmentSource;
};

const DEPARTMENT_ORDER: DepartmentId[] = [
  "kinh-doanh",
  "ke-toan",
  "marketing",
  "van-hanh",
  "khac",
];

export function normalizeDepartmentId(
  value: string | null | undefined,
): DepartmentId {
  return value && isDepartmentId(value) ? value : "khac";
}

export function getHocTapDepartmentLabel(id: DepartmentId): string {
  return getRole(id)?.shortLabel ?? departmentIdToLabel(id);
}

export function buildAllHocTapDepartmentOptions(
  currentDepartmentId?: string | null,
  source: HocTapDepartmentSource = "demo",
): HocTapDepartmentOption[] {
  const currentId = currentDepartmentId
    ? normalizeDepartmentId(currentDepartmentId)
    : null;

  return DEPARTMENT_ORDER.map((id) => ({
    id,
    label: getHocTapDepartmentLabel(id),
    memberCount: 0,
    isCurrentUserDepartment: id === currentId,
    source,
  }));
}

export function mergeHocTapDepartmentFilterOptions(
  options: HocTapDepartmentOption[],
  currentDepartmentId?: string | null,
): HocTapDepartmentOption[] {
  const currentId = currentDepartmentId
    ? normalizeDepartmentId(currentDepartmentId)
    : (options.find((option) => option.isCurrentUserDepartment)?.id ?? null);
  const byId = new Map<DepartmentId, HocTapDepartmentOption>(
    buildAllHocTapDepartmentOptions(currentId).map((option) => [
      option.id,
      option,
    ]),
  );

  for (const option of options) {
    const id = normalizeDepartmentId(option.id);
    byId.set(id, {
      ...option,
      id,
      label: getHocTapDepartmentLabel(id),
      isCurrentUserDepartment: id === currentId,
    });
  }

  return [...byId.values()].sort((a, b) =>
    compareHocTapDepartments(a, b, currentId),
  );
}

export function buildHocTapDepartmentOptions(
  departmentIds: Array<string | null | undefined>,
  currentDepartmentId: string | null | undefined,
  source: HocTapDepartmentSource,
): HocTapDepartmentOption[] {
  const currentId = currentDepartmentId
    ? normalizeDepartmentId(currentDepartmentId)
    : null;
  const counts = new Map<DepartmentId, number>();

  for (const rawId of departmentIds) {
    const departmentId = normalizeDepartmentId(rawId);
    counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1);
  }

  if (currentId && !counts.has(currentId)) {
    counts.set(currentId, 1);
  }

  return [...counts.entries()]
    .map(([id, memberCount]) => ({
      id,
      label: getHocTapDepartmentLabel(id),
      memberCount,
      isCurrentUserDepartment: id === currentId,
      source,
    }))
    .sort((a, b) => compareHocTapDepartments(a, b, currentId));
}

export function buildDemoHocTapDepartmentOptions(
  currentDepartmentId?: string | null,
): HocTapDepartmentOption[] {
  return buildHocTapDepartmentOptions(
    TEAM_MEMBERS.map(
      (member) => member.departmentId ?? departmentLabelToId(member.department),
    ),
    currentDepartmentId,
    "demo",
  );
}

function compareHocTapDepartments(
  a: HocTapDepartmentOption,
  b: HocTapDepartmentOption,
  currentDepartmentId: DepartmentId | null,
): number {
  if (currentDepartmentId) {
    if (a.id === currentDepartmentId && b.id !== currentDepartmentId) return -1;
    if (b.id === currentDepartmentId && a.id !== currentDepartmentId) return 1;
  }

  return DEPARTMENT_ORDER.indexOf(a.id) - DEPARTMENT_ORDER.indexOf(b.id);
}
