import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./supabase-types";

export async function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // For this MVP we only need read access to the auth cookies.
      // Writes are handled on the client via the browser Supabase client.
      set() {},
      remove() {},
    },
  });
}

/**
 * Creates a Supabase admin client with service role key.
 * This client bypasses RLS and should ONLY be used server-side for admin operations.
 * NEVER expose the service role key to the client.
 */
export async function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase Service Role Key is missing");
  }

  // Admin Client benötigt keine Cookies, da er mit Service Role Key arbeitet
  return createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get() { return undefined; },
      set() {},
      remove() {},
    },
  });
}
