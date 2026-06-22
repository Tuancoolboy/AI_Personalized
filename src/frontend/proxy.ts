// Next.js Proxy (Next 16 — đổi tên từ middleware) — bảo vệ khu (app) + refresh Supabase session.
// Theo @supabase/ssr SSR pattern: tạo Supabase client với cookie adapter,
// gọi getUser() để (1) verify session với Auth server và (2) auto-refresh cookies.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { buildVerifiedErrorUrl } from "@/lib/auth-link-errors";
import {
  getPostAuthPath,
  isEmployeeAppPath,
  sanitizeNextPath,
} from "@/lib/post-auth-redirect";
import {
  DEMO_ONBOARDED_COOKIE,
  DEMO_SESSION_COOKIE,
  DEMO_USER_TYPE_COOKIE,
  type UserType,
} from "@/lib/supabase/is-configured";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

const PROTECTED_PREFIXES = [
  "/onboarding",
  "/lo-trinh",
  "/tro-ly",
  "/kiem-tra",
  "/tien-bo",
  "/tai-khoan",
  "/quan-ly",
  "/quan-tri",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Link email hết hạn / bị từ chối: ?error=access_denied&error_code=otp_expired
  const authError = request.nextUrl.searchParams.get("error");
  const authErrorCode = request.nextUrl.searchParams.get("error_code");
  const authErrorDescription =
    request.nextUrl.searchParams.get("error_description");
  if (
    (authError || authErrorCode || authErrorDescription) &&
    !pathname.startsWith("/verified")
  ) {
    return NextResponse.redirect(
      buildVerifiedErrorUrl(request.nextUrl.origin, {
        error: authError,
        errorCode: authErrorCode,
        description: authErrorDescription,
      }),
    );
  }

  // Link xác nhận email Supabase thường về Site URL (/) kèm ?code=...
  // Chuyển sang /auth/callback để đổi code → session cookie.
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && !pathname.startsWith("/auth/callback")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    if (!callbackUrl.searchParams.has("next")) {
      callbackUrl.searchParams.set("next", "/onboarding");
    }
    return NextResponse.redirect(callbackUrl);
  }

  const response = NextResponse.next({ request });
  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const hasDemoSession =
    request.cookies.get(DEMO_SESSION_COOKIE)?.value === "true";
  const demoOnboarded =
    request.cookies.get(DEMO_ONBOARDED_COOKIE)?.value === "true";
  const demoUserType = request.cookies.get(DEMO_USER_TYPE_COOKIE)?.value;
  const demoIsManager = demoUserType === "manager";

  const supabaseUrl = getSupabaseUrl();
  const supabasePublicKey = getSupabasePublicKey();

  // Env chưa cấu hình → demo mode
  if (!supabaseUrl || !supabasePublicKey) {
    if (isProtected && !hasDemoSession) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if ((pathname === "/login" || pathname === "/register") && hasDemoSession) {
      const dest = demoIsManager
        ? "/quan-ly"
        : demoOnboarded
          ? "/lo-trinh"
          : "/onboarding";
      return NextResponse.redirect(new URL(dest, request.url));
    }

    if (
      pathname.startsWith("/onboarding") &&
      hasDemoSession &&
      demoOnboarded &&
      !demoIsManager
    ) {
      return NextResponse.redirect(new URL("/lo-trinh", request.url));
    }

    if (
      hasDemoSession &&
      !demoIsManager &&
      !demoOnboarded &&
      isEmployeeAppPath(pathname)
    ) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabasePublicKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of toSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Bỏ qua lỗi network — vẫn cho phép request đi tiếp.
  }

  let roleId: string | null = null;
  let userType: UserType = "employee";
  if (user) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role_id")
        .eq("id", user.id)
        .maybeSingle();
      roleId = profile?.role_id ?? null;
    } catch {
      // Bỏ qua — coi như chưa onboard
    }

    try {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("member_role")
        .eq("user_id", user.id)
        .in("member_role", ["manager", "owner"])
        .limit(1)
        .maybeSingle();
      if (
        membership?.member_role === "manager" ||
        membership?.member_role === "owner"
      ) {
        userType = "manager";
      }
    } catch {
      // Bỏ qua — coi như employee cho tới khi migration BE-08 được chạy.
    }
  }

  const userEmail = user?.email ?? null;
  const isManager = userType === "manager";

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/register") && user) {
    const nextPath = sanitizeNextPath(
      request.nextUrl.searchParams.get("next"),
    );
    if (nextPath) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
    return NextResponse.redirect(
      new URL(getPostAuthPath(roleId, userEmail, userType), request.url),
    );
  }

  if (user && pathname.startsWith("/quan-ly") && !isManager) {
    return NextResponse.redirect(
      new URL(roleId ? "/lo-trinh" : "/onboarding", request.url),
    );
  }

  if (
    user &&
    isManager &&
    pathname.startsWith("/onboarding")
  ) {
    return NextResponse.redirect(new URL("/quan-ly", request.url));
  }

  if (
    user &&
    isManager &&
    isEmployeeAppPath(pathname) &&
    !pathname.startsWith("/tro-ly")
  ) {
    return NextResponse.redirect(new URL("/quan-ly", request.url));
  }

  if (pathname.startsWith("/onboarding") && user && roleId && !isManager) {
    return NextResponse.redirect(new URL("/lo-trinh", request.url));
  }

  if (user && !isManager && !roleId && isEmployeeAppPath(pathname)) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match tất cả paths trừ:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - api/* (Route Handlers tự xử auth nếu cần)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
