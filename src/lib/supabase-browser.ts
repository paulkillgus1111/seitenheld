import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./supabase-types";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing");
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        // Prüfe ob wir im Browser sind (document existiert)
        if (typeof document === 'undefined') {
          return [];
        }
        // Prüfe ob Cookies vorhanden sind
        if (!document.cookie) {
          return [];
        }
        return document.cookie.split(';')
          .map(cookie => cookie.trim())
          .filter(cookie => cookie.length > 0) // Filtere leere Strings
          .map(cookie => {
            const [name, ...rest] = cookie.split('=');
            return { name, value: rest.join('=') };
          });
      },
      setAll(cookiesToSet) {
        // Prüfe ob wir im Browser sind (document existiert)
        if (typeof document === 'undefined') {
          return; // Ignoriere Cookie-Set während SSR
        }
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookieString = `${name}=${value}`;
          if (options?.maxAge) cookieString += `; max-age=${options.maxAge}`;
          if (options?.path) cookieString += `; path=${options.path}`;
          if (options?.domain) cookieString += `; domain=${options.domain}`;
          if (options?.secure) cookieString += `; secure`;
          if (options?.sameSite) cookieString += `; samesite=${options.sameSite}`;
          document.cookie = cookieString;
        });
      },
    },
  });
}
