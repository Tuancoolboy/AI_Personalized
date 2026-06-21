import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthRegisterForm } from "@/components/auth-register-form";
import { AuthFieldsSkeleton } from "@/components/skeletons/page-skeletons";

export const metadata: Metadata = {
  title: "Đăng ký · AI Trợ Lý",
};

export default function RegisterPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Bắt đầu hành trình
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
          Tạo tài khoản
        </h1>
        <p className="mt-1.5 text-sm text-ink-2">
          Miễn phí trong thời gian dùng thử.
        </p>
      </div>
      <Suspense fallback={<AuthFieldsSkeleton />}>
        <AuthRegisterForm />
      </Suspense>
    </div>
  );
}
