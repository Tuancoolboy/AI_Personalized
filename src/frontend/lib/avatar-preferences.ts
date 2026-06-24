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
const DEMO_EMPLOYEE_AVATAR_IDENTITIES = [
  "demo user",
  "nhanvien@congty.vn",
  "demo@aitroly.local",
] as const;
const DEMO_MANAGER_AVATAR_IDENTITIES = [
  "chị quản lý",
  "quản lý",
  "quanly@congty.vn",
] as const;

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
  return getPreferredAvatarChoiceForIdentities([identity]);
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
  const lookupIdentities = expandAvatarSyncIdentities(
    normalizeAvatarIdentityList(identities),
  );
  for (const normalizedIdentity of lookupIdentities) {
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
  setPreferredAvatarChoiceForIdentities(identity, [], choice);
}

export function setPreferredAvatarChoiceForIdentities(
  identity: string,
  aliasIdentities: Array<string | null | undefined>,
  choice: AppAvatarChoice,
): void {
  const identities = expandAvatarSyncIdentities(
    normalizeAvatarIdentityList([identity, ...aliasIdentities]),
  );
  const normalizedIdentity = identities[0];
  if (!normalizedIdentity || typeof window === "undefined") {
    return;
  }

  const normalizedChoice = normalizeAvatarChoice(choice, normalizedIdentity);
  const store = readAvatarPreferenceStore();
  const serializedChoice = serializeAvatarChoice(normalizedChoice);
  const nextStore = { ...store };
  for (const identityKey of identities) {
    nextStore[identityKey] = serializedChoice;
  }

  window.localStorage.setItem(
    AVATAR_STORAGE_KEY,
    JSON.stringify(nextStore),
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

function normalizeAvatarIdentityList(
  identities: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      identities
        .map((identity) => normalizeAvatarIdentity(identity ?? ""))
        .filter(Boolean),
    ),
  );
}

function expandAvatarSyncIdentities(identities: string[]): string[] {
  const expanded = new Set(identities);
  const hasEmployeeDemoIdentity = DEMO_EMPLOYEE_AVATAR_IDENTITIES.some(
    (identity) => expanded.has(identity),
  );
  const hasManagerDemoIdentity = DEMO_MANAGER_AVATAR_IDENTITIES.some(
    (identity) => expanded.has(identity),
  );

  if (hasEmployeeDemoIdentity) {
    for (const identity of DEMO_EMPLOYEE_AVATAR_IDENTITIES) {
      expanded.add(identity);
    }
  }
  if (hasManagerDemoIdentity) {
    for (const identity of DEMO_MANAGER_AVATAR_IDENTITIES) {
      expanded.add(identity);
    }
  }

  return Array.from(expanded);
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
