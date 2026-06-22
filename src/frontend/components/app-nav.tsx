"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/account-menu";
import type { UserType } from "@/lib/supabase/is-configured";

type NavItem = { href: string; label: string };

type AppNavProps = {
  navItems: NavItem[];
  userName: string;
  userEmail: string;
  userRoleLabel: string;
  userType: UserType;
  homeHref: string;
  avatarUrl?: string | null;
};

export function AppNav({
  navItems,
  userName,
  userEmail,
  userRoleLabel,
  userType,
  homeHref,
  avatarUrl,
}: AppNavProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header className="border-b border-line bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href={homeHref} className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-brand font-display text-lg font-extrabold text-brand-foreground">
              A
            </span>
            <span className="truncate font-display text-base font-bold tracking-tight text-ink">
              AI Trợ Lý
            </span>
            {userType === "manager" && (
              <span className="ml-0.5 hidden rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent sm:inline">
                Quản lý
              </span>
            )}
          </Link>

          <nav className="hidden items-center gap-1 md:flex md:gap-2">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== homeHref && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "border-b-2 px-3 py-2 text-sm font-medium transition " +
                    (active
                      ? "border-brand text-brand"
                      : "border-transparent text-ink-2 hover:text-brand")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
            <span className="mx-1 hidden text-line lg:inline">|</span>
            <AccountMenu
              userName={userName}
              userEmail={userEmail}
              userRoleLabel={userRoleLabel}
              userType={userType}
              avatarUrl={avatarUrl}
            />
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <AccountMenu
              userName={userName}
              userEmail={userEmail}
              userRoleLabel={userRoleLabel}
              userType={userType}
              avatarUrl={avatarUrl}
            />
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-line text-lg text-ink-2 transition hover:bg-secondary"
              aria-expanded={menuOpen}
              aria-controls="app-mobile-nav"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" id="app-mobile-nav">
          <button
            type="button"
            className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]"
            aria-label="Đóng menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,18rem)] flex-col border-l border-line bg-card shadow-2xl">
            <div className="border-b border-line px-4 py-4">
              <p className="truncate text-sm font-semibold text-ink">{userName}</p>
              <p className="mt-0.5 truncate text-xs text-ink-3">{userEmail}</p>
              <p className="mt-0.5 text-xs text-ink-3">{userRoleLabel}</p>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== homeHref && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={
                      "rounded-xl px-4 py-3 text-base font-medium transition " +
                      (active
                        ? "bg-brand-soft text-brand"
                        : "text-ink-2 hover:bg-secondary hover:text-ink")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
