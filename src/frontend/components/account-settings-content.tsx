"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DicebearAvatarPicker } from "@/components/dicebear-avatar-picker";
import { usePreferredAvatar } from "@/hooks/use-preferred-avatar";
import { getAccountInitials } from "@/lib/account-menu";
import { buildAvatarIdentity } from "@/lib/avatar-preferences";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buildOAuthCallbackUrl } from "@/lib/google-oauth";
import { getAuthErrorMessage } from "@/lib/auth-messages";
import { updateProfile } from "@/lib/client-api";
import {
  ACCOUNT_TABS,
  type AccountTab,
  validateEmailUpdate,
  validateFullName,
  validatePasswordChange,
  validatePhoneNumber,
} from "@/lib/account-settings";
import type { UserType } from "@/lib/supabase/is-configured";

type AccountProfile = {
  fullName: string;
  email: string;
  phoneNumber: string;
  roleLabel: string;
};

type AccountSettingsContentProps = {
  activeTab: AccountTab;
  initialProfile: AccountProfile;
  userType: UserType;
  isDemo: boolean;
};

type FormStatus = {
  kind: "idle" | "success" | "error";
  message: string;
};

const TAB_LABELS: Record<AccountTab, string> = {
  "thong-tin": "Thông tin cá nhân",
  "ho-so": "Đổi thông tin",
  "mat-khau": "Đổi mật khẩu",
  email: "Cập nhật email",
};

const EMPTY_STATUS: FormStatus = { kind: "idle", message: "" };

function StatusMessage({ status }: { status: FormStatus }) {
  if (status.kind === "idle") return null;
  const isSuccess = status.kind === "success";
  return (
    <p
      className={
        "rounded-xl border px-4 py-3 text-sm font-medium " +
        (isSuccess
          ? "border-brand/20 bg-brand-soft text-brand"
          : "border-destructive/30 bg-destructive/10 text-destructive")
      }
      role={isSuccess ? "status" : "alert"}
    >
      {status.message}
    </p>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-ink-2">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink transition placeholder:text-ink-3 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10 disabled:cursor-not-allowed disabled:opacity-60";

const primaryButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-full bg-brand px-5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-2 disabled:cursor-not-allowed disabled:opacity-60";

function getAsyncErrorMessage(
  err: unknown,
  fallbackMessage: string,
): string {
  return err instanceof Error && err.message ? err.message : fallbackMessage;
}

export function AccountSettingsContent({
  activeTab,
  initialProfile,
  userType,
  isDemo,
}: AccountSettingsContentProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialProfile.fullName);
  const [email] = useState(initialProfile.email);
  const [phoneNumber, setPhoneNumber] = useState(initialProfile.phoneNumber);
  const [profileStatus, setProfileStatus] =
    useState<FormStatus>(EMPTY_STATUS);
  const [passwordStatus, setPasswordStatus] =
    useState<FormStatus>(EMPTY_STATUS);
  const [emailStatus, setEmailStatus] = useState<FormStatus>(EMPTY_STATUS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const avatarIdentity = buildAvatarIdentity(
    fullName,
    initialProfile.fullName,
    email,
  );
  const {
    avatarOptions,
    avatarSeed,
    avatarUrl,
    selectAvatar,
  } = usePreferredAvatar(avatarIdentity);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingProfile) return;
    setProfileStatus(EMPTY_STATUS);

    const nameResult = validateFullName(fullName);
    if (!nameResult.ok) {
      setProfileStatus({ kind: "error", message: nameResult.message });
      return;
    }
    const phoneResult = validatePhoneNumber(phoneNumber);
    if (!phoneResult.ok) {
      setProfileStatus({ kind: "error", message: phoneResult.message });
      return;
    }

    if (isDemo) {
      setFullName(nameResult.value);
      setPhoneNumber(phoneResult.value);
      setProfileStatus({
        kind: "success",
        message: "Demo mode: thông tin chỉ đổi trên màn hình hiện tại.",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const result = await updateProfile({
        fullName: nameResult.value,
        phoneNumber: phoneResult.value || null,
      });
      setFullName(result.fullName ?? nameResult.value);
      setPhoneNumber(result.phoneNumber ?? "");
      setProfileStatus({
        kind: "success",
        message: "Đã cập nhật thông tin cá nhân.",
      });
      router.refresh();
    } catch (err) {
      setProfileStatus({
        kind: "error",
        message:
          err instanceof Error ? err.message : "Không cập nhật được hồ sơ.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingPassword) return;
    const form = event.currentTarget;
    setPasswordStatus(EMPTY_STATUS);

    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const passwordResult = validatePasswordChange({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!passwordResult.ok) {
      setPasswordStatus({ kind: "error", message: passwordResult.message });
      return;
    }

    if (isDemo) {
      setPasswordStatus({
        kind: "error",
        message: "Demo mode không có tài khoản Supabase thật để đổi mật khẩu.",
      });
      return;
    }

    setSavingPassword(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: passwordResult.value,
        current_password: currentPassword,
      });

      if (error) {
        setPasswordStatus({
          kind: "error",
          message: getAuthErrorMessage(error.code, error.message),
        });
        return;
      }

      form.reset();
      setPasswordStatus({
        kind: "success",
        message: "Đã cập nhật mật khẩu.",
      });
    } catch (err) {
      setPasswordStatus({
        kind: "error",
        message: getAsyncErrorMessage(err, "Không cập nhật được mật khẩu."),
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingEmail) return;
    setEmailStatus(EMPTY_STATUS);

    const formData = new FormData(event.currentTarget);
    const nextEmail = String(formData.get("email") ?? "");
    const emailResult = validateEmailUpdate(nextEmail, email);
    if (!emailResult.ok) {
      setEmailStatus({ kind: "error", message: emailResult.message });
      return;
    }

    if (isDemo) {
      setEmailStatus({
        kind: "error",
        message: "Demo mode không có tài khoản Supabase thật để cập nhật email.",
      });
      return;
    }

    setSavingEmail(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser(
        { email: emailResult.value },
        {
          emailRedirectTo: buildOAuthCallbackUrl(
            window.location.origin,
            "/tai-khoan?tab=email",
          ),
        },
      );

      if (error) {
        setEmailStatus({
          kind: "error",
          message: getAuthErrorMessage(error.code, error.message),
        });
        return;
      }

      setEmailStatus({
        kind: "success",
        message:
          "Đã gửi yêu cầu cập nhật email. Vui lòng kiểm tra hộp thư để xác nhận.",
      });
    } catch (err) {
      setEmailStatus({
        kind: "error",
        message: getAsyncErrorMessage(
          err,
          "Không gửi được yêu cầu cập nhật email.",
        ),
      });
    } finally {
      setSavingEmail(false);
    }
  }

  const roleText =
    userType === "manager"
      ? `${initialProfile.roleLabel} · Quyền quản lý`
      : initialProfile.roleLabel;

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-6 sm:px-6 lg:py-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
          Tài khoản
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink">
          Cài đặt cá nhân
        </h1>
      </div>

      <nav className="flex gap-2 overflow-x-auto border-b border-line pb-2">
        {ACCOUNT_TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <Link
              key={tab}
              href={`/tai-khoan?tab=${tab}`}
              className={
                "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition " +
                (active
                  ? "bg-brand text-brand-foreground"
                  : "text-ink-2 hover:bg-secondary hover:text-ink")
              }
            >
              {TAB_LABELS[tab]}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-line bg-card p-5 shadow-sm sm:p-6">
        {activeTab === "thong-tin" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-4">
              <DicebearAvatarPicker
                align="start"
                avatarUrl={avatarUrl}
                displayName={fullName}
                fallbackText={getAccountInitials(fullName, email)}
                onSelect={selectAvatar}
                options={avatarOptions}
                selectedSeed={avatarSeed}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-ink">{fullName}</h2>
                <p className="mt-1 truncate text-sm text-ink-2">{email}</p>
              </div>
            </div>
            <p className="rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink-2">
              Avatar hiện dùng cho trải nghiệm học tập và phòng team trên trình duyệt này.
            </p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-background px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
                  Vai trò
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">{roleText}</dd>
              </div>
              <div className="rounded-xl border border-line bg-background px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-3">
                  Số điện thoại
                </dt>
                <dd className="mt-1 text-sm font-semibold text-ink">
                  {phoneNumber || "Chưa cập nhật"}
                </dd>
              </div>
            </dl>
            {isDemo && (
              <p className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-ink-2">
                Demo mode: thông tin tài khoản chỉ dùng để xem thử giao diện.
              </p>
            )}
          </div>
        )}

        {activeTab === "ho-so" && (
          <form className="space-y-4" onSubmit={handleProfileSubmit}>
            <Field label="Họ và tên">
              <input
                className={inputClassName}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                autoComplete="name"
                required
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                className={inputClassName}
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                type="tel"
                autoComplete="tel"
                placeholder="0901234567"
              />
            </Field>
            <StatusMessage status={profileStatus} />
            <button
              type="submit"
              disabled={savingProfile}
              className={primaryButtonClassName}
            >
              {savingProfile ? "Đang lưu..." : "Lưu thông tin"}
            </button>
          </form>
        )}

        {activeTab === "mat-khau" && (
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <Field label="Mật khẩu hiện tại">
              <input
                className={inputClassName}
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            <Field label="Mật khẩu mới">
              <input
                className={inputClassName}
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Field label="Nhập lại mật khẩu mới">
              <input
                className={inputClassName}
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <StatusMessage status={passwordStatus} />
            <button
              type="submit"
              disabled={savingPassword}
              className={primaryButtonClassName}
            >
              {savingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
            </button>
          </form>
        )}

        {activeTab === "email" && (
          <form className="space-y-4" onSubmit={handleEmailSubmit}>
            <div className="rounded-xl border border-line bg-background px-4 py-3 text-sm text-ink-2">
              Email hiện tại:{" "}
              <span className="font-semibold text-ink">{email}</span>
            </div>
            <Field label="Email mới">
              <input
                className={inputClassName}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="banmoi@congty.vn"
                required
              />
            </Field>
            <p className="text-sm leading-6 text-ink-2">
              Sau khi gửi, Supabase có thể yêu cầu xác nhận ở email mới và email
              hiện tại tùy cấu hình bảo mật.
            </p>
            <StatusMessage status={emailStatus} />
            <button
              type="submit"
              disabled={savingEmail}
              className={primaryButtonClassName}
            >
              {savingEmail ? "Đang gửi..." : "Gửi xác nhận email"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
