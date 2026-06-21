export const DEFAULT_ORGANIZATION_NAME = "Tổ chức mặc định";

export type ManagerRole = "manager" | "owner";

export type ManagerMembershipRow = {
  organization_id: string;
  member_role: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  organizations?:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null;
};

export type ManagerMembership = {
  organizationId: string;
  organizationName: string;
  role: ManagerRole;
};

const MANAGER_ROLES = new Set(["manager", "owner"]);

export function managerPrivateOrganizationName(email: string): string {
  return `Công ty của ${email.trim().toLowerCase()}`;
}

export function isManagerRole(
  role: string | null | undefined,
): role is ManagerRole {
  return Boolean(role && MANAGER_ROLES.has(role));
}

export function organizationNameOf(row: ManagerMembershipRow): string {
  const org = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  return org?.name?.trim() || "Tổ chức của bạn";
}

function roleRank(role: string | null): number {
  return role === "owner" ? 0 : 1;
}

function orgRank(row: ManagerMembershipRow): number {
  return organizationNameOf(row) === DEFAULT_ORGANIZATION_NAME ? 1 : 0;
}

function timestampValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowRank(row: ManagerMembershipRow): [number, number, number, number] {
  return [
    roleRank(row.member_role),
    orgRank(row),
    -timestampValue(row.updated_at),
    -timestampValue(row.created_at),
  ];
}

export function compareManagerMembershipRows(
  a: ManagerMembershipRow,
  b: ManagerMembershipRow,
): number {
  const aRank = rowRank(a);
  const bRank = rowRank(b);

  for (let index = 0; index < aRank.length; index += 1) {
    const diff = aRank[index] - bRank[index];
    if (diff !== 0) return diff;
  }

  return a.organization_id.localeCompare(b.organization_id);
}

export function mapManagerMembership(
  row: ManagerMembershipRow | null,
): ManagerMembership | null {
  if (!row || !isManagerRole(row.member_role)) return null;
  return {
    organizationId: row.organization_id,
    organizationName: organizationNameOf(row),
    role: row.member_role,
  };
}

export function selectManagerMembership(
  rows: ManagerMembershipRow[] | null | undefined,
): ManagerMembership | null {
  const bestRow = (rows ?? [])
    .filter((row) => isManagerRole(row.member_role))
    .sort(compareManagerMembershipRows)[0];

  return mapManagerMembership(bestRow ?? null);
}
