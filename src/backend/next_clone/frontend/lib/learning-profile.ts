export type PreferredAddress = "anh" | "chi" | "neutral";

export type LearningProfile = {
  preferredAddress?: PreferredAddress;
  painPoints?: string[];
  notesFromUser?: string;
};

const VALID_ADDRESSES = new Set<PreferredAddress>(["anh", "chi", "neutral"]);

export function parsePreferredAddress(value: unknown): PreferredAddress {
  if (typeof value === "string" && VALID_ADDRESSES.has(value as PreferredAddress)) {
    return value as PreferredAddress;
  }
  return "neutral";
}

export function parseLearningProfile(raw: unknown): LearningProfile {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const profile: LearningProfile = {
    preferredAddress: parsePreferredAddress(obj.preferredAddress),
  };
  if (Array.isArray(obj.painPoints)) {
    profile.painPoints = obj.painPoints
      .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      .slice(0, 8);
  }
  if (typeof obj.notesFromUser === "string" && obj.notesFromUser.trim()) {
    profile.notesFromUser = obj.notesFromUser.trim().slice(0, 500);
  }
  return profile;
}

export function preferredAddressLabel(address: PreferredAddress): string {
  if (address === "anh") return "anh";
  if (address === "chi") return "chị";
  return "anh/chị";
}

export function mergeLearningProfile(
  existing: LearningProfile,
  patch: Partial<LearningProfile>,
): LearningProfile {
  return {
    preferredAddress: patch.preferredAddress ?? existing.preferredAddress ?? "neutral",
    painPoints: patch.painPoints ?? existing.painPoints,
    notesFromUser: patch.notesFromUser ?? existing.notesFromUser,
  };
}
