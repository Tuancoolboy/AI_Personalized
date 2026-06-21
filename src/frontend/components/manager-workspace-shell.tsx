"use client";

type ManagerWorkspaceShellProps = {
  children: React.ReactNode;
  organizationName?: string;
  memberCount?: number;
  maxMembers?: number;
};

export function ManagerWorkspaceShell({
  children,
}: ManagerWorkspaceShellProps) {
  return (
    <div className="flex flex-1">
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
