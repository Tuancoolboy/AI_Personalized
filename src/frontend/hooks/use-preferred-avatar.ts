"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  AVATAR_PREFERENCE_EVENT,
  buildAvatarPreviewUrl,
  buildAvatarPickerOptions,
  getPreferredAvatarSeedForIdentities,
  setPreferredAvatarChoiceForIdentities,
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
  aliasIdentities: Array<string | null | undefined> = [],
) {
  const normalizedIdentity = identity.trim();
  const normalizedAliasIdentities = useMemo(
    () =>
      Array.from(
        new Set(
          aliasIdentities
            .map((candidate) => candidate?.trim() ?? "")
            .filter(
              (candidate) =>
                candidate.length > 0 && candidate !== normalizedIdentity,
            ),
        ),
      ),
    [aliasIdentities, normalizedIdentity],
  );
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
  const lookupIdentities = useMemo(
    () => [normalizedIdentity, ...normalizedAliasIdentities],
    [normalizedAliasIdentities, normalizedIdentity],
  );
  const selectedSeed = useSyncExternalStore(
    subscribeToAvatarPreference,
    () => getPreferredAvatarSeedForIdentities(lookupIdentities) ?? fallbackSeed,
    () => fallbackSeed,
  );
  const selectedChoice = useMemo(
    () => parseAvatarChoice(selectedSeed) ?? remoteAvatar ?? fallbackChoice,
    [fallbackChoice, remoteAvatar, selectedSeed],
  );

  useEffect(() => {
    if (!normalizedAliasIdentities.length) return;
    const currentSeed = getPreferredAvatarSeedForIdentities([normalizedIdentity]);
    if (currentSeed) return;

    const aliasSeed = getPreferredAvatarSeedForIdentities(
      normalizedAliasIdentities,
    );
    const aliasChoice = parseAvatarChoice(aliasSeed);
    if (!aliasChoice) return;

    setPreferredAvatarChoiceForIdentities(
      normalizedIdentity,
      normalizedAliasIdentities,
      aliasChoice,
    );
  }, [normalizedAliasIdentities, normalizedIdentity]);

  function selectAvatar(choice: AppAvatarChoice) {
    setPreferredAvatarChoiceForIdentities(
      normalizedIdentity,
      normalizedAliasIdentities,
      choice,
    );
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
