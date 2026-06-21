import { buildDicebearAvatarUrl } from "@/lib/dicebear";

const AVATAR_STORAGE_KEY = "ai_troly_avatar_preferences_v1";

export const AVATAR_PREFERENCE_EVENT =
  "ai-troly-avatar-preference-updated";

export type DicebearAvatarOption = {
  seed: string;
  url: string;
};

export function buildAvatarIdentity(
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const normalized = normalizeAvatarIdentity(candidate ?? "");
    if (normalized) return normalized;
  }
  return "ban";
}

export function buildDefaultAvatarSeed(identity: string): string {
  return `${normalizeAvatarIdentity(identity) || "ban"}::default`;
}

export function buildDicebearAvatarOptions(
  identity: string,
  optionCount = 8,
): DicebearAvatarOption[] {
  const normalizedIdentity = normalizeAvatarIdentity(identity) || "ban";
  return Array.from({ length: optionCount }, (_, index) => {
    const seed = `${normalizedIdentity}::option-${index + 1}`;
    return {
      seed,
      url: buildDicebearAvatarUrl(seed),
    };
  });
}

export function getPreferredAvatarSeed(identity: string): string | null {
  const normalizedIdentity = normalizeAvatarIdentity(identity);
  if (!normalizedIdentity || typeof window === "undefined") {
    return null;
  }

  const store = readAvatarPreferenceStore();
  return typeof store[normalizedIdentity] === "string"
    ? store[normalizedIdentity]
    : null;
}

export function setPreferredAvatarSeed(identity: string, seed: string): void {
  const normalizedIdentity = normalizeAvatarIdentity(identity);
  if (!normalizedIdentity || typeof window === "undefined") {
    return;
  }

  const normalizedSeed = seed.trim();
  if (!normalizedSeed) return;

  const store = readAvatarPreferenceStore();
  window.localStorage.setItem(
    AVATAR_STORAGE_KEY,
    JSON.stringify({
      ...store,
      [normalizedIdentity]: normalizedSeed,
    }),
  );
  window.dispatchEvent(new Event(AVATAR_PREFERENCE_EVENT));
}

function normalizeAvatarIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

function readAvatarPreferenceStore(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(AVATAR_STORAGE_KEY);
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
