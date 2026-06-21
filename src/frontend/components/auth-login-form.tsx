"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import { resolveOAuthNextPath } from "@/lib/google-oauth";
import { AuthDivider, AuthGoogleButton } from "@/components/auth-google-button";
import {
  DEMO_ONBOARDED_COOKIE,
  DEMO_PLATFORM_ADMIN_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  detectUserTypeFromEmail,
  isPlatformAdminEmail,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";

type AuthLoginFormProps = {
  nextFromQuery: string | null;
  urlError: string | null;
  urlSuccess: string | null;
  registered: boolean;
};

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  auth_callback:
    "Link xác nhận email không hợp lệ hoặc đã hết hạn. Thử đăng nhập lại hoặc đăng ký mới.",
  no_supabase: "Hệ thống chưa cấu hình Supabase.",
};

const LOGIN_SUCCESS_MESSAGES: Record<string, string> = {
  verified:
    "Đăng nhập thành công! Tiếp tục lộ trình của bạn.",
  registered: "Tạo tài khoản thành công. Đăng nhập để tiếp tục lộ trình của bạn.",
};

function resolveLoginNextPath(value: string | null): string {
  return resolveOAuthNextPath(value);
}

export function AuthLoginForm({
  nextFromQuery,
  urlError,
  urlSuccess,
  registered,
}: AuthLoginFormProps) {
  const router = useRouter();
  const nextPath = resolveLoginNextPath(nextFromQuery);
  const registerHref =
    nextFromQuery && nextPath !== "/onboarding"
      ? `/register?next=${encodeURIComponent(nextPath)}`
      : "/register";
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState(
    urlError ? (LOGIN_ERROR_MESSAGES[urlError] ?? "Đăng nhập thất bại.") : "",
  );
  const successMessage = registered
    ? LOGIN_SUCCESS_MESSAGES.registered
    : urlSuccess
      ? (LOGIN_SUCCESS_MESSAGES[urlSuccess] ?? "")
      : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    // Demo mode: chưa cấu hình Supabase → set cookie + redirect, bypass auth thật.
    if (!isSupabaseConfigured()) {
      const userType = detectUserTypeFromEmail(email);
      const isPlatformAdmin = isPlatformAdminEmail(email);
      document.cookie = `${DEMO_SESSION_COOKIE}=true; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${DEMO_USER_TYPE_COOKIE}=${userType}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${DEMO_PLATFORM_ADMIN_COOKIE}=${isPlatformAdmin ? "true" : ""}; path=/; max-age=86400; SameSite=Lax`;
      const onboarded = document.cookie.includes(
        `${DEMO_ONBOARDED_COOKIE}=true`,
      );
      const redirect = isPlatformAdmin
        ? "/quan-tri"
        : userType === "manager"
          ? "/quan-ly"
          : onboarded
            ? "/lo-trinh"
            : nextPath;
      router.push(redirect);
      router.refresh();
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus("error");
        setErrorMessage(getAuthErrorMessage(error.code, error.message));
        return;
      }

      if (!data.session) {
        setStatus("error");
        setErrorMessage("Không tạo được phiên đăng nhập. Thử lại hoặc kiểm tra thông tin đăng nhập.");
        return;
      }

      // Full navigation — proxy đọc organization_members + role_id để redirect.
      window.location.assign(nextPath);
    } catch (err) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "";
      if (message.includes("URL") || message.includes("API key")) {
        setErrorMessage(
          "Hệ thống chưa cấu hình Supabase. Vui lòng điền keys vào .env.local — xem docs/ops/supabase-setup.md.",
        );
      } else {
        setErrorMessage("Lỗi hệ thống. Vui lòng thử lại sau.");
      }
    }
  }

  return (
    <div className="space-y-4">
      <AuthGoogleButton nextPath={nextFromQuery} />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
      {successMessage && (
        <p
          className="rounded-xl border border-brand/20 bg-brand-soft px-4 py-3 text-sm font-medium text-brand"
          role="status"
        >
          {successMessage}
        </p>
      )}
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-ink-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ban@congty.vn"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-semibold text-ink-2">
          Mật khẩu
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      {status === "error" && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center rounded-full bg-brand px-6 py-3.5 text-base font-semibold text-brand-foreground shadow-md transition hover:bg-brand-2 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Đang đăng nhập..." : "Đăng nhập →"}
      </button>
      <p className="text-center text-sm text-ink-2">
        Chưa có tài khoản?{" "}
        <Link href={registerHref} className="font-semibold text-brand hover:underline">
          Đăng ký
        </Link>
      </p>
    </form>
    </div>
  );
}
