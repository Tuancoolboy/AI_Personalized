import type { UserType } from "@/lib/supabase/is-configured";

export type AccountMenuItemId =
  | "profile"
  | "edit-profile"
  | "change-password"
  | "update-email"
  | "my-path"
  | "learning-results"
  | "manage-employees"
  | "manage-departments"
  | "manage-paths"
  | "progress-report"
  | "logout";

export type AccountMenuSection = "account" | "learning" | "manager" | "session";

export type AccountMenuLinkItem = {
  id: Exclude<AccountMenuItemId, "logout">;
  label: string;
  href: string;
  section: AccountMenuSection;
};

export type AccountMenuActionItem = {
  id: "logout";
  label: string;
  action: "logout";
  section: "session";
};

export type AccountMenuItem = AccountMenuLinkItem | AccountMenuActionItem;

const ACCOUNT_ITEMS: AccountMenuLinkItem[] = [
  {
    id: "profile",
    label: "Thông tin cá nhân",
    href: "/tai-khoan?tab=thong-tin",
    section: "account",
  },
  {
    id: "edit-profile",
    label: "Đổi thông tin",
    href: "/tai-khoan?tab=ho-so",
    section: "account",
  },
  {
    id: "change-password",
    label: "Đổi mật khẩu",
    href: "/tai-khoan?tab=mat-khau",
    section: "account",
  },
  {
    id: "update-email",
    label: "Cập nhật email",
    href: "/tai-khoan?tab=email",
    section: "account",
  },
];

const EMPLOYEE_ITEMS: AccountMenuLinkItem[] = [
  {
    id: "my-path",
    label: "Lộ trình của tôi",
    href: "/lo-trinh",
    section: "learning",
  },
  {
    id: "learning-results",
    label: "Kết quả học tập",
    href: "/tien-bo",
    section: "learning",
  },
];

const MANAGER_ITEMS: AccountMenuLinkItem[] = [
  {
    id: "manage-employees",
    label: "Quản lý nhân viên",
    href: "/quan-ly/nhan-vien",
    section: "manager",
  },
  {
    id: "manage-departments",
    label: "Quản lý phòng ban",
    href: "/quan-ly/cong-ty",
    section: "manager",
  },
  {
    id: "manage-paths",
    label: "Quản lý lộ trình",
    href: "/quan-ly/lo-trinh",
    section: "manager",
  },
  {
    id: "progress-report",
    label: "Báo cáo tiến độ",
    href: "/quan-ly",
    section: "manager",
  },
];

const LOGOUT_ITEM: AccountMenuActionItem = {
  id: "logout",
  label: "Đăng xuất",
  action: "logout",
  section: "session",
};

export function getAccountMenuItems(userType: UserType): AccountMenuItem[] {
  return [
    ...ACCOUNT_ITEMS,
    ...(userType === "manager" ? MANAGER_ITEMS : EMPLOYEE_ITEMS),
    LOGOUT_ITEM,
  ];
}

export function getAccountInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  const cleanName = name?.trim().replace(/\s+/g, " ") ?? "";
  const nameParts = cleanName
    .split(" ")
    .filter(Boolean)
    .filter((part) => part.toLowerCase() !== "demo");

  if (nameParts.length >= 2) {
    const first = Array.from(nameParts[0])[0] ?? "";
    const last = Array.from(nameParts[nameParts.length - 1])[0] ?? "";
    return `${first}${last}`.toUpperCase();
  }

  const fallback = nameParts[0] || email?.split("@")[0] || "A";
  return Array.from(fallback).slice(0, 2).join("").toUpperCase() || "A";
}
