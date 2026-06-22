import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { sanitizeNextPath } from "@/lib/post-auth-redirect";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

// Xử lý link xác nhận email / Google OAuth (PKCE) từ Supabase → session cookie.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next")) ?? "/onboarding";

  const supabaseUrl = getSupabaseUrl();
  const supabasePublicKey = getSupabasePublicKey();

  if (!code || !supabaseUrl || !supabasePublicKey) {
    return NextResponse.redirect(
      new URL("/verified?status=error", origin),
    );
  }

  const redirectUrl = new URL(next, origin);
  const response = NextResponse.redirect(redirectUrl);

  const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback]", error.message);
    const verified = new URL("/verified", origin);
    verified.searchParams.set("status", "error");
    if (error.code) verified.searchParams.set("code", error.code);
    verified.searchParams.set("description", error.message);
    return NextResponse.redirect(verified);
  }

  return response;
}
