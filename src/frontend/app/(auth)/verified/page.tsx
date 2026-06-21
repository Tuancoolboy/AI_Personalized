import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthVerifiedContent } from "@/components/auth-verified-content";
import { AuthFieldsSkeleton } from "@/components/skeletons/page-skeletons";

export const metadata: Metadata = {
  title: "Hoàn tất đăng nhập · AI Trợ Lý",
};

export default function VerifiedPage() {
  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Hoàn tất đăng nhập
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
          Tài khoản của bạn
        </h1>
      </div>
      <Suspense fallback={<AuthFieldsSkeleton />}>
        <AuthVerifiedContent />
      </Suspense>
    </div>
  );
}
