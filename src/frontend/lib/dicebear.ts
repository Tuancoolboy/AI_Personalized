const DICEBEAR_STYLE = "bottts-neutral";
const DICEBEAR_VERSION = "10.x";

export function buildDicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/${DICEBEAR_VERSION}/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(
    seed,
  )}`;
}
