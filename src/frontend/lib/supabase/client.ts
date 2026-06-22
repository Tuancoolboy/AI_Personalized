// Browser-side Supabase client. Dùng trong Client Components và effect.
// KHÔNG import file này từ Server Components / Route Handlers — dùng lib/supabase/server.ts.

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

export function createSupabaseBrowserClient() {
  return createBrowserClient(getSupabaseUrl()!, getSupabasePublicKey()!);
}
