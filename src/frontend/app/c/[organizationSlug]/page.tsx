import type { Metadata } from "next";
import Link from "next/link";
import { getPublicOrganizationBySlug } from "@/lib/organizations";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CompanyEntryPageProps = {
  params: Promise<{ organizationSlug: string }>;
};

export async function generateMetadata({
  params,
}: CompanyEntryPageProps): Promise<Metadata> {
  const { organizationSlug } = await params;
  return {
    title: `${organizationSlug} · AI Trợ Lý`,
  };
}

export default async function CompanyEntryPage({ params }: CompanyEntryPageProps) {
  const { organizationSlug } = await params;
  const loginHref = `/login?next=${encodeURIComponent(`/c/${organizationSlug}`)}`;
  const registerHref = `/register?next=${encodeURIComponent(`/c/${organizationSlug}`)}`;

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-ink">
        <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Công ty chưa sẵn sàng
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-2">
            Hệ thống chưa cấu hình Supabase để hiển thị trang công ty thật.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Về đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  let organization = null;
  try {
    organization = await getPublicOrganizationBySlug(
      createSupabaseServiceClient(),
      organizationSlug,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[company-entry:load]", message);
  }

  if (!organization) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-ink">
        <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Công ty
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Không tìm thấy công ty
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-2">
            Link công ty này không tồn tại hoặc đã bị vô hiệu hoá.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Về đăng nhập
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-ink">
      <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
        {organization.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organization.logoUrl}
            alt={organization.name}
            className="mb-4 h-14 w-14 rounded-2xl object-cover"
          />
        ) : null}
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Không gian học AI
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          {organization.name}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">
          Đăng nhập hoặc tạo tài khoản để học AI theo lộ trình của công ty. Nếu
          bạn mới được mời, hãy dùng link mời từ quản lý để tham gia đúng công ty.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={registerHref}
            className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
          >
            Tạo tài khoản
          </Link>
          <Link
            href={loginHref}
            className="inline-flex rounded-full border-2 border-line bg-card px-5 py-2.5 text-sm font-semibold text-ink-2 transition hover:border-brand hover:text-brand"
          >
            Đăng nhập
          </Link>
        </div>
      </section>
    </main>
  );
}
