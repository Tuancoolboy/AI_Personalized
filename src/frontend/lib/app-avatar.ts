import { buildDicebearAvatarUrl } from "@/lib/dicebear";

export type AppAvatarProvider = "dicebear" | "alohe" | "upload";

export type AppAvatarChoice = {
  provider: AppAvatarProvider;
  id: string;
};

export type AppAvatarOption = AppAvatarChoice & {
  key: string;
  label: string;
  group: "DiceBear" | "Alohe";
  url: string;
};

const ALOHE_AVATAR_GROUPS = [
  { prefix: "vibrent", count: 27, label: "Vibrent" },
  { prefix: "3d", count: 5, label: "3D" },
  { prefix: "bluey", count: 10, label: "Bluey" },
  { prefix: "memo", count: 35, label: "Memo" },
  { prefix: "notion", count: 15, label: "Notion" },
  { prefix: "teams", count: 9, label: "Teams" },
  { prefix: "toon", count: 10, label: "Toon" },
  { prefix: "upstream", count: 22, label: "Upstream" },
] as const;

const ALOHE_BASE_URL =
  "https://cdn.jsdelivr.net/gh/alohe/avatars/png";
const DEFAULT_DICEBEAR_STYLE = "bottts-neutral";
const MAX_UPLOADED_AVATAR_LENGTH = 350_000;
const DICEBEAR_STYLES = [
  { style: "bottts-neutral", label: "Robot" },
  { style: "adventurer-neutral", label: "Phiêu lưu" },
  { style: "avataaars-neutral", label: "Avataaars" },
  { style: "big-ears-neutral", label: "Big Ears" },
  { style: "croodles-neutral", label: "Croodles" },
  { style: "fun-emoji", label: "Emoji" },
  { style: "initials", label: "Chữ cái" },
  { style: "lorelei-neutral", label: "Lorelei" },
  { style: "micah", label: "Micah" },
  { style: "miniavs", label: "Miniavs" },
  { style: "notionists-neutral", label: "Notionists" },
  { style: "personas", label: "Personas" },
  { style: "pixel-art-neutral", label: "Pixel Art" },
  { style: "thumbs", label: "Thumbs" },
] as const;
const DICEBEAR_STYLE_SET = new Set<string>(
  DICEBEAR_STYLES.map((item) => item.style),
);

export function serializeAvatarChoice(choice: AppAvatarChoice): string {
  return `${choice.provider}:${choice.id}`;
}

export function parseAvatarChoice(
  raw: unknown,
): AppAvatarChoice | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  const [provider, ...rest] = value.split(":");
  if (
    (provider === "dicebear" ||
      provider === "alohe" ||
      provider === "upload") &&
    rest.length > 0
  ) {
    const id = rest.join(":").trim();
    if (!id) return null;
    return { provider, id };
  }

  // Legacy localStorage values stored only the DiceBear seed string.
  return { provider: "dicebear", id: value };
}

export function normalizeAvatarChoice(
  choice: AppAvatarChoice | null | undefined,
  identity = "ban",
): AppAvatarChoice {
  if (choice && choice.id.trim()) {
    if (choice.provider === "upload") {
      const uploadId = normalizeUploadedAvatarId(choice.id);
      if (uploadId) {
        return {
          provider: "upload",
          id: uploadId,
        };
      }
      return buildDefaultAvatarChoice(identity);
    }
    return {
      provider: choice.provider === "alohe" ? "alohe" : "dicebear",
      id: choice.id.trim(),
    };
  }

  return buildDefaultAvatarChoice(identity);
}

export function buildDefaultAvatarChoice(identity: string): AppAvatarChoice {
  const normalizedIdentity = normalizeAvatarIdentity(identity) || "ban";
  return {
    provider: "dicebear",
    id: `${DEFAULT_DICEBEAR_STYLE}::${normalizedIdentity}::default`,
  };
}

export function buildAvatarUrl(
  choice: AppAvatarChoice | string | null | undefined,
  identity = "ban",
): string {
  const normalized =
    typeof choice === "string"
      ? parseAvatarChoice(choice)
      : normalizeAvatarChoice(choice, identity);

  const finalChoice = normalizeAvatarChoice(normalized, identity);
  if (finalChoice.provider === "upload") {
    return finalChoice.id;
  }
  if (finalChoice.provider === "alohe") {
    return `${ALOHE_BASE_URL}/${encodeURIComponent(finalChoice.id)}.png`;
  }

  const { style, seed } = parseDicebearStyleSeed(finalChoice.id);
  return buildDicebearAvatarUrl(seed, style);
}

export function buildAvatarOptions(identity: string): AppAvatarOption[] {
  const normalizedIdentity = normalizeAvatarIdentity(identity) || "ban";
  const dicebearOptions = DICEBEAR_STYLES.map((option, index) => {
    const choice: AppAvatarChoice = {
      provider: "dicebear",
      id: `${option.style}::${normalizedIdentity}::option-${index + 1}`,
    };
    return {
      ...choice,
      key: serializeAvatarChoice(choice),
      label: option.label,
      group: "DiceBear" as const,
      url: buildAvatarUrl(choice, normalizedIdentity),
    };
  });

  const aloheOptions = ALOHE_AVATAR_GROUPS.flatMap((group) =>
    Array.from({ length: group.count }, (_, index) => {
      const itemNumber = index + 1;
      const choice: AppAvatarChoice = {
        provider: "alohe",
        id: `${group.prefix}_${itemNumber}`,
      };
      return {
        ...choice,
        key: serializeAvatarChoice(choice),
        label: `${group.label} ${itemNumber}`,
        group: "Alohe" as const,
        url: buildAvatarUrl(choice),
      };
    }),
  );

  return [...dicebearOptions, ...aloheOptions];
}

export function normalizeAvatarIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

function parseDicebearStyleSeed(value: string): {
  style: string;
  seed: string;
} {
  const [style, ...seedParts] = value.split("::");
  if (DICEBEAR_STYLE_SET.has(style) && seedParts.length > 0) {
    return {
      style,
      seed: seedParts.join("::"),
    };
  }

  return {
    style: DEFAULT_DICEBEAR_STYLE,
    seed: value,
  };
}

function normalizeUploadedAvatarId(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > MAX_UPLOADED_AVATAR_LENGTH) return null;
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(normalized)) return null;
  return normalized;
}
