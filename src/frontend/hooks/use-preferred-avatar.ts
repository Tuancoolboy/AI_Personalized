"use client";

import { useMemo, useSyncExternalStore } from "react";
import { buildDicebearAvatarUrl } from "@/lib/dicebear";
import {
  AVATAR_PREFERENCE_EVENT,
  buildDefaultAvatarSeed,
  buildDicebearAvatarOptions,
  getPreferredAvatarSeed,
  setPreferredAvatarSeed,
  type DicebearAvatarOption,
} from "@/lib/avatar-preferences";

export function usePreferredAvatar(identity: string) {
  const normalizedIdentity = identity.trim();
  const fallbackSeed = useMemo(
    () => buildDefaultAvatarSeed(normalizedIdentity),
    [normalizedIdentity],
  );
  const options = useMemo<DicebearAvatarOption[]>(
    () => buildDicebearAvatarOptions(normalizedIdentity),
    [normalizedIdentity],
  );
  const selectedSeed = useSyncExternalStore(
    subscribeToAvatarPreference,
    () => getPreferredAvatarSeed(normalizedIdentity) ?? fallbackSeed,
    () => fallbackSeed,
  );

  function selectAvatar(seed: string) {
    setPreferredAvatarSeed(normalizedIdentity, seed);
  }

  return {
    avatarSeed: selectedSeed,
    avatarUrl: buildDicebearAvatarUrl(selectedSeed),
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
