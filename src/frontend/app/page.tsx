import Link from "next/link";
import { Suspense } from "react";
import { AuthLinkErrorGuard } from "@/components/auth-link-error-guard";
import { LandingLeadForm } from "@/components/landing-lead-form";

const PAIN_POINTS = [
  {
    icon: "💸",
    title: "Đào tạo đắt",
    body: "2–5 triệu/người/lần nhưng nhân viên mới vào lại phải đào tạo lại từ đầu.",
  },
  {
    icon: "🌫️",
    title: "Nội dung chung chung",
    body: "Học xong không biết áp dụng vào công việc kinh doanh / kế toán / marketing của mình.",
  },
  {
    icon: "📉",
    title: "Không đo được",
    body: "Không có con số nào chứng minh nhân viên đã giỏi AI hơn, doanh nghiệp tiết kiệm được gì.",
  },
];

const PILLARS = [
  {
    tag: "Cá nhân hóa",
    icon: "🎯",
    title: "Lộ trình theo vai trò",
    body: "Chọn 1 trong 5 vai trò (kinh doanh, kế toán, marketing, vận hành, khác) — nhận lộ trình + bộ prompt + công cụ AI dùng được ngay.",
  },
  {
    tag: "Trợ lý 24/7",
    icon: "✦",
    title: "Trợ lý AI gia sư",
    body: "Hỏi đáp 24/7. Trả lời bằng ví dụ từ chính công việc của bạn — không phải lý thuyết AI khô khan.",
  },
  {
    tag: "Bằng chứng",
    icon: "📈",
    title: "Tiến bộ đo được",
    body: "Kiểm tra tình huống thực tế + nhật ký 1-chạm 'AI giúp tiết kiệm bao nhiêu giờ'. Có con số để pitch sếp.",
  },
];

const VALUE_POINTS = [
  {
    glyph: "◷",
    title: "Lộ trình cá nhân hóa theo vai trò",
    body: "Bán hàng học khác kế toán. Không học lý thuyết LLM trừu tượng.",
  },
  {
    glyph: "✦",
    title: "Trợ lý AI giải thích bằng ví dụ đúng nghề",
    body: "Hỏi 'AI là gì?' → nhận ví dụ ngay từ công việc bạn đang làm.",
  },
  {
    glyph: "↗",
    title: "Đo lường được — sếp xem được dashboard",
    body: "Tổng giờ tiết kiệm + % hoàn thành + điểm thực hành. Có số để pitch.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <AuthLinkErrorGuard />
      </Suspense>
      <header className="border-b border-line/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-brand-foreground font-display text-xl font-extrabold shadow-sm">
              A
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-ink">
              AI Trợ Lý
            </span>
          </Link>
          <nav className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="whitespace-nowrap text-sm font-medium text-ink-2 hover:text-ink"
            >
              Đăng nhập
            </Link>
            <Link
              href="#dang-ky"
              className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand-2 sm:px-5"
            >
              Nhận tin sớm
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:gap-12 sm:px-6 sm:pb-20 sm:pt-16 md:grid-cols-2 md:gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16 lg:pb-28">
            <div className="flex flex-col justify-center">
              <span className="self-start rounded-full border border-line bg-card/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Phổ cập AI nền tảng
              </span>
              <h1 className="mt-6 font-display text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl sm:leading-[1.05] md:text-6xl lg:text-7xl">
                Để mỗi nhân viên{" "}
                <em className="font-medium not-italic text-accent">tự dùng được AI</em>{" "}
                trong tuần đầu tiên.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
                Không cần nền tảng kỹ thuật. Học đúng việc của mình — bằng ngôn
                ngữ đời thường + ví dụ từ chính nghề bạn đang làm.
              </p>

              <ul className="mt-8 space-y-4">
                {VALUE_POINTS.map((point) => (
                  <li key={point.title} className="flex items-start gap-3.5">
                    <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-brand-soft text-brand">
                      {point.glyph}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{point.title}</p>
                      <p className="mt-0.5 text-sm text-ink-2">{point.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#dang-ky"
                  className="inline-flex h-12 items-center justify-center rounded-full bg-accent px-8 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90 hover:-translate-y-0.5"
                >
                  Nhận tin khi mở cửa →
                </Link>
                <Link
                  href="#tru-cot"
                  className="inline-flex h-12 items-center justify-center rounded-full border-2 border-line bg-card px-8 text-base font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  Xem sản phẩm có gì
                </Link>
              </div>
            </div>

            {/* Hero illustration card */}
            <div className="relative hidden items-center justify-center md:flex">
              <div className="relative w-full max-w-md rounded-[2rem] bg-brand p-8 text-brand-foreground shadow-2xl">
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-accent/40 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-brand-2/60 blur-3xl" />
                <div className="relative">
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-foreground/15 px-3 py-1 text-xs font-semibold text-brand-foreground">
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    Trợ lý AI đang trả lời...
                  </span>
                  <div className="mt-5 space-y-3 text-sm">
                    <div className="rounded-2xl bg-accent/20 px-4 py-3 leading-relaxed">
                      <p className="text-xs font-semibold uppercase tracking-wider text-accent-foreground/80">
                        Bạn
                      </p>
                      <p className="mt-1">AI giúp em viết email chốt sale thế nào?</p>
                    </div>
                    <div className="rounded-2xl bg-card/95 px-4 py-3 text-ink shadow-sm">
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                        Trợ lý AI
                      </p>
                      <p className="mt-1 leading-relaxed">
                        Em thử cấu trúc 3 bước: (1) Nhắc bối cảnh khách, (2) Đưa
                        1 giá trị cụ thể, (3) CTA rõ ràng. VD cho gói 50 triệu:
                        ...
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="rounded-full bg-brand-foreground/15 px-3 py-1 text-xs">
                        Xử lý &quot;đắt quá&quot;
                      </span>
                      <span className="rounded-full bg-brand-foreground/15 px-3 py-1 text-xs">
                        Viết kịch bản gọi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Điểm đau */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Vấn đề
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Tại sao khóa đào tạo AI cũ
              <br />
              không hiệu quả?
            </h2>
            <p className="mt-3 text-ink-2">
              Ba điểm đau quen thuộc với mọi doanh nghiệp 10–200 người.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAIN_POINTS.map((point) => (
              <div
                key={point.title}
                className="rounded-2xl border border-line bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl">{point.icon}</div>
                <h3 className="mt-4 font-display text-xl font-bold text-ink">
                  {point.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3 trụ cột */}
        <section id="tru-cot" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Giải pháp
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Cách AI Trợ Lý giúp bạn
            </h2>
            <p className="mt-3 text-ink-2">
              Ba trụ cột tập trung vào giá trị tức thời, không phải lý thuyết.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="relative overflow-hidden rounded-2xl border border-line bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="absolute right-5 top-5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {pillar.tag}
                </span>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-2xl text-brand-foreground">
                  {pillar.icon}
                </div>
                <h3 className="mt-5 font-display text-xl font-bold text-ink">
                  {pillar.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-2">
                  {pillar.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Form thu lead */}
        <section
          id="dang-ky"
          className="mx-auto max-w-6xl scroll-mt-16 px-4 py-14 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-xl overflow-hidden rounded-[2rem] border border-line bg-card shadow-xl">
            <div className="bg-brand px-5 py-6 text-brand-foreground sm:px-8 sm:py-7">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                Sắp ra mắt
              </span>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Đăng ký nhận tin sớm
              </h2>
              <p className="mt-2 text-sm text-brand-foreground/80">
                Bạn sẽ là người đầu tiên biết khi sản phẩm mở cửa — kèm gói dùng
                thử miễn phí.
              </p>
            </div>
            <div className="px-5 py-6 sm:px-8 sm:py-8">
              <LandingLeadForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-card/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-center text-sm text-ink-3 sm:flex-row sm:px-6 sm:py-7 sm:text-left">
          <p>© 2026 AI Trợ Lý · Team 09 · AI20K — VinUniversity</p>
          <p>
            Liên hệ:{" "}
            <a
              href="mailto:hello@aitroly.vn"
              className="font-semibold text-ink-2 hover:text-brand"
            >
              hello@aitroly.vn
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
