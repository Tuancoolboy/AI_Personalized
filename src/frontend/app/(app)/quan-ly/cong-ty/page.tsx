import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CompanySettingsContent } from "@/components/company-settings-content";
import { resolveApiSession } from "@/lib/api-auth";
import {
  getOrganizationById,
  getUserOrganizationMembership,
} from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Công ty · AI Trợ Lý",
};

export default async function CongTyPage() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="px-4 py-8 sm:px-6">
        <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-card p-6 text-sm text-ink-2">
          Thiết lập công ty thật cần cấu hình Supabase và service role key.
        </section>
      </main>
    );
  }

  const session = await resolveApiSession();
  if (!session || session.mode !== "supabase") {
    redirect("/login?next=/quan-ly/cong-ty");
  }

  const supabase = createSupabaseServiceClient();
  const membership = await getUserOrganizationMembership(
    supabase,
    session.userId,
  );
  const organization = membership
    ? await getOrganizationById(supabase, membership.organization_id)
    : null;

  return (
    <main className="px-4 py-8 sm:px-6">
      <CompanySettingsContent
        initialOrganization={organization}
        membershipRole={membership?.member_role ?? null}
      />
    </main>
  );
}
