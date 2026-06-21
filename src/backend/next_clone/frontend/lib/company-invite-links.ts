import { randomBytes } from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const INVITE_TOKEN_BYTES = 32;
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,}$/;
const INVITE_LINK_SELECT =
  "id, organization_id, created_by, token, is_active, expires_at, max_uses, used_count, created_at, updated_at, last_used_at, organizations(name)";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type OrganizationInviteLinkRow = {
  id: string;
  organization_id: string;
  created_by: string;
  token: string;
  is_active: boolean;
  expires_at: string | null;
  max_uses: number | null;
  used_count: number;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export type CompanyInviteLink = {
  id: string;
  organizationId: string;
  organizationName: string;
  createdBy: string;
  token: string;
  url: string;
  isActive: boolean;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isExpired: boolean;
  isExhausted: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

function organizationNameOf(row: OrganizationInviteLinkRow): string {
  const organization = Array.isArray(row.organizations)
    ? row.organizations[0]
    : row.organizations;
  return organization?.name?.trim() || "Tổ chức của bạn";
}

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

export function isInviteTokenShape(token: string): boolean {
  return INVITE_TOKEN_PATTERN.test(token);
}

export function buildInvitePath(token: string): string {
  return `/moi/${encodeURIComponent(token)}`;
}

export function buildInviteAcceptPath(token: string): string {
  return `${buildInvitePath(token)}/accept`;
}

export function buildInviteUrl(origin: string, token: string): string {
  return new URL(buildInvitePath(token), origin).toString();
}

export function isInviteLinkExpired(row: OrganizationInviteLinkRow): boolean {
  return row.expires_at !== null && new Date(row.expires_at) <= new Date();
}

export function isInviteLinkExhausted(row: OrganizationInviteLinkRow): boolean {
  return row.max_uses !== null && row.used_count >= row.max_uses;
}

export function isInviteLinkUsable(row: OrganizationInviteLinkRow): boolean {
  return row.is_active && !isInviteLinkExpired(row) && !isInviteLinkExhausted(row);
}

export function mapInviteLink(
  row: OrganizationInviteLinkRow,
  origin: string,
): CompanyInviteLink {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: organizationNameOf(row),
    createdBy: row.created_by,
    token: row.token,
    url: buildInviteUrl(origin, row.token),
    isActive: row.is_active,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    usedCount: row.used_count,
    isExpired: isInviteLinkExpired(row),
    isExhausted: isInviteLinkExhausted(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function getActiveInviteLinkForManager(
  supabase: SupabaseServiceClient,
  organizationId: string,
  managerUserId: string,
): Promise<OrganizationInviteLinkRow | null> {
  const { data, error } = await supabase
    .from("organization_invite_links")
    .select(INVITE_LINK_SELECT)
    .eq("organization_id", organizationId)
    .eq("created_by", managerUserId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as OrganizationInviteLinkRow | null) ?? null;
}

export async function findActiveInviteLinkByToken(
  supabase: SupabaseServiceClient,
  token: string,
): Promise<OrganizationInviteLinkRow | null> {
  if (!isInviteTokenShape(token)) return null;

  const { data, error } = await supabase
    .from("organization_invite_links")
    .select(INVITE_LINK_SELECT)
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  const row = (data as OrganizationInviteLinkRow | null) ?? null;

  // Guard expiry and usage cap in application layer (complements DB constraints).
  if (!row || !isInviteLinkUsable(row)) return null;
  return row;
}

export async function incrementInviteLinkUsedCount(
  supabase: SupabaseServiceClient,
  inviteLinkId: string,
): Promise<void> {
  const { error } = await supabase.rpc("increment_invite_used_count", {
    link_id: inviteLinkId,
  });
  if (error) {
    // Non-fatal: log and continue. The join already succeeded.
    console.warn("[invite-links:increment-used-count]", error.message);
  }
}

export async function createInviteLinkForManager(
  supabase: SupabaseServiceClient,
  organizationId: string,
  managerUserId: string,
): Promise<OrganizationInviteLinkRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const token = generateInviteToken();
    const { data, error } = await supabase
      .from("organization_invite_links")
      .insert({
        organization_id: organizationId,
        created_by: managerUserId,
        token,
      })
      .select(INVITE_LINK_SELECT)
      .single();

    if (!error) return data as OrganizationInviteLinkRow;

    if (error.code === "23505") {
      const existing = await getActiveInviteLinkForManager(
        supabase,
        organizationId,
        managerUserId,
      );
      if (existing) return existing;
      continue;
    }

    throw error;
  }

  throw new Error("Không tạo được token mời duy nhất.");
}

export async function getOrCreateActiveInviteLinkForManager(
  supabase: SupabaseServiceClient,
  organizationId: string,
  managerUserId: string,
): Promise<OrganizationInviteLinkRow> {
  const existing = await getActiveInviteLinkForManager(
    supabase,
    organizationId,
    managerUserId,
  );
  if (existing) return existing;

  return createInviteLinkForManager(supabase, organizationId, managerUserId);
}

export async function rotateInviteLinkForManager(
  supabase: SupabaseServiceClient,
  organizationId: string,
  managerUserId: string,
): Promise<OrganizationInviteLinkRow> {
  const { error } = await supabase
    .from("organization_invite_links")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", organizationId)
    .eq("created_by", managerUserId)
    .eq("is_active", true);

  if (error) throw error;

  return createInviteLinkForManager(supabase, organizationId, managerUserId);
}
