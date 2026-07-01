"use client";

import { AlertTriangle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type {
  PlatformAdminConfirmConfig,
  PlatformAdminConfirmTone,
} from "@/components/platform-admin/platform-admin-console.types";

export function ConfirmActionDialog({
  open,
  onOpenChange,
  config,
  onConfirm,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PlatformAdminConfirmConfig | null;
  onConfirm: () => Promise<void> | void;
  busy?: boolean;
}) {
  const tone: PlatformAdminConfirmTone = config?.tone ?? "default";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Popup
          aria-busy={busy}
          className="w-[min(92vw,34rem)] p-0"
          initialFocus={false}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div
              className={cn(
                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                tone === "destructive"
                  ? "border-destructive/20 bg-destructive/10 text-destructive"
                  : "border-brand/20 bg-brand-soft text-brand",
              )}
            >
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Dialog.Title>{config?.title ?? "Xác nhận thao tác"}</Dialog.Title>
              <Dialog.Description>{config?.description ?? ""}</Dialog.Description>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4">
            <Dialog.Close>Hủy</Dialog.Close>
            <button
              type="button"
              onClick={() => void onConfirm()}
              disabled={busy}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition disabled:opacity-60",
                tone === "destructive"
                  ? "bg-destructive hover:bg-destructive/90"
                  : "bg-brand hover:bg-brand/90",
              )}
            >
              {busy ? "Đang xử lý..." : config?.confirmLabel ?? "Xác nhận"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
