"use client";

import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

function DialogRoot(props: React.ComponentProps<typeof BaseDialog.Root>) {
  return <BaseDialog.Root {...props} />;
}

function DialogTrigger(props: React.ComponentProps<typeof BaseDialog.Trigger>) {
  return <BaseDialog.Trigger {...props} />;
}

function DialogPortal(props: React.ComponentProps<typeof BaseDialog.Portal>) {
  return <BaseDialog.Portal {...props} />;
}

function DialogBackdrop(props: React.ComponentProps<typeof BaseDialog.Backdrop>) {
  return (
    <BaseDialog.Backdrop
      {...props}
      className={cn(
        "fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] data-[transition-status=opening]:animate-in data-[transition-status=closing]:animate-out",
        props.className,
      )}
    />
  );
}

function DialogPopup(props: React.ComponentProps<typeof BaseDialog.Popup>) {
  return (
    <BaseDialog.Popup
      {...props}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 text-ink shadow-2xl outline-none data-[transition-status=opening]:animate-in data-[transition-status=closing]:animate-out",
        props.className,
      )}
    />
  );
}

function DialogTitle(props: React.ComponentProps<typeof BaseDialog.Title>) {
  return <BaseDialog.Title {...props} className={cn("font-display text-lg font-bold", props.className)} />;
}

function DialogDescription(props: React.ComponentProps<typeof BaseDialog.Description>) {
  return <BaseDialog.Description {...props} className={cn("mt-2 text-sm leading-6 text-ink-2", props.className)} />;
}

function DialogClose(props: React.ComponentProps<typeof BaseDialog.Close>) {
  return (
    <BaseDialog.Close
      {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-full border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand",
        props.className,
      )}
    />
  );
}

export const Dialog = {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Popup: DialogPopup,
  Title: DialogTitle,
  Description: DialogDescription,
  Close: DialogClose,
  createHandle: BaseDialog.createHandle,
};
