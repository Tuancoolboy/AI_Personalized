"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

export function RouteDeniedBanner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const denied = searchParams.get("denied") === "1";
  const operatorLearningNotice =
    searchParams.get("operator_notice") === "learning";
  const shouldShow = denied || operatorLearningNotice;
  const handledRef = useRef(false);
  const [noticeKind, setNoticeKind] = useState<"denied" | "learning" | null>(
    operatorLearningNotice ? "learning" : denied ? "denied" : null,
  );

  useEffect(() => {
    if (!shouldShow || handledRef.current) return;
    handledRef.current = true;
    setNoticeKind(operatorLearningNotice ? "learning" : "denied");
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("denied");
    nextUrl.searchParams.delete("operator_notice");
    window.setTimeout(() => {
      setNoticeKind(null);
    }, 5000);
    router.replace(
      `${pathname}${nextUrl.search ? `?${nextUrl.searchParams.toString()}` : ""}`,
    );
  }, [operatorLearningNotice, pathname, router, shouldShow]);

  if (!noticeKind) return null;

  const message = noticeKind === "learning"
    ? "Tài khoản vận hành không có lộ trình học. Hãy quay về khu Vận hành để quản trị hệ thống."
    : "Bạn không có quyền truy cập khu Vận hành hệ thống.";

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl items-start gap-3 text-sm sm:px-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="flex-1">{message}</p>
        {noticeKind === "learning" && (
          <a
            href="/van-hanh"
            className="rounded-full border border-amber-300 px-3 py-1 text-xs font-semibold transition hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/40"
          >
            Về Vận hành
          </a>
        )}
        <button
          type="button"
          className="rounded-full p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900 dark:text-amber-200 dark:hover:bg-amber-900/40"
          aria-label="Đóng thông báo"
          onClick={() => setNoticeKind(null)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
