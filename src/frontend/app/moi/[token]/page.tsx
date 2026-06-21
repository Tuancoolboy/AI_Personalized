import type { Metadata } from "next";
import Link from "next/link";
import {
  buildInviteAcceptPath,
  buildInvitePath,
  findActiveInviteLinkByToken,
  mapInviteLink,
} from "@/lib/company-invite-links";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import {
  createSupabaseServiceClient,
  getCurrentUser,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Link mời công ty · AI Trợ Lý",
};

type InvitePageProps = {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
};

function inviteErrorMessage(error?: string): string {
  if (error === "already-member") {
    return "Tài khoản này đã thuộc một công ty khác nên không thể tham gia thêm công ty này.";
  }
  if (error === "accept") {
    return "Chưa thể thêm bạn vào công ty. Vui lòng thử lại hoặc báo quản lý đổi link.";
  }
  return "";
}

async function loadInvite(token: string) {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  try {
    const row = await findActiveInviteLinkByToken(
      createSupabaseServiceClient(),
      token,
    );
    return row ? mapInviteLink(row, "http://localhost") : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[invite-page:load]", message);
    return null;
  }
}

async function loadCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export default async function InvitePage({
  params,
  searchParams,
}: InvitePageProps) {
  const { token } = await params;
  const query = await searchParams;
  const invite = await loadInvite(token);
  const userId = await loadCurrentUserId();
  const acceptPath = buildInviteAcceptPath(token);
  const invitePath = buildInvitePath(token);
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}`;
  const registerHref = `/register?next=${encodeURIComponent(invitePath)}`;
  const transientError = inviteErrorMessage(query.error);

  if (!invite) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 text-ink">
        <section className="mx-auto max-w-xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Link mời
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
            Link không còn hiệu lực
          </h1>
          <p className="mt-3 text-sm leading-6 text-ink-2">
            Link mời này sai, đã bị đổi token, hoặc hệ thống chưa cấu hình
            Supabase để kiểm tra lời mời thật.
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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Link mời công ty
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Tham gia {invite.organizationName}
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">
          Bạn được mời vào không gian học AI của công ty. Sau khi đăng ký hoặc
          đăng nhập, hệ thống sẽ tự thêm bạn vào đúng danh sách nhân viên.
        </p>

        {transientError && (
          <p
            className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
            role="alert"
          >
            {transientError}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {userId ? (
            <form action={acceptPath} method="POST">
              <button
                type="submit"
                className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2"
              >
                Tham gia công ty
              </button>
            </form>
          ) : (
            <>
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
            </>
          )}
        </div>
      </section>
    </main>
  );
}
