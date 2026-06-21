"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildOAuthCallbackUrl } from "@/lib/google-oauth";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

type AuthGoogleButtonProps = {
  nextPath: string | null;
  label?: string;
};

function GoogleIcon() {
  return (
    <svg
      aria-hidden
      className="size-5 shrink-0"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthGoogleButton({
  nextPath,
  label = "Đăng nhập bằng Google",
}: AuthGoogleButtonProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isSupabaseConfigured()) {
    return null;
  }

  async function handleGoogleSignIn() {
    setStatus("loading");
    setErrorMessage("");

    try {
      const supabase = createSupabaseBrowserClient();
      const redirectTo = buildOAuthCallbackUrl(
        window.location.origin,
        nextPath,
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setStatus("error");
        setErrorMessage(
          error.message.includes("provider")
            ? "Google chưa được bật trên Supabase. Xem docs/ops/supabase-setup.md."
            : "Không mở được đăng nhập Google. Vui lòng thử lại.",
        );
      }
    } catch {
      setStatus("error");
      setErrorMessage("Lỗi hệ thống. Vui lòng thử lại sau.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={status === "loading"}
        className="inline-flex w-full items-center justify-center gap-3 rounded-full border-2 border-line bg-card px-6 py-3.5 text-base font-semibold text-ink shadow-sm transition hover:border-brand/30 hover:bg-brand-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {status === "loading" ? "Đang chuyển sang Google..." : label}
      </button>
      {status === "error" && errorMessage && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

export function AuthDivider({ text }: { text?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <div className="w-full border-t border-line" />
      </div>
      {text ? (
        <p className="relative mx-auto w-fit bg-card px-3 text-xs font-medium uppercase tracking-wide text-ink-3">
          {text}
        </p>
      ) : null}
    </div>
  );
}
