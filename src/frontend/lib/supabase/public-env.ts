export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return url || undefined;
}

export function getSupabasePublicKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return key || undefined;
}

export function hasSupabasePublicEnv() {
  return Boolean(getSupabaseUrl() && getSupabasePublicKey());
}
