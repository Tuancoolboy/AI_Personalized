const DICEBEAR_VERSION = "10.x";

export function buildDicebearAvatarUrl(
  seed: string,
  style = "bottts-neutral",
): string {
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${style}/svg?seed=${encodeURIComponent(
    seed,
  )}`;
}
