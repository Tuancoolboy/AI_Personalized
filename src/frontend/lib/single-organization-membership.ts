import {
  DEFAULT_ORGANIZATION_NAME,
  managerPrivateOrganizationName,
  organizationNameOf,
  type ManagerMembershipRow,
} from "@/lib/manager-membership";

export const SINGLE_ORGANIZATION_CONFLICT_MESSAGE =
  "Email này đã thuộc công ty khác. Một tài khoản chỉ được tham gia một công ty.";

export type OrganizationMembershipRow = ManagerMembershipRow & {
  user_id?: string | null;
};

export type MembershipConflict = {
  hasConflict: boolean;
  existingOrganizationId?: string;
  existingOrganizationName?: string;
};

function roleRank(role: string | null | undefined): number {
  if (role === "owner") return 0;
  if (role === "manager") return 1;
  return 2;
}

function organizationRank(row: OrganizationMembershipRow): number {
  return organizationNameOf(row) === DEFAULT_ORGANIZATION_NAME ? 1 : 0;
}

function privateOrganizationRank(
  row: OrganizationMembershipRow,
  email?: string | null,
): number {
  if (!email) return 1;
  return organizationNameOf(row) === managerPrivateOrganizationName(email)
    ? 0
    : 1;
}

function timestampValue(value: string | null | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function canonicalRank(
  row: OrganizationMembershipRow,
  email?: string | null,
): [number, number, number, number, string] {
  return [
    privateOrganizationRank(row, email),
    roleRank(row.member_role),
    organizationRank(row),
    timestampValue(row.created_at),
    row.organization_id,
  ];
}

export function compareCanonicalMembershipRows(
  a: OrganizationMembershipRow,
  b: OrganizationMembershipRow,
  email?: string | null,
): number {
  const aRank = canonicalRank(a, email);
  const bRank = canonicalRank(b, email);

  for (let index = 0; index < aRank.length; index += 1) {
    const aValue = aRank[index];
    const bValue = bRank[index];
    if (aValue === bValue) continue;
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue);
    }
    return Number(aValue) - Number(bValue);
  }

  return 0;
}

export function selectCanonicalMembershipRow(
  rows: OrganizationMembershipRow[] | null | undefined,
  email?: string | null,
): OrganizationMembershipRow | null {
  return [...(rows ?? [])].sort((a, b) =>
    compareCanonicalMembershipRows(a, b, email),
  )[0] ?? null;
}

export function getSingleOrganizationConflict(
  rows: OrganizationMembershipRow[] | null | undefined,
  targetOrganizationId: string,
): MembershipConflict {
  const blockingRow = (rows ?? []).find(
    (row) => row.organization_id !== targetOrganizationId,
  );

  if (!blockingRow) return { hasConflict: false };

  return {
    hasConflict: true,
    existingOrganizationId: blockingRow.organization_id,
    existingOrganizationName: organizationNameOf(blockingRow),
  };
}
