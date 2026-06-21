"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import { buildOAuthCallbackUrl, resolveOAuthNextPath } from "@/lib/google-oauth";
import { AuthDivider, AuthGoogleButton } from "@/components/auth-google-button";
import {
  DEMO_ONBOARDED_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";

function normalizePhoneNumber(value: string): string {
  return value.trim().replace(/[\s().-]+/g, "");
}

function isValidPhoneNumber(value: string): boolean {
  return /^\+?\d{9,15}$/.test(value);
}

export function AuthRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const nextPath = rawNext ? resolveOAuthNextPath(rawNext) : "";
  const registeredHref = nextPath
    ? `/login?registered=1&next=${encodeURIComponent(nextPath)}`
    : "/login?registered=1";
  const loginHref = nextPath
    ? `/login?next=${encodeURIComponent(nextPath)}`
    : "/login";
  const [status, setStatus] = useState<"idle" | "submitting" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const phoneNumber = normalizePhoneNumber(
      String(formData.get("phoneNumber") ?? ""),
    );
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!fullName) {
      setStatus("error");
      setErrorMessage("Vui lòng nhập họ và tên.");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setStatus("error");
      setErrorMessage("Vui lòng nhập số điện thoại hợp lệ.");
      return;
    }

    if (password.length < 8) {
      setStatus("error");
      setErrorMessage("Mật khẩu cần ít nhất 8 ký tự.");
      return;
    }

    // Demo mode: đăng ký xong vẫn bắt đăng nhập lại, không tạo demo session ngay.
    if (!isSupabaseConfigured()) {
      document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${DEMO_USER_TYPE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      document.cookie = `${DEMO_ONBOARDED_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
      router.replace(registeredHref);
      router.refresh();
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectUrl = buildOAuthCallbackUrl(
        window.location.origin,
        nextPath || null,
      );
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { full_name: fullName, phone_number: phoneNumber },
        },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(getAuthErrorMessage(error.code, error.message));
        return;
      }

      if (data.session) {
        await supabase.auth.signOut();
      }

      window.location.assign(registeredHref);
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
      <AuthGoogleButton nextPath={rawNext} label="Đăng ký bằng Google" />
      <AuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="block text-sm font-semibold text-ink-2">
          Họ và tên
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          placeholder="Nguyễn Văn A"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="phoneNumber" className="block text-sm font-semibold text-ink-2">
          Số điện thoại
        </label>
        <input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          autoComplete="tel"
          placeholder="0901234567"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-semibold text-ink-2">
          Email công ty
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
          Mật khẩu <span className="font-normal text-ink-3">(≥ 8 ký tự)</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Đang tạo..." : "Tạo tài khoản →"}
      </button>
      <p className="text-center text-sm text-ink-2">
        Đã có tài khoản?{" "}
        <Link href={loginHref} className="font-semibold text-brand hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
    </div>
  );
}
