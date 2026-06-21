// Browser-side Supabase client. Dùng trong Client Components và effect.
// KHÔNG import file này từ Server Components / Route Handlers — dùng lib/supabase/server.ts.

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
