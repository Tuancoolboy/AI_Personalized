import { NextResponse, type NextRequest } from "next/server";
import {
  acceptOrganizationInvite,
  inviteAcceptErrorPath,
} from "@/lib/invite-acceptance";
import { buildInvitePath } from "@/lib/company-invite-links";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AcceptRouteContext = {
  params: Promise<{ token: string }>;
};

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function GET(
  request: NextRequest,
  context: AcceptRouteContext,
) {
  const { token } = await context.params;
  const invitePath = buildInvitePath(token);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return redirectTo(request, invitePath);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return redirectTo(
      request,
      `/login?next=${encodeURIComponent(invitePath)}`,
    );
  }

  // GET must not mutate membership — send the user back to the invite page.
  return redirectTo(request, invitePath);
}

export async function POST(
  request: NextRequest,
  context: AcceptRouteContext,
) {
  const { token } = await context.params;
  const invitePath = buildInvitePath(token);

  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return redirectTo(request, invitePath);
  }

  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  if (!user) {
    return redirectTo(
      request,
      `/login?next=${encodeURIComponent(invitePath)}`,
    );
  }

  const result = await acceptOrganizationInvite({
    token,
    userId: user.id,
    userEmail: user.email,
  });

  if (!result.ok) {
    return redirectTo(request, inviteAcceptErrorPath(token, result.error));
  }

  return redirectTo(request, result.redirectPath);
}
