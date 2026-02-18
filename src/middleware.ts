import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Erstelle Response-Objekt für Security Headers (gilt für alle Routen)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Security Headers für alle Responses
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Öffentliche Routen die keine Auth benötigen
  const publicRoutes = [
    "/",
    "/auth/reset-password",
    "/agb", // Öffentliche AGB-Seite (für nicht-eingeloggte Nutzer)
    "/impressum", // Öffentliche Impressum-Seite (für nicht-eingeloggte Nutzer)
    "/datenschutz", // Öffentliche Datenschutz-Seite (für nicht-eingeloggte Nutzer)
    "/onboarding",
    "/api/webhooks/stripe", // Webhook-Route (hat eigene Auth)
  ];

  // Prüfe ob Route öffentlich ist (exakte Übereinstimmung oder mit /)
  const isPublicRoute = publicRoutes.some((route) => {
    if (pathname === route) return true;
    if (pathname.startsWith(route + "/")) return true;
    return false;
  });

  if (isPublicRoute) {
    return response;
  }

  // Nur API-Routes in Middleware schützen (Dashboard hat eigenen Layout-Check)
  // Dashboard-Routes werden durch dashboard/layout.tsx geschützt
  const isProtectedApiRoute = 
    pathname.startsWith("/api") && 
    !pathname.startsWith("/api/webhooks") &&
    !pathname.startsWith("/api/auth/exchange-code"); // Password Reset Code Exchange muss öffentlich sein (hat eigenes Rate Limiting)

  if (!isProtectedApiRoute) {
    return response; // Verwende response mit Security Headers
  }

  // Erstelle Supabase Client für Middleware mit korrekter Cookie-Handling
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase environment variables missing in middleware");
    // Security Headers auch bei Fehler setzen
    const errorResponse = NextResponse.next();
    errorResponse.headers.set("X-Frame-Options", "DENY");
    errorResponse.headers.set("X-Content-Type-Options", "nosniff");
    errorResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return errorResponse; // Fail-open wenn Env-Vars fehlen
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: any) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  // Prüfe Session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Wenn keine Session, redirect zu Login
  if (!session) {
    if (pathname.startsWith("/api")) {
      const errorResponse = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
      // Security Headers auch für Error-Responses
      errorResponse.headers.set("X-Frame-Options", "DENY");
      errorResponse.headers.set("X-Content-Type-Options", "nosniff");
      errorResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
      return errorResponse;
    }
    const redirectUrl = new URL("/", request.url);
    redirectUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    // Security Headers auch für Redirects
    redirectResponse.headers.set("X-Frame-Options", "DENY");
    redirectResponse.headers.set("X-Content-Type-Options", "nosniff");
    redirectResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
