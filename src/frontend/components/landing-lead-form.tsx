"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function LandingLeadForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") ?? "").trim(),
      name: String(formData.get("name") ?? "").trim(),
      source: "landing",
    };

    if (!payload.email) {
      setStatus("error");
      setErrorMessage("Vui lòng nhập email.");
      return;
    }

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error ?? "Có lỗi xảy ra, vui lòng thử lại.");
      }

      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra, vui lòng thử lại.",
      );
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand text-2xl text-brand-foreground">
          ✓
        </div>
        <p className="mt-3 font-display text-xl font-bold text-brand">
          Đã ghi nhận!
        </p>
        <p className="mt-1 text-sm text-ink-2">
          Cảm ơn bạn — chúng tôi sẽ gửi tin khi sản phẩm mở cửa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-ink-2"
        >
          Tên của bạn <span className="font-normal text-ink-3">(tùy chọn)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          placeholder="Ví dụ: Nguyễn Văn A"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-ink-2"
        >
          Email <span className="text-accent">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="ban@congty.vn"
          className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-base transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
        />
      </div>
      {status === "error" && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-3.5 text-base font-semibold text-accent-foreground shadow-md transition hover:bg-accent/90 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Đang gửi..." : "Nhận tin khi mở cửa →"}
      </button>
      <p className="text-center text-xs text-ink-3">
        Không spam. Chỉ một email khi sản phẩm sẵn sàng.
      </p>
    </form>
  );
}
