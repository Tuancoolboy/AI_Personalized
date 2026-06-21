import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Trợ Lý — Học AI sát công việc của bạn trong tuần đầu",
  description:
    "Lộ trình AI cá nhân hóa theo vai trò + trợ lý AI giải thích bằng ví dụ thực tế. Dành cho nhân viên SME Việt Nam.",
};

const fontVariables: CSSProperties = {
  ["--font-sans" as string]:
    '"Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  ["--font-display" as string]:
    '"Bricolage Grotesque", "Be Vietnam Pro", "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  ["--font-geist-mono" as string]:
    '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Monaco, monospace',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased" style={fontVariables}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
