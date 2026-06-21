"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { DicebearAvatarOption } from "@/lib/avatar-preferences";

type DicebearAvatarPickerProps = {
  displayName: string;
  avatarUrl: string;
  fallbackText: string;
  selectedSeed: string;
  options: DicebearAvatarOption[];
  onSelect: (seed: string) => void;
  align?: "center" | "start";
  size?: "lg" | "md";
};

export function DicebearAvatarPicker({
  displayName,
  avatarUrl,
  fallbackText,
  selectedSeed,
  options,
  onSelect,
  align = "center",
  size = "lg",
}: DicebearAvatarPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const wrapperClassName =
    align === "center" ? "mx-auto w-max text-center" : "w-max text-left";

  return (
    <div className={`space-y-3 ${wrapperClassName}`}>
      <button
        type="button"
        onClick={() => setPickerOpen((current) => !current)}
        className="group relative block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-expanded={pickerOpen}
        aria-label={`Đổi avatar của ${displayName}`}
      >
        <DicebearAvatarImage
          key={avatarUrl}
          src={avatarUrl}
          alt={`Avatar của ${displayName}`}
          fallbackText={fallbackText}
          size={size}
        />
        <span className="absolute inset-0 rounded-full ring-1 ring-brand/15 transition group-hover:ring-brand/35" />
        <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full border-2 border-card bg-card text-brand shadow-sm">
          <Pencil className="size-3.5" aria-hidden="true" />
        </span>
      </button>

      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
        Nhấn avatar để chọn mẫu DiceBear
      </p>

      {pickerOpen ? (
        <div className="w-full max-w-72 rounded-2xl border border-line bg-background p-3 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {options.map((option, index) => {
              const active = option.seed === selectedSeed;
              return (
                <button
                  key={option.seed}
                  type="button"
                  onClick={() => {
                    onSelect(option.seed);
                    setPickerOpen(false);
                  }}
                  className={`rounded-2xl border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    active
                      ? "border-brand bg-brand-soft shadow-sm"
                      : "border-line bg-card hover:border-brand/40 hover:bg-brand-soft/40"
                  }`}
                  aria-label={`Chọn avatar mẫu ${index + 1}`}
                  aria-pressed={active}
                >
                  <DicebearAvatarImage
                    src={option.url}
                    alt=""
                    fallbackText={fallbackText}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DicebearAvatarImage({
  src,
  alt,
  fallbackText,
  size,
}: {
  src: string;
  alt: string;
  fallbackText: string;
  size: "sm" | "md" | "lg";
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const sizeClassName =
    size === "lg" ? "size-16" : size === "md" ? "size-14" : "size-12";
  const textClassName =
    size === "lg" ? "text-lg" : size === "md" ? "text-base" : "text-xs";

  if (imageFailed) {
    return (
      <span
        className={`grid ${sizeClassName} place-items-center rounded-full bg-amber-500 font-display font-extrabold text-white shadow-md ${textClassName}`}
      >
        {fallbackText}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClassName} rounded-full bg-secondary object-cover shadow-md`}
      onError={() => setImageFailed(true)}
    />
  );
}
