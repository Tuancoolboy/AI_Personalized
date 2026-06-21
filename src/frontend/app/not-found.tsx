import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-6xl font-bold text-brand">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-ink">
        Không tìm thấy trang
      </h1>
      <p className="mt-2 max-w-md text-ink-2">
        Đường dẫn có thể đã đổi hoặc trang không tồn tại.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-brand px-7 text-base font-semibold text-brand-foreground transition hover:bg-brand-2"
      >
        Về trang chủ
      </Link>
    </div>
  );
}
