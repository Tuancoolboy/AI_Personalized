import {
  buildAvatarOptions,
  buildAvatarUrl,
  normalizeAvatarChoice,
  normalizeAvatarIdentity,
  parseAvatarChoice,
  serializeAvatarChoice,
  type AppAvatarChoice,
  type AppAvatarOption,
} from "@/lib/app-avatar";

const AVATAR_STORAGE_KEY = "ai_troly_avatar_preferences_v2";
const LEGACY_AVATAR_STORAGE_KEY = "ai_troly_avatar_preferences_v1";

export const AVATAR_PREFERENCE_EVENT =
  "ai-troly-avatar-preference-updated";

export type { AppAvatarChoice, AppAvatarOption };

export function buildAvatarIdentity(
  ...candidates: Array<string | null | undefined>
): string {
  return buildAvatarIdentityCandidates(...candidates).primary;
}

export function buildAvatarIdentityCandidates(
  ...candidates: Array<string | null | undefined>
): {
  primary: string;
  aliases: string[];
} {
  const normalizedCandidates = Array.from(
    new Set(
      candidates
        .map((candidate) => normalizeAvatarIdentity(candidate ?? ""))
        .filter(Boolean),
    ),
  );
  const primary =
    normalizedCandidates.find((candidate) => candidate.includes("@")) ??
    normalizedCandidates[0] ??
    "ban";

  return {
    primary,
    aliases: normalizedCandidates.filter((candidate) => candidate !== primary),
  };
}

export function buildAvatarPreviewUrl(
  choice: AppAvatarChoice | string | null | undefined,
  identity?: string,
): string {
  return buildAvatarUrl(choice, identity);
}

export function buildAvatarPickerOptions(identity: string): AppAvatarOption[] {
  return buildAvatarOptions(identity);
}

export function getPreferredAvatarChoice(identity: string): AppAvatarChoice | null {
  const normalizedIdentity = normalizeAvatarIdentity(identity);
  if (!normalizedIdentity || typeof window === "undefined") {
    return null;
  }

  const store = readAvatarPreferenceStore();
  const value = store[normalizedIdentity];
  return value ? normalizeAvatarChoice(parseAvatarChoice(value), normalizedIdentity) : null;
}

export function getPreferredAvatarSeed(identity: string): string | null {
  const choice = getPreferredAvatarChoice(identity);
  return choice ? serializeAvatarChoice(choice) : null;
}

export function getPreferredAvatarChoiceForIdentities(
  identities: Array<string | null | undefined>,
): AppAvatarChoice | null {
  if (typeof window === "undefined") {
    return null;
  }

  const store = readAvatarPreferenceStore();
  for (const identity of identities) {
    const normalizedIdentity = normalizeAvatarIdentity(identity ?? "");
    if (!normalizedIdentity) continue;
    const value = store[normalizedIdentity];
    if (!value) continue;
    const choice = normalizeAvatarChoice(
      parseAvatarChoice(value),
      normalizedIdentity,
    );
    if (choice) return choice;
  }

  return null;
}

export function getPreferredAvatarSeedForIdentities(
  identities: Array<string | null | undefined>,
): string | null {
  const choice = getPreferredAvatarChoiceForIdentities(identities);
  return choice ? serializeAvatarChoice(choice) : null;
}

export function setPreferredAvatarChoice(
  identity: string,
  choice: AppAvatarChoice,
): void {
  const normalizedIdentity = normalizeAvatarIdentity(identity);
  if (!normalizedIdentity || typeof window === "undefined") {
    return;
  }

  const normalizedChoice = normalizeAvatarChoice(choice, normalizedIdentity);
  const store = readAvatarPreferenceStore();
  window.localStorage.setItem(
    AVATAR_STORAGE_KEY,
    JSON.stringify({
      ...store,
      [normalizedIdentity]: serializeAvatarChoice(normalizedChoice),
    }),
  );
  window.dispatchEvent(new Event(AVATAR_PREFERENCE_EVENT));
}

export function setPreferredAvatarSeed(identity: string, seed: string): void {
  const choice = parseAvatarChoice(seed);
  if (!choice) return;
  setPreferredAvatarChoice(identity, choice);
}

function readAvatarPreferenceStore(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw =
      window.localStorage.getItem(AVATAR_STORAGE_KEY) ??
      migrateLegacyAvatarStore();
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    );
  } catch {
    return {};
  }
}

function migrateLegacyAvatarStore(): string | null {
  const legacyRaw = window.localStorage.getItem(LEGACY_AVATAR_STORAGE_KEY);
  if (!legacyRaw) return null;

  try {
    const parsed = JSON.parse(legacyRaw) as Record<string, unknown>;
    const migrated = Object.fromEntries(
      Object.entries(parsed).flatMap(([key, value]) => {
        const choice = parseAvatarChoice(value);
        return choice ? [[key, serializeAvatarChoice(choice)]] : [];
      }),
    );
    const serialized = JSON.stringify(migrated);
    window.localStorage.setItem(AVATAR_STORAGE_KEY, serialized);
    return serialized;
  } catch {
    return null;
  }
}
