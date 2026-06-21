"use client";

// Supabase đôi khi trả lỗi auth trong hash (#error=...) — server không đọc được.
// Component này chuyển user sang /verified với message đúng.
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { buildVerifiedErrorUrl } from "@/lib/auth-link-errors";

export function AuthLinkErrorGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, ""),
    );

    const error =
      searchParams.get("error") ?? hashParams.get("error") ?? undefined;
    const errorCode =
      searchParams.get("error_code") ??
      hashParams.get("error_code") ??
      undefined;
    const description =
      searchParams.get("error_description") ??
      hashParams.get("error_description") ??
      undefined;

    if (!error && !errorCode && !description) return;

    const target = buildVerifiedErrorUrl(window.location.origin, {
      error,
      errorCode,
      description,
    });

    router.replace(`${target.pathname}${target.search}`);
  }, [router, searchParams]);

  return null;
}
