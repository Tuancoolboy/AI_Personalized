"use client";
/* eslint-disable @next/next/no-img-element */

import { useId, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Pencil } from "lucide-react";
import type {
  AppAvatarChoice,
  AppAvatarOption,
} from "@/lib/avatar-preferences";

type DicebearAvatarPickerProps = {
  displayName: string;
  avatarUrl: string;
  fallbackText: string;
  selectedChoice: AppAvatarChoice;
  options: AppAvatarOption[];
  onSelect: (choice: AppAvatarChoice) => void;
  align?: "center" | "start";
  size?: "lg" | "md";
};

export function DicebearAvatarPicker({
  displayName,
  avatarUrl,
  fallbackText,
  selectedChoice,
  options,
  onSelect,
  align = "center",
  size = "lg",
}: DicebearAvatarPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const wrapperClassName =
    align === "center" ? "mx-auto w-max text-center" : "w-max text-left";

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setUploadError("");

    try {
      const dataUrl = await convertAvatarFileToDataUrl(file);
      onSelect({
        provider: "upload",
        id: dataUrl,
      });
      setPickerOpen(false);
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : "Chưa tải được ảnh đại diện.",
      );
    }
  }

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

      {pickerOpen ? (
        <div className="w-full max-w-72 rounded-2xl border border-line bg-background p-3 shadow-sm">
          <input
            id={fileInputId}
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={handleUploadChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mb-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/35 bg-brand-soft/40 px-3 text-xs font-bold text-brand transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            <ImagePlus className="size-4" aria-hidden="true" />
            Tải ảnh lên làm avatar
          </button>

          <div className="grid max-h-[22rem] grid-cols-4 gap-2 overflow-y-auto pr-1">
            {options.map((option, index) => {
              const active =
                option.provider === selectedChoice.provider &&
                option.id === selectedChoice.id;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    onSelect({
                      provider: option.provider,
                      id: option.id,
                    });
                    setPickerOpen(false);
                  }}
                  className={`rounded-2xl border p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                    active
                      ? "border-brand bg-brand-soft shadow-sm"
                      : "border-line bg-card hover:border-brand/40 hover:bg-brand-soft/40"
                  }`}
                  aria-label={`Chọn avatar mẫu ${index + 1}`}
                  aria-pressed={active}
                  title={`${option.group} · ${option.label}`}
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
          {uploadError ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700">
              {uploadError}
            </p>
          ) : null}
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
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageFailed = failedSrc === src;

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
      onError={() => setFailedSrc(src)}
    />
  );
}

async function convertAvatarFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Chỉ hỗ trợ tệp hình ảnh.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const maxSize = 320;
    const scale = Math.min(maxSize / image.width, maxSize / image.height, 1);
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Trình duyệt chưa hỗ trợ xử lý ảnh avatar.");
    }

    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/webp", 0.86);

    if (dataUrl.length > 350_000) {
      throw new Error("Ảnh quá lớn. Hãy chọn ảnh nhỏ hơn.");
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("Không đọc được ảnh. Hãy thử ảnh khác."));
    image.src = src;
  });
}
