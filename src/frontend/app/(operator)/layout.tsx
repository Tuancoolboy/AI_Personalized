import { Shield } from "lucide-react";
import Link from "next/link";

function OperatorBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-sm shadow-black/10 dark:border-slate-700 dark:bg-slate-900/80">
      <Shield className="h-3.5 w-3.5" />
      Khu vực quản trị hệ thống
    </div>
  );
}

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50">
      <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(63,63,70,0.3),_transparent_42%),linear-gradient(180deg,rgba(24,24,27,1)_0%,rgba(9,9,11,1)_100%)]">
        <main className="mx-auto flex min-h-screen w-full max-w-7xl items-start px-4 py-6 sm:px-6 sm:py-8 lg:items-center lg:px-8 lg:py-8">
          <div className="grid w-full gap-8 lg:grid-cols-[1fr_1.05fr]">
            <section className="hidden flex-col justify-between rounded-[28px] border border-white/10 bg-white/5 p-10 shadow-2xl shadow-black/20 backdrop-blur lg:flex">
              <div className="space-y-6">
                <OperatorBadge />
                <div className="space-y-3">
                  <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight text-white">
                    Cổng vận hành hệ thống
                  </h1>
                  <p className="max-w-xl text-base leading-7 text-zinc-300">
                    Chỉ dành cho quản trị viên hệ thống. Đăng nhập ở đây để vào
                    bảng điều khiển vận hành, kiểm soát tổ chức, người dùng và
                    các thao tác nhạy cảm.
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-300">
                <p className="font-semibold text-white">
                  Quyền truy cập được kiểm tra 3 lớp
                </p>
                <p>
                  Proxy chặn từ cửa vào, page/layout chặn lại ở server, API
                  kiểm tra quyền riêng.
                </p>
              </div>
            </section>

            <section className="flex flex-col justify-center">
              <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <OperatorBadge />
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        Đăng nhập Vận hành
                      </h2>
                      <p className="text-sm leading-6 text-zinc-300">
                        Chỉ dành cho quản trị viên hệ thống.
                      </p>
                    </div>
                  </div>
                </div>

                {children}

                <div className="mt-6 text-center">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-zinc-300 transition hover:text-white"
                  >
                    ← Về trang đăng nhập người dùng
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
