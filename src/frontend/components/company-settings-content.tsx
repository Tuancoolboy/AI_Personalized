"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createOrganization,
  updateCurrentOrganization,
  type OrganizationSummary,
} from "@/lib/client-api";
import { slugifyOrganizationName } from "@/lib/organization-slug";

type CompanySettingsContentProps = {
  initialOrganization: OrganizationSummary | null;
  membershipRole: string | null;
};

export function CompanySettingsContent({
  initialOrganization,
  membershipRole,
}: CompanySettingsContentProps) {
  const router = useRouter();
  const isOwner = membershipRole === "owner";
  const canCreate = !initialOrganization;

  const [name, setName] = useState(initialOrganization?.name ?? "");
  const [slugPreview, setSlugPreview] = useState(initialOrganization?.slug ?? "");
  const [logoUrl, setLogoUrl] = useState(initialOrganization?.logoUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function handleNameChange(value: string) {
    setName(value);
    if (canCreate) {
      setSlugPreview(slugifyOrganizationName(value));
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await createOrganization({ name, slug: slugPreview });
      setMessage(result.message ?? "Đã tạo công ty.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được công ty.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !isOwner) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await updateCurrentOrganization({
        name,
        logoUrl: logoUrl.trim() || null,
      });
      setMessage(result.message ?? "Đã cập nhật công ty.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được công ty.");
    } finally {
      setSaving(false);
    }
  }

  if (canCreate) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Thiết lập công ty
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
          Tạo không gian học AI cho công ty
        </h1>
        <p className="mt-3 text-sm leading-6 text-ink-2">
          Sau khi tạo, bạn sẽ nhận link công ty ổn định để mời nhân viên tham gia.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleCreate}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Tên công ty</span>
            <input
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="VD: Công ty ABC"
              required
              minLength={2}
            />
          </label>

          <div className="rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink-2">
            Link công ty dự kiến:{" "}
            <span className="font-medium text-ink">
              /c/{slugPreview || "cong-ty"}
            </span>
          </div>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60"
          >
            {saving ? "Đang tạo..." : "Tạo công ty"}
          </button>
        </form>
      </section>
    );
  }

  const entryPath = `/c/${initialOrganization.slug}`;

  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-card p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
        Công ty
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
        {initialOrganization.name}
      </h1>
      <p className="mt-3 text-sm leading-6 text-ink-2">
        Vai trò của bạn:{" "}
        <span className="font-medium text-ink">
          {membershipRole === "owner"
            ? "Chủ công ty"
            : membershipRole === "manager"
              ? "Quản lý"
              : "Nhân viên"}
        </span>
      </p>

      <div className="mt-5 rounded-xl border border-line bg-background px-4 py-3 text-sm">
        <div className="text-ink-2">Link vào công ty</div>
        <Link href={entryPath} className="mt-1 inline-flex font-medium text-brand hover:underline">
          {entryPath}
        </Link>
      </div>

      {isOwner ? (
        <form className="mt-6 space-y-4" onSubmit={handleUpdate}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Tên hiển thị</span>
            <input
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-ink">Logo URL (tuỳ chọn)</span>
            <input
              className="w-full rounded-xl border border-line bg-background px-4 py-3 text-sm"
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>

          {error && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm text-brand">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      ) : (
        <p className="mt-6 text-sm text-ink-2">
          Chỉ chủ công ty mới chỉnh sửa được cài đặt. Liên hệ quản lý nếu cần đổi
          thông tin hiển thị.
        </p>
      )}
    </section>
  );
}
