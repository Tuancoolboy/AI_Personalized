import { Skeleton } from "@/components/ui/skeleton";

export function PlatformAdminConsoleSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
      <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-6 w-44 rounded-full" />
          <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
          <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-b border-line pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-4 space-y-3">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 rounded-2xl" />
      <Skeleton className="mt-4 h-64 rounded-2xl" />
    </div>
  );
}
