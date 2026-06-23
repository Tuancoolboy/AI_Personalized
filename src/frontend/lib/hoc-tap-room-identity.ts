export type HocTapRoomIdentity = {
  participantId: string;
  hostToken?: string;
};

type RoomIdentityStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export function readHocTapRoomIdentity(
  code: string,
  identityKey: string,
  storage = getBrowserStorage(),
): HocTapRoomIdentity | null {
  if (!storage) return null;

  const currentKey = getHocTapRoomIdentityStorageKey(code, identityKey);
  const current = parseRoomIdentity(storage.getItem(currentKey));
  if (current) return current;

  const legacyKey = getLegacyHocTapRoomIdentityStorageKey(code);
  const legacy = parseRoomIdentity(storage.getItem(legacyKey));
  if (!legacy) return null;

  storage.setItem(currentKey, JSON.stringify(legacy));
  storage.removeItem(legacyKey);
  return legacy;
}

export function saveHocTapRoomIdentity(
  code: string,
  identityKey: string,
  identity: HocTapRoomIdentity,
  storage = getBrowserStorage(),
): void {
  if (!storage) return;
  storage.setItem(
    getHocTapRoomIdentityStorageKey(code, identityKey),
    JSON.stringify(identity),
  );
  storage.removeItem(getLegacyHocTapRoomIdentityStorageKey(code));
}

export function clearHocTapRoomIdentity(
  code: string,
  identityKey: string,
  storage = getBrowserStorage(),
): void {
  if (!storage) return;
  storage.removeItem(getHocTapRoomIdentityStorageKey(code, identityKey));
  storage.removeItem(getLegacyHocTapRoomIdentityStorageKey(code));
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

function normalizeRoomCode(code: string): string {
  return code.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function getBrowserStorage(): RoomIdentityStorage | null {
  return typeof window === "undefined" ? null : window.localStorage;
}
