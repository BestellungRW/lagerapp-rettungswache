import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let cachedClient: ReturnType<typeof createSupabaseClient> | null = null;

export function isServiceRoleConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function getServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Service-Role-Client nicht konfiguriert: SUPABASE_SERVICE_ROLE_KEY in .env.local eintragen (siehe ANLEITUNG.md)."
    );
  }
  if (!cachedClient) {
    cachedClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return cachedClient;
}