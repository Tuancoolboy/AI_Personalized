export type HocTapRoomIdentity = {
  participantId: string;
  hostToken?: string;
};

type RoomIdentityStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
type IdentityAliasesOrStorage =
  | Array<string | null | undefined>
  | RoomIdentityStorage;

export function readHocTapRoomIdentity(
  code: string,
  identityKey: string,
  identityAliasesOrStorage: IdentityAliasesOrStorage = [],
  storage = getBrowserStorage(),
): HocTapRoomIdentity | null {
  const { identityAliases, storage: resolvedStorage } =
    resolveIdentityArgs(identityAliasesOrStorage, storage);
  if (!resolvedStorage) return null;

  const identityKeys = getIdentityKeys(identityKey, identityAliases);
  for (const candidateKey of identityKeys) {
    const currentKey = getHocTapRoomIdentityStorageKey(code, candidateKey);
    const current = parseRoomIdentity(resolvedStorage.getItem(currentKey));
    if (current) {
      saveIdentityForKeys(code, identityKeys, current, resolvedStorage);
      return current;
    }
  }

  const legacyKey = getLegacyHocTapRoomIdentityStorageKey(code);
  const legacy = parseRoomIdentity(resolvedStorage.getItem(legacyKey));
  if (!legacy) return null;

  saveIdentityForKeys(code, identityKeys, legacy, resolvedStorage);
  resolvedStorage.removeItem(legacyKey);
  return legacy;
}

export function saveHocTapRoomIdentity(
  code: string,
  identityKey: string,
  identity: HocTapRoomIdentity,
  identityAliasesOrStorage: IdentityAliasesOrStorage = [],
  storage = getBrowserStorage(),
): void {
  const { identityAliases, storage: resolvedStorage } =
    resolveIdentityArgs(identityAliasesOrStorage, storage);
  if (!resolvedStorage) return;
  saveIdentityForKeys(
    code,
    getIdentityKeys(identityKey, identityAliases),
    identity,
    resolvedStorage,
  );
  resolvedStorage.removeItem(getLegacyHocTapRoomIdentityStorageKey(code));
}

export function clearHocTapRoomIdentity(
  code: string,
  identityKey: string,
  identityAliasesOrStorage: IdentityAliasesOrStorage = [],
  storage = getBrowserStorage(),
): void {
  const { identityAliases, storage: resolvedStorage } =
    resolveIdentityArgs(identityAliasesOrStorage, storage);
  if (!resolvedStorage) return;
  for (const candidateKey of getIdentityKeys(identityKey, identityAliases)) {
    resolvedStorage.removeItem(
      getHocTapRoomIdentityStorageKey(code, candidateKey),
    );
  }
  resolvedStorage.removeItem(getLegacyHocTapRoomIdentityStorageKey(code));
}

export function getHocTapRoomIdentityStorageKey(
  code: string,
  identityKey: string,
): string {
  return `ai_troly_hoc_tap_room_${identityKey}_${normalizeRoomCode(code)}`;
}

function getLegacyHocTapRoomIdentityStorageKey(code: string): string {
  return `ai_troly_hoc_tap_room_${normalizeRoomCode(code)}`;
}

function parseRoomIdentity(raw: string | null): HocTapRoomIdentity | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<HocTapRoomIdentity>;
    if (typeof parsed.participantId !== "string") return null;
    return {
      participantId: parsed.participantId,
      hostToken:
        typeof parsed.hostToken === "string" ? parsed.hostToken : undefined,
    };
  } catch {
    return null;
  }
}

function getIdentityKeys(
  identityKey: string,
  identityAliases: Array<string | null | undefined>,
): string[] {
  return Array.from(
    new Set(
      [identityKey, ...identityAliases]
        .map((key) => key?.trim() ?? "")
        .filter(Boolean),
    ),
  );
}

function resolveIdentityArgs(
  identityAliasesOrStorage: IdentityAliasesOrStorage,
  storage: RoomIdentityStorage | null,
): {
  identityAliases: Array<string | null | undefined>;
  storage: RoomIdentityStorage | null;
} {
  if (Array.isArray(identityAliasesOrStorage)) {
    return { identityAliases: identityAliasesOrStorage, storage };
  }
  return { identityAliases: [], storage: identityAliasesOrStorage };
}

function saveIdentityForKeys(
  code: string,
  identityKeys: string[],
  identity: HocTapRoomIdentity,
  storage: RoomIdentityStorage,
): void {
  const serialized = JSON.stringify(identity);
  for (const identityKey of identityKeys) {
    storage.setItem(
      getHocTapRoomIdentityStorageKey(code, identityKey),
      serialized,
    );
  }
}

function normalizeRoomCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getBrowserStorage(): RoomIdentityStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
