import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createHash } from "crypto";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Salesforce not configured. Please contact support." },
        { status: 500 }
      );
    }

    // Generiere state für CSRF-Schutz
    const state = crypto.randomUUID();

    // PKCE: Generiere code_verifier (43-128 Zeichen, URL-safe)
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map((b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[b % 66])
      .join("");

    // PKCE: Erstelle code_challenge (SHA256 Hash von code_verifier, Base64URL encoded)
    const hash = createHash("sha256").update(codeVerifier).digest("base64");
    const codeChallenge = hash
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Debug-Logging (nur in Development)
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 [Salesforce Connect] PKCE Info:", {
        codeVerifierLength: codeVerifier.length,
        codeChallengeLength: codeChallenge.length,
        codeVerifierFirstChars: codeVerifier.substring(0, 10),
        codeChallengeFirstChars: codeChallenge.substring(0, 10),
      });
    }

    // Speichere state und code_verifier in Cookies (für Callback-Validierung)
    // Wichtig: sameSite "lax" sollte für GET-Redirects funktionieren
    // Falls nicht, könnte es an der Cookie-Übertragung liegen
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // In Development: false (HTTP), Production: true (HTTPS)
      sameSite: (isProduction ? "none" : "lax") as const, // Production: none für Cross-Site, Development: lax
      maxAge: 600, // 10 Minuten
      path: "/",
    };
    
    cookieStore.set("salesforce_oauth_state", state, cookieOptions);
    cookieStore.set("salesforce_oauth_code_verifier", codeVerifier, cookieOptions);
    
    if (process.env.NODE_ENV === "development") {
      console.log("🍪 [Salesforce Connect] Cookies gesetzt:", {
        stateLength: state.length,
        codeVerifierLength: codeVerifier.length,
        cookieOptions,
      });
    }

    // Salesforce OAuth URL
    // Für Production: https://login.salesforce.com
    // Für Sandbox: https://test.salesforce.com
    const salesforceAuthUrl = process.env.SALESFORCE_AUTH_URL || "https://login.salesforce.com";
    
    const authUrl = new URL(`${salesforceAuthUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "api refresh_token offline_access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "consent"); // Erzwinge Consent-Screen für Refresh Token
    // PKCE: Füge code_challenge hinzu
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Redirect zu Salesforce
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error("Salesforce connect error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
