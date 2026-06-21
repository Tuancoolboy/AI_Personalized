import Link from "next/link";

const VALUE_POINTS = [
  {
    glyph: "◷",
    body: "Lộ trình học **cá nhân hóa theo vai trò** — bán hàng học khác kế toán.",
  },
  {
    glyph: "✦",
    body: "Trợ lý AI giải thích bằng **ví dụ từ chính công việc** của bạn.",
  },
  {
    glyph: "↗",
    body: "Tiến bộ **đo được** — có con số để pitch sếp xin ngân sách.",
  },
];

function renderBold(text: string) {
  return text.split("**").map((part, idx) =>
    idx % 2 === 1 ? (
      <strong key={idx} className="font-semibold text-brand-foreground">
        {part}
      </strong>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-full flex-1 lg:grid-cols-[1.05fr_.95fr]">
      {/* Brand panel — chỉ hiện desktop */}
      <aside className="relative hidden overflow-hidden bg-brand p-14 text-brand-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-60px] top-[-60px] h-[420px] w-[420px] rounded-full bg-accent/30 blur-3xl" />
          <div className="absolute bottom-[-80px] left-[-80px] h-[480px] w-[480px] rounded-full bg-brand-2/60 blur-3xl" />
        </div>

        <Link href="/" className="relative z-10 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-foreground/95 font-display text-xl font-extrabold text-brand">
            A
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            AI Trợ Lý
          </span>
        </Link>

        <div className="relative z-10">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
            Phổ cập AI nền tảng
          </span>
          <h1 className="mt-4 font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Để mỗi nhân viên{" "}
            <em className="font-medium not-italic text-accent">
              tự dùng được AI
            </em>{" "}
            trong tuần đầu tiên.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-brand-foreground/80">
            Không cần nền tảng kỹ thuật. Học đúng việc của mình — bằng ngôn ngữ
            đời thường.
          </p>

          <ul className="mt-8 space-y-4">
            {VALUE_POINTS.map((point) => (
              <li
                key={point.glyph}
                className="flex items-start gap-3.5 text-sm leading-relaxed text-brand-foreground/85"
              >
                <span className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-brand-foreground/20 bg-brand-foreground/10 text-accent">
                  {point.glyph}
                </span>
                <span>{renderBold(point.body)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-brand-foreground/60">
          Dự án Giai đoạn 1 · Team 09 · AI20K Build Cohort 2 · VinUniversity
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line/60 px-4 py-3 sm:px-6 sm:py-4 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand font-display text-lg font-extrabold text-brand-foreground">
              A
            </span>
            <span className="font-display text-base font-bold tracking-tight text-ink">
              AI Trợ Lý
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-ink-2 hover:text-ink"
          >
            ← Về trang chủ
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
