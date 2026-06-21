"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAuthLinkErrorContent } from "@/lib/auth-link-errors";

export function AuthVerifiedContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "success";
  const isError = status === "error";

  if (isError) {
    const content = getAuthLinkErrorContent(
      searchParams.get("code"),
      searchParams.get("error"),
      searchParams.get("description"),
    );

    return (
      <div className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10 text-2xl text-destructive">
          !
        </div>
        <div>
          <p className="font-display text-xl font-bold text-ink">
            {content.title}
          </p>
          <p className="mt-1 text-sm text-ink-2">{content.body}</p>
          <p className="mt-2 text-xs text-ink-3">{content.hint}</p>
        </div>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2"
        >
          Về trang đăng nhập →
        </Link>
        <Link
          href="/register"
          className="inline-flex text-sm font-semibold text-brand hover:underline"
        >
          Đăng ký lại
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-brand/20 bg-brand-soft p-7 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-2xl text-brand-foreground">
        ✓
      </div>
      <div>
        <p className="font-display text-xl font-bold text-brand">Tài khoản đã sẵn sàng!</p>
        <p className="mt-1 text-sm text-ink-2">
          Đăng nhập để tiếp tục lộ trình AI của bạn.
        </p>
      </div>
      <Link
        href="/login"
        className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2"
      >
        Đăng nhập ngay →
      </Link>
    </div>
  );
}
