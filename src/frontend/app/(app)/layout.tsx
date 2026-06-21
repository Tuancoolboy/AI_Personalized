// Layout cho khu vực cần đăng nhập. Proxy đã chặn user chưa login,
// nhưng vẫn double-check ở server để an toàn + render nav có user info.
// Hỗ trợ demo mode khi Supabase chưa cấu hình.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  isSupabaseConfigured,
  type UserType,
} from "@/lib/supabase/is-configured";
import { AppAssistantHost } from "@/components/app-assistant-host";
import { AppNav } from "@/components/app-nav";
import { getManagerMembershipForUser } from "@/lib/manager-auth";
import { isPlatformAdminUser } from "@/lib/platform-admin-auth";

const EMPLOYEE_NAV = [
  { href: "/lo-trinh", label: "Lộ trình" },
  { href: "/tro-ly", label: "Trợ lý AI" },
  { href: "/bang-xep-hang", label: "Xếp hạng" },
  { href: "/hoc-tap", label: "Học tập" },
  { href: "/tien-bo", label: "Tiến bộ" },
];

const MANAGER_NAV = [
  { href: "/quan-ly", label: "Tổng quan" },
  { href: "/quan-ly/lo-trinh", label: "Lộ trình" },
  { href: "/quan-ly/nhan-vien", label: "Nhân viên" },
  { href: "/quan-ly/cai-dat", label: "Công cụ AI" },
  { href: "/bang-xep-hang", label: "Xếp hạng" },
  { href: "/tro-ly", label: "Trợ lý AI" },
];

import {
  metadataFullName,
  resolveFullDisplayName,
} from "@/lib/display-name";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseReady = isSupabaseConfigured();

  let userEmail = "Demo User";
  let userDisplayName = "Demo User";
  let isDemo = false;
  let userType: UserType = "employee";

  if (supabaseReady) {
    const user = await getCurrentUser();
    if (!user) {
      redirect("/login");
    }
    userEmail = user.email ?? "Người dùng";

    const supabase = await createSupabaseServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    userDisplayName = resolveFullDisplayName({
      profileFullName: profile?.full_name,
      metadataFullName: metadataFullName(user.user_metadata),
      email: user.email,
      fallback: userEmail,
    });

    userType = (await getManagerMembershipForUser(user.id))
      ? "manager"
      : "employee";
  } else {
    const cookieStore = await cookies();
    const hasDemoSession =
      cookieStore.get(DEMO_SESSION_COOKIE)?.value === "true";
    if (!hasDemoSession) {
      redirect("/login");
    }
    isDemo = true;
    const typeCookie = cookieStore.get(DEMO_USER_TYPE_COOKIE)?.value;
    if (typeCookie === "manager") userType = "manager";
    userEmail = userType === "manager" ? "Chị Quản lý" : "Demo User";
    userDisplayName = userEmail;
  }

  const isPlatformAdmin = await isPlatformAdminUser();
  const baseNav = userType === "manager" ? MANAGER_NAV : EMPLOYEE_NAV;
  // Platform admin thấy thêm link khu Quản trị nền tảng (/quan-tri).
  const NAV_ITEMS = isPlatformAdmin
    ? [{ href: "/quan-tri", label: "Quản trị" }, ...baseNav]
    : baseNav;
  const userRoleLabel =
    userType === "manager"
      ? "Trưởng phòng"
      : isDemo
        ? "Nhân viên · Demo"
        : "Nhân viên";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {isDemo && (
        <div className="bg-accent/95 text-accent-foreground">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs sm:px-6 sm:text-sm">
            <p>
              <strong>Demo mode</strong> · Chưa cấu hình Supabase nên dữ liệu
              không được lưu. Xem{" "}
              <code className="rounded bg-accent-foreground/15 px-1.5 py-0.5">
                docs/ops/supabase-setup.md
              </code>{" "}
              để bật chế độ thật.
            </p>
          </div>
        </div>
      )}
      <AppNav
        navItems={NAV_ITEMS}
        userName={userDisplayName}
        userEmail={userEmail}
        userRoleLabel={userRoleLabel}
        userType={userType}
        homeHref={userType === "manager" ? "/quan-ly" : "/lo-trinh"}
      />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <AppAssistantHost
        userType={userType}
        displayName={userDisplayName}
      />
    </div>
  );
}
