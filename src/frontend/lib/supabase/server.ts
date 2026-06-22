// Server-side Supabase clients cho Route Handlers / Server Components.
// 2 client:
//  - createSupabaseServerClient: anon key + cookies (cho user-scoped query, RLS active).
//  - createSupabaseServiceClient: service role key (bypass RLS, KHÔNG expose ra client).

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getSupabasePublicKey, getSupabaseUrl } from "@/lib/supabase/public-env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    getSupabaseUrl()!,
    getSupabasePublicKey()!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components không cho set cookie — bỏ qua, middleware sẽ refresh.
          }
        },
      },
    },
  );
}

// Service role client: bypass RLS. Chỉ dùng khi thật sự cần (vd: insert ẩn danh từ server,
// admin task). KHÔNG truyền instance này sang client.
export function createSupabaseServiceClient() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY — kiểm tra .env.local",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Helper lấy user hiện tại từ session — dùng trong Server Components / Route Handlers.
// Trả null nếu chưa login. Verify qua Auth server (không tin cookie).
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
