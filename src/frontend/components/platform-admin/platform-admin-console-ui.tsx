import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function chipClass(active = false) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
    active ? "border-brand/20 bg-brand-soft text-brand" : "border-line bg-card text-ink-2",
  );
}

export function PanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("rounded-2xl border border-line bg-card", className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-6 text-ink-2">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="rounded-xl border border-line bg-secondary/40 p-2 text-brand">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-3">Tổng hợp</span>
      </div>
      <p className="mt-4 text-3xl font-bold text-ink">{new Intl.NumberFormat("vi-VN").format(value)}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
    </div>
  );
}

export function MetricMini({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-secondary/20 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-2 text-2xl font-bold text-ink">
        {new Intl.NumberFormat("vi-VN").format(value)}
        {suffix ? <span className="text-sm font-semibold text-ink-2">{suffix}</span> : null}
      </p>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3">{children}</th>;
}

export function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3 align-top", className)}>{children}</td>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-secondary/20 px-5 py-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-ink-2">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ToastBanner({
  kind,
  message,
  onClose,
}: {
  kind: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-4 right-4 z-50 max-w-sm rounded-2xl border px-4 py-3 text-sm shadow-xl",
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-destructive/20 bg-destructive/5 text-destructive",
      )}
    >
      <div className="flex items-start gap-3">
        <p className="min-w-0 flex-1">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-ink-2 hover:text-ink"
          aria-label="Đóng thông báo"
        >
          X
        </button>
      </div>
    </div>
  );
}
