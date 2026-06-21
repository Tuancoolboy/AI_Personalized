import type { PreferredAddress } from "@/lib/learning-profile";

export function metadataFullName(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  const raw = metadata?.full_name ?? metadata?.name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export function emailLocalPart(email: string | null | undefined): string | null {
  if (!email?.includes("@")) return null;
  const local = email.split("@")[0]?.trim();
  return local || null;
}

/** Tên đầy đủ — ưu tiên profiles.full_name, rồi auth metadata, cuối cùng email local. */
export function resolveFullDisplayName(input: {
  profileFullName?: string | null;
  metadataFullName?: string | null;
  email?: string | null;
  fallback?: string;
}): string {
  const fromProfile = input.profileFullName?.trim();
  if (fromProfile) return fromProfile;

  const fromMetadata = input.metadataFullName?.trim();
  if (fromMetadata) return fromMetadata;

  const fromEmail = emailLocalPart(input.email);
  if (fromEmail) return fromEmail;

  return input.fallback?.trim() || "bạn";
}

/** Tên gọi thân mật — thường là chữ cuối: "Đặng Minh Hải" → "Hải". */
export function extractGivenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fullName.trim() || "bạn";
  return parts[parts.length - 1] ?? fullName.trim();
}

/** Xưng hô thân thiện: "a Hải", "chị Lan", ... */
export function buildFriendlyAddress(
  fullName: string,
  preferredAddress: PreferredAddress = "neutral",
): string {
  const given = extractGivenName(fullName);
  if (preferredAddress === "chi") return `chị ${given}`;
  if (preferredAddress === "anh") return `a ${given}`;
  return `a ${given}`;
}

/** Coach chat: tên ở lúc chào; "anh"/"chị" trong thân bài. */
export function buildCoachAddresses(
  fullName: string,
  preferredAddress: PreferredAddress = "neutral",
): { named: string; casual: string } {
  return {
    named: buildFriendlyAddress(fullName, preferredAddress),
    casual:
      preferredAddress === "chi"
        ? "chị"
        : preferredAddress === "anh" || preferredAddress === "neutral"
          ? "anh"
          : "bạn",
  };
}
