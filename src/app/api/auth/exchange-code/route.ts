import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";

export async function POST(request: NextRequest) {
  // Rate Limiting (wichtig für Brute-Force-Schutz)
  const rateLimitResult = await withRateLimit(request, {
    config: rateLimitConfigs.auth, // 5 Versuche pro 15 Minuten
  });

  if (!rateLimitResult.success) {
    return rateLimitResult.response; // 429 Too Many Requests
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json(
        { error: "Code parameter is required" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();

    // Erstelle Supabase Client mit Cookie-Support für SSR
    // WICHTIG: Hier brauchen wir write-Zugriff auf Cookies für PKCE
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    });

    // Tausche Code gegen Session (auf dem Server, wo Cookies verfügbar sind)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: "No session returned" },
        { status: 400 }
      );
    }

    // Gib Session-Tokens zurück (werden dann im Browser gesetzt)
    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error("Code exchange error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
