"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  AVATAR_PREFERENCE_EVENT,
  buildAvatarPreviewUrl,
  buildAvatarPickerOptions,
  getPreferredAvatarSeed,
  setPreferredAvatarChoice,
  type AppAvatarChoice,
  type AppAvatarOption,
} from "@/lib/avatar-preferences";
import {
  buildDefaultAvatarChoice,
  parseAvatarChoice,
  serializeAvatarChoice,
} from "@/lib/app-avatar";

export function usePreferredAvatar(
  identity: string,
  remoteAvatar?: AppAvatarChoice | null,
) {
  const normalizedIdentity = identity.trim();
  const fallbackChoice = useMemo(
    () => buildDefaultAvatarChoice(normalizedIdentity),
    [normalizedIdentity],
  );
  const options = useMemo<AppAvatarOption[]>(
    () => buildAvatarPickerOptions(normalizedIdentity),
    [normalizedIdentity],
  );
  const fallbackSeed = useMemo(
    () => serializeAvatarChoice(remoteAvatar ?? fallbackChoice),
    [fallbackChoice, remoteAvatar],
  );
  const selectedSeed = useSyncExternalStore(
    subscribeToAvatarPreference,
    () => getPreferredAvatarSeed(normalizedIdentity) ?? fallbackSeed,
    () => fallbackSeed,
  );
  const selectedChoice = useMemo(
    () => parseAvatarChoice(selectedSeed) ?? remoteAvatar ?? fallbackChoice,
    [fallbackChoice, remoteAvatar, selectedSeed],
  );

  function selectAvatar(choice: AppAvatarChoice) {
    setPreferredAvatarChoice(normalizedIdentity, choice);
  }

  return {
    avatarChoice: selectedChoice,
    avatarSeed: serializeAvatarChoice(selectedChoice),
    avatarUrl: buildAvatarPreviewUrl(selectedChoice, normalizedIdentity),
    avatarOptions: options,
    selectAvatar,
  };
}

function subscribeToAvatarPreference(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(AVATAR_PREFERENCE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(AVATAR_PREFERENCE_EVENT, onStoreChange);
  };
}
