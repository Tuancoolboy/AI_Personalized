import { Skeleton } from "@/components/ui/skeleton";

type ShellProps = {
  className?: string;
};

function EmployeeShell({ className, children }: ShellProps & { children: React.ReactNode }) {
  return (
    <div
      className={`mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 md:py-14 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function ManagerShell({ className, children }: ShellProps & { children: React.ReactNode }) {
  return (
    <div
      className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:py-12 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function NarrowShell({ className, children }: ShellProps & { children: React.ReactNode }) {
  return (
    <div
      className={`mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 md:py-14 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

export function PageHeaderSkeleton({
  subtitleLines = 1,
  actionCount = 0,
}: {
  subtitleLines?: number;
  actionCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-3">
        <Skeleton className="h-3 w-24 rounded-full" />
        <Skeleton className="h-9 w-full max-w-md rounded-xl" />
        {Array.from({ length: subtitleLines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full max-w-sm rounded-lg" />
        ))}
      </div>
      {actionCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: actionCount }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-32 rounded-full" />
          ))}
        </div>
      )}
    </div>
  );
}

export function GradientHeroSkeleton() {
  return (
    <Skeleton className="h-36 w-full rounded-3xl sm:h-40" />
  );
}

export function ModuleListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-8 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-line/60 bg-card p-4 sm:p-5"
        >
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-xs rounded-lg" />
            <Skeleton className="h-3 w-1/2 max-w-[10rem] rounded-lg" />
          </div>
          <Skeleton className="hidden h-9 w-20 rounded-full sm:block" />
        </div>
      ))}
    </div>
  );
}

export function StatGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function ChartGridSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-line/60">
      <Skeleton className="h-11 rounded-none" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-t border-line/60 px-4 py-4">
          <Skeleton className="h-4 w-1/4 rounded-lg" />
          <Skeleton className="h-4 w-1/3 rounded-lg" />
          <Skeleton className="h-4 w-1/5 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChatPanelSkeleton() {
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-line/60 bg-card">
      <div className="border-b border-line/60 px-4 py-4 sm:px-6">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="mt-2 h-3 w-64 rounded-lg" />
      </div>
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <div className="flex justify-start">
          <Skeleton className="h-16 w-[78%] rounded-2xl rounded-bl-md" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-[55%] rounded-2xl rounded-br-md" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-20 w-[82%] rounded-2xl rounded-bl-md" />
        </div>
      </div>
      <div className="border-t border-line/60 p-4 sm:p-6">
        <Skeleton className="h-12 w-full rounded-full" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function LessonSkeleton() {
  return (
    <NarrowShell>
      <Skeleton className="h-4 w-28 rounded-lg" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-3 w-36 rounded-full" />
        <Skeleton className="h-9 w-full max-w-lg rounded-xl" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-4/5 rounded-lg" />
      </div>
      <Skeleton className="mt-8 h-48 rounded-2xl" />
      <Skeleton className="mt-6 h-40 rounded-2xl" />
      <Skeleton className="mt-6 h-11 w-40 rounded-full" />
    </NarrowShell>
  );
}

export function LoTrinhPageSkeleton() {
  return (
    <EmployeeShell>
      <GradientHeroSkeleton />
      <Skeleton className="mt-8 h-24 rounded-2xl" />
      <ModuleListSkeleton count={5} />
    </EmployeeShell>
  );
}

export function TienBoPageSkeleton() {
  return (
    <EmployeeShell>
      <GradientHeroSkeleton />
      <StatGridSkeleton count={3} />
      <Skeleton className="mt-8 h-36 rounded-2xl" />
      <Skeleton className="mt-6 h-48 rounded-2xl" />
    </EmployeeShell>
  );
}

export function TroLyPageSkeleton() {
  return (
    <NarrowShell>
      <PageHeaderSkeleton subtitleLines={1} />
      <ChatPanelSkeleton />
    </NarrowShell>
  );
}

export function OnboardingPageSkeleton() {
  return (
    <EmployeeShell className="max-w-3xl">
      <PageHeaderSkeleton subtitleLines={1} />
      <Skeleton className="mt-8 h-2 w-full rounded-full" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </EmployeeShell>
  );
}

export function QuizPageSkeleton() {
  return (
    <EmployeeShell className="max-w-3xl">
      <PageHeaderSkeleton subtitleLines={1} />
      <Skeleton className="mt-8 h-40 rounded-2xl" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </EmployeeShell>
  );
}

export function ManagerDashboardSkeleton() {
  return (
    <ManagerShell>
      <PageHeaderSkeleton subtitleLines={2} actionCount={3} />
      <StatGridSkeleton count={4} />
      <ChartGridSkeleton />
      <Skeleton className="mt-8 h-56 rounded-2xl" />
    </ManagerShell>
  );
}

export function ManagerListPageSkeleton() {
  return (
    <ManagerShell>
      <PageHeaderSkeleton subtitleLines={1} actionCount={1} />
      <div className="mt-6 flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <TableSkeleton rows={6} />
    </ManagerShell>
  );
}

export function CardListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-8 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}

export function ManagerCardListSkeleton() {
  return (
    <ManagerShell>
      <PageHeaderSkeleton subtitleLines={1} actionCount={1} />
      <CardListSkeleton />
    </ManagerShell>
  );
}

export function CompanySettingsSkeleton() {
  return (
    <ManagerShell>
      <PageHeaderSkeleton subtitleLines={1} />
      <Skeleton className="mt-8 h-40 rounded-2xl" />
      <Skeleton className="mt-6 h-56 rounded-2xl" />
    </ManagerShell>
  );
}

export function AuthFormSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải form">
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-8 w-48 rounded-xl" />
        <Skeleton className="mx-auto h-4 w-64 rounded-lg" />
      </div>
      <Skeleton className="h-11 w-full rounded-full" />
      <div className="space-y-4">
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
      <Skeleton className="mx-auto h-4 w-40 rounded-lg" />
    </div>
  );
}

export function AuthFieldsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải form">
      <Skeleton className="h-11 w-full rounded-full" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

export function LandingPageSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line/60 bg-background/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-5 w-24 rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-20 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:py-20">
        <div className="space-y-5">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-12 w-full max-w-lg rounded-xl" />
          <Skeleton className="h-12 w-full max-w-md rounded-xl" />
          <Skeleton className="h-20 w-full max-w-xl rounded-2xl" />
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    </div>
  );
}

export function PublicCardPageSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6 rounded-3xl border border-line/60 bg-card p-6 sm:p-8">
        <Skeleton className="mx-auto h-12 w-12 rounded-2xl" />
        <Skeleton className="mx-auto h-8 w-3/4 rounded-xl" />
        <Skeleton className="h-4 w-full rounded-lg" />
        <Skeleton className="h-4 w-5/6 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

export function InlinePanelSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-16 rounded-xl"} />;
}

export function FloatingChatSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-10 w-3/4 rounded-2xl rounded-bl-md" />
      <Skeleton className="ml-auto h-8 w-1/2 rounded-2xl rounded-br-md" />
    </div>
  );
}

export function AppMainFallbackSkeleton() {
  return (
    <EmployeeShell>
      <PageHeaderSkeleton subtitleLines={2} />
      <StatGridSkeleton count={2} />
      <ModuleListSkeleton count={3} />
    </EmployeeShell>
  );
}
