import {
  dedupeOrganizationSlug,
  isValidOrganizationSlug,
  slugifyOrganizationName,
} from "@/lib/organization-slug";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type SupabaseServiceClient = ReturnType<typeof createSupabaseServiceClient>;

export type OrganizationRecord = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: string;
  settings: Record<string, unknown>;
  createdBy: string | null;
};

export type PublicOrganizationRecord = {
  name: string;
  slug: string;
  logoUrl: string | null;
};

function mapOrganizationRow(row: {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  status: string;
  settings_json: Record<string, unknown> | null;
  created_by: string | null;
}): OrganizationRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
    status: row.status,
    settings: row.settings_json ?? {},
    createdBy: row.created_by,
  };
}

export async function getUserOrganizationMembership(
  supabase: SupabaseServiceClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, member_role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function getOrganizationById(
  supabase: SupabaseServiceClient,
  organizationId: string,
): Promise<OrganizationRecord | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, status, settings_json, created_by")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapOrganizationRow(data) : null;
}

export async function getPublicOrganizationBySlug(
  supabase: SupabaseServiceClient,
  slug: string,
): Promise<PublicOrganizationRecord | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("name, slug, logo_url, status")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.status !== "active") return null;

  return {
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
  };
}

async function collectTakenSlugs(
  supabase: SupabaseServiceClient,
  excludeOrganizationId?: string,
): Promise<Set<string>> {
  const { data, error } = await supabase.from("organizations").select("id, slug");
  if (error) throw new Error(error.message);

  return new Set(
    (data ?? [])
      .filter((row) => row.id !== excludeOrganizationId)
      .map((row) => row.slug)
      .filter((slug): slug is string => typeof slug === "string"),
  );
}

export async function createOrganizationForOwner(input: {
  supabase: SupabaseServiceClient;
  userId: string;
  name: string;
  slug?: string;
}): Promise<OrganizationRecord> {
  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("VALIDATION: Tên công ty phải có ít nhất 2 ký tự.");
  }

  const existingMembership = await getUserOrganizationMembership(
    input.supabase,
    input.userId,
  );
  if (existingMembership) {
    throw new Error("CONFLICT: Tài khoản đã thuộc một công ty.");
  }

  const takenSlugs = await collectTakenSlugs(input.supabase);
  const requestedSlug = input.slug?.trim()
    ? slugifyOrganizationName(input.slug)
    : slugifyOrganizationName(name);
  if (!isValidOrganizationSlug(requestedSlug)) {
    throw new Error("VALIDATION: Slug công ty không hợp lệ.");
  }
  const slug = dedupeOrganizationSlug(requestedSlug, takenSlugs);
  const now = new Date().toISOString();

  const { data: organization, error: organizationError } = await input.supabase
    .from("organizations")
    .insert({
      name,
      slug,
      status: "active",
      settings_json: {},
      created_by: input.userId,
      updated_at: now,
    })
    .select("id, name, slug, logo_url, status, settings_json, created_by")
    .single();

  if (organizationError) {
    throw new Error(organizationError.message);
  }

  const { error: membershipError } = await input.supabase
    .from("organization_members")
    .insert({
      organization_id: organization.id,
      user_id: input.userId,
      member_role: "owner",
      department_id: "khac",
      invited_at: now,
      updated_at: now,
    });

  if (membershipError) {
    await input.supabase.from("organizations").delete().eq("id", organization.id);
    throw new Error(membershipError.message);
  }

  return mapOrganizationRow(organization);
}

export async function updateOrganizationForOwner(input: {
  supabase: SupabaseServiceClient;
  organizationId: string;
  userId: string;
  name?: string;
  logoUrl?: string | null;
  settings?: Record<string, unknown>;
}): Promise<OrganizationRecord> {
  const membership = await getUserOrganizationMembership(input.supabase, input.userId);
  if (
    !membership ||
    membership.organization_id !== input.organizationId ||
    membership.member_role !== "owner"
  ) {
    throw new Error("FORBIDDEN: Chỉ chủ công ty mới chỉnh sửa được cài đặt.");
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new Error("VALIDATION: Tên công ty phải có ít nhất 2 ký tự.");
    }
    patch.name = name;
  }

  if (input.logoUrl !== undefined) {
    patch.logo_url = input.logoUrl?.trim() || null;
  }

  if (input.settings) {
    patch.settings_json = input.settings;
  }

  const { data, error } = await input.supabase
    .from("organizations")
    .update(patch)
    .eq("id", input.organizationId)
    .select("id, name, slug, logo_url, status, settings_json, created_by")
    .single();

  if (error) throw new Error(error.message);
  return mapOrganizationRow(data);
}
