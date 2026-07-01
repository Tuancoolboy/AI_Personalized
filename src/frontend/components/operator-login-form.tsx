"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import { fetchPlatformAdminWhoami } from "@/lib/client-api";
import {
  DEMO_PLATFORM_ADMIN_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isPlatformAdminEmail,
  isSupabaseConfigured,
} from "@/lib/supabase/is-configured";

type OperatorLoginFormProps = {
  nextFromQuery: string | null;
  urlError: string | null;
  denied: boolean;
};

export function OperatorLoginForm({
  nextFromQuery,
  urlError,
  denied,
}: OperatorLoginFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState(
    denied
      ? "Bạn không có quyền truy cập khu Vận hành hệ thống."
      : urlError
        ? getAuthErrorMessage(urlError, "Đăng nhập thất bại.")
        : "",
  );
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!isSupabaseConfigured()) {
      if (!isPlatformAdminEmail(email)) {
        setStatus("error");
        setErrorMessage("Tài khoản này không có quyền truy cập khu vận hành.");
        return;
      }

      document.cookie = `${DEMO_SESSION_COOKIE}=true; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${DEMO_USER_TYPE_COOKIE}=manager; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `${DEMO_PLATFORM_ADMIN_COOKIE}=true; path=/; max-age=86400; SameSite=Lax`;
      setStatus("success");
      setSuccessMessage("Đã xác thực quyền quản trị. Đang mở khu vận hành...");
      router.push("/van-hanh");
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
        setErrorMessage("Không tạo được phiên đăng nhập. Vui lòng thử lại.");
        return;
      }

      const whoami = await fetchPlatformAdminWhoami();
      if (!whoami.isPlatformAdmin) {
        await supabase.auth.signOut();
        setStatus("error");
        setErrorMessage("Tài khoản này không có quyền truy cập khu vận hành.");
        return;
      }

      setStatus("success");
      setSuccessMessage("Đã xác thực quyền quản trị. Đang mở khu vận hành...");
      window.location.assign("/van-hanh");
    } catch (err) {
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        // Bỏ qua lỗi signOut phụ.
      }
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
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      aria-busy={status === "submitting"}
    >
      {successMessage ? (
        <p
          className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          role="status"
        >
          {successMessage}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="operator-email" className="block text-sm font-medium text-zinc-200">
          Email
        </label>
        <input
          id="operator-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/20"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="operator-password" className="block text-sm font-medium text-zinc-200">
          Mật khẩu
        </label>
        <input
          id="operator-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-slate-400 focus:ring-4 focus:ring-slate-400/20"
        />
      </div>

      {status === "error" ? (
        <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-6 py-4 text-base font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang đăng nhập...
          </>
        ) : (
          <>
            <KeyRound className="h-4 w-4" />
            Đăng nhập quản trị →
          </>
        )}
      </button>

      <p className="text-center text-xs leading-5 text-zinc-400">
        Không dùng cho tài khoản học viên hay quản lý thông thường.
      </p>

      {nextFromQuery ? (
        <input type="hidden" name="next" value={nextFromQuery} />
      ) : null}

      <div className="sr-only" aria-live="polite">
        {status === "submitting" ? "Đang xử lý đăng nhập." : ""}
      </div>
    </form>
  );
}
