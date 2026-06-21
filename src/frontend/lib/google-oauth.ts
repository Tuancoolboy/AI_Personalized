import { sanitizeNextPath } from "@/lib/post-auth-redirect";

export const DEFAULT_OAUTH_NEXT = "/onboarding";

/** Path nội bộ sau OAuth callback — mặc định onboarding. */
export function resolveOAuthNextPath(
  nextPath: string | null | undefined,
): string {
  return sanitizeNextPath(nextPath) ?? DEFAULT_OAUTH_NEXT;
}

/** URL redirectTo cho Supabase PKCE — giữ `next` (invite, company slug, v.v.). */
export function buildOAuthCallbackUrl(
  origin: string,
  nextPath: string | null | undefined,
): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", resolveOAuthNextPath(nextPath));
  return url.toString();
}
