"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";

type UserAvatarProps = {
  avatarUrl?: string | null;
  fallbackText: string;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  avatarUrl,
  fallbackText,
  alt,
  className = "size-10 rounded-full border border-line bg-secondary object-cover",
  fallbackClassName = "grid size-10 place-items-center rounded-full bg-brand font-display text-sm font-bold text-brand-foreground",
}: UserAvatarProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const imageFailed = Boolean(avatarUrl && failedUrl === avatarUrl);

  if (!avatarUrl || imageFailed) {
    return <span className={fallbackClassName}>{fallbackText}</span>;
  }

  return (
    <img
      src={avatarUrl}
      alt={alt}
      className={className}
      onError={() => setFailedUrl(avatarUrl)}
    />
  );
}
