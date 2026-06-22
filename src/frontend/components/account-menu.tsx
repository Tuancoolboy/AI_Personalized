"use client";

import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import {
  BarChart3,
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  Mail,
  Map,
  Pencil,
  Route,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  getAccountInitials,
  getAccountMenuItems,
  type AccountMenuItem,
  type AccountMenuItemId,
  type AccountMenuSection,
} from "@/lib/account-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useAppProfile } from "@/hooks/use-app-profile";
import { usePreferredAvatar } from "@/hooks/use-preferred-avatar";
import { buildAvatarIdentity } from "@/lib/avatar-preferences";
import type { UserType } from "@/lib/supabase/is-configured";
import { useAppLogout } from "@/components/app-nav-logout-button";

type AccountMenuProps = {
  userName: string;
  userEmail: string;
  userRoleLabel: string;
  userType: UserType;
  avatarUrl?: string | null;
};

const ICONS: Record<AccountMenuItemId, LucideIcon> = {
  profile: UserRound,
  "edit-profile": Pencil,
  "change-password": KeyRound,
  "update-email": Mail,
  "my-path": Route,
  "learning-results": BarChart3,
  "manage-employees": UsersRound,
  "manage-departments": Building2,
  "manage-paths": Map,
  "progress-report": BarChart3,
  logout: LogOut,
};

const SECTION_ORDER: AccountMenuSection[] = [
  "account",
  "learning",
  "manager",
  "session",
];

function groupItems(items: AccountMenuItem[]): AccountMenuItem[][] {
  return SECTION_ORDER.map((section) =>
    items.filter((item) => item.section === section),
  ).filter((sectionItems) => sectionItems.length > 0);
}

function MenuIcon({ id }: { id: AccountMenuItemId }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden="true" className="size-4 text-ink-3" />;
}

export function AccountMenuTriggerContent({
  userName,
  userEmail,
  userRoleLabel,
  avatarUrl,
}: {
  userName: string;
  userEmail: string;
  userRoleLabel: string;
  avatarUrl?: string | null;
}) {
  const initials = getAccountInitials(userName, userEmail);

  return (
    <>
      <UserAvatar
        avatarUrl={avatarUrl}
        fallbackText={initials}
        alt={`Avatar của ${userName}`}
        className="size-9 flex-none rounded-full border border-line bg-secondary object-cover shadow-sm"
        fallbackClassName="grid size-9 flex-none place-items-center rounded-full bg-brand font-display text-sm font-bold text-brand-foreground shadow-sm"
      />
      <span className="hidden min-w-0 text-left lg:block">
        <span className="block max-w-[9rem] truncate text-sm font-semibold leading-5 text-ink">
          {userName}
        </span>
        <span className="block max-w-[9rem] truncate text-xs leading-4 text-ink-3">
          {userRoleLabel}
        </span>
      </span>
      <ChevronDown
        aria-hidden="true"
        className="size-4 flex-none text-ink-3 transition group-data-[popup-open]/account:rotate-180"
      />
    </>
  );
}

export function AccountMenu({
  userName,
  userEmail,
  userRoleLabel,
  userType,
  avatarUrl,
}: AccountMenuProps) {
  const logout = useAppLogout();
  const sections = groupItems(getAccountMenuItems(userType));
  const { avatar: remoteAvatar, fullName, hydrated } = useAppProfile();
  const avatarIdentity = buildAvatarIdentity(fullName, userName, userEmail);
  const { avatarUrl: preferredAvatarUrl } = usePreferredAvatar(
    avatarIdentity,
    remoteAvatar,
  );
  const effectiveAvatarUrl = hydrated
    ? preferredAvatarUrl
    : avatarUrl ?? preferredAvatarUrl;

  return (
    <Menu.Root modal={false}>
      <Menu.Trigger
        className="group/account inline-flex h-11 max-w-[16rem] items-center gap-2 rounded-full border border-line bg-card px-1.5 pr-2.5 text-left shadow-sm transition hover:border-brand/30 hover:bg-brand-soft/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/20"
        aria-label="Mở menu tài khoản"
      >
        <AccountMenuTriggerContent
          userName={userName}
          userEmail={userEmail}
          userRoleLabel={userRoleLabel}
          avatarUrl={effectiveAvatarUrl}
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-line bg-card p-2 text-sm text-ink shadow-2xl outline-none">
            <div className="flex items-center gap-3 border-b border-line px-3 py-3">
              <UserAvatar
                avatarUrl={effectiveAvatarUrl}
                fallbackText={getAccountInitials(userName, userEmail)}
                alt={`Avatar của ${userName}`}
                className="size-11 flex-none rounded-full border border-line bg-secondary object-cover"
                fallbackClassName="grid size-11 flex-none place-items-center rounded-full bg-brand font-display text-base font-bold text-brand-foreground"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{userName}</p>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {userRoleLabel}
                </p>
                <p className="mt-0.5 truncate text-xs text-ink-3">
                  {userEmail}
                </p>
              </div>
            </div>

            {sections.map((items, sectionIndex) => (
              <div
                key={items[0]?.section ?? sectionIndex}
                className={
                  sectionIndex === 0
                    ? "py-2"
                    : "border-t border-line py-2"
                }
              >
                {items.map((item) => {
                  const className =
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink-2 outline-none transition hover:bg-secondary hover:text-ink data-[highlighted]:bg-secondary data-[highlighted]:text-ink";

                  if (item.id === "logout") {
                    return (
                      <Menu.Item
                        key={item.id}
                        className={`${className} text-destructive hover:bg-destructive/10 hover:text-destructive data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive`}
                        onClick={logout}
                      >
                        <MenuIcon id={item.id} />
                        <span>{item.label}</span>
                      </Menu.Item>
                    );
                  }

                  return (
                    <Menu.LinkItem
                      key={item.id}
                      closeOnClick
                      className={className}
                      render={<Link href={item.href} />}
                    >
                      <MenuIcon id={item.id} />
                      <span>{item.label}</span>
                    </Menu.LinkItem>
                  );
                })}
              </div>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
