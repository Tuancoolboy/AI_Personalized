import { buildOAuthCallbackUrl } from "@/lib/google-oauth";
import { sanitizeNextPath } from "@/lib/post-auth-redirect";

export type AuthIdentityProvider = "email" | "google" | "phone" | "unknown";

/** Chuẩn hóa email để so khớp identity Supabase (Automatic linking). */
export function normalizeAuthEmail(
  email: string | null | undefined,
): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return null;
  return trimmed;
}

/**
 * Supabase gộp identity khi email đã xác minh trùng — không tạo user mới.
 * @see https://supabase.com/docs/guides/auth/auth-identity-linking
 */
export function shouldReuseExistingAccount(
  existingEmail: string | null | undefined,
  incomingEmail: string | null | undefined,
): boolean {
  const left = normalizeAuthEmail(existingEmail);
  const right = normalizeAuthEmail(incomingEmail);
  return Boolean(left && right && left === right);
}

export function extractOAuthNextFromCallbackUrl(
  callbackUrl: string,
): string | null {
  try {
    const url = new URL(callbackUrl);
    if (!url.pathname.endsWith("/auth/callback")) return null;
    return url.searchParams.get("next");
  } catch {
    return null;
  }
}

/** Kiểm tra `next` sống sót qua buildOAuthCallbackUrl → parse lại. */
export function roundTripOAuthNextPath(
  origin: string,
  nextPath: string | null | undefined,
): string | null {
  const callback = buildOAuthCallbackUrl(origin, nextPath);
  const raw = extractOAuthNextFromCallbackUrl(callback);
  return sanitizeNextPath(raw);
}

export function countIdentitiesForEmail(
  identities: Array<{ provider?: string; identity_data?: { email?: string } }>,
  email: string,
): number {
  const target = normalizeAuthEmail(email);
  if (!target) return 0;
  return identities.filter((identity) => {
    const identityEmail = normalizeAuthEmail(
      identity.identity_data?.email ?? null,
    );
    return identityEmail === target;
  }).length;
}

export function expectSingleUserPerEmail(
  createUserErrorMessage: string | null | undefined,
): boolean {
  if (!createUserErrorMessage) return true;
  return /already|registered|exists|duplicate/i.test(createUserErrorMessage);
}
