import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { createHash } from "crypto";
import type { CRMType } from "@/lib/crm/base";

/**
 * Generische Connect-Route für alle CRMs
 * Route: /api/crm/connect/[crm]
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ crm: string }> }
) {
  try {
    const { crm } = await params;
    const crmType = crm.toLowerCase() as CRMType;

    // Validiere CRM-Typ
    const validCRMs: CRMType[] = [
      "salesforce",
      "pipedrive",
      "hubspot",
      "zoho",
      "dynamics365",
    ];
    if (!validCRMs.includes(crmType)) {
      return NextResponse.json(
        { error: `Unsupported CRM: ${crm}` },
        { status: 400 }
      );
    }

    // Nur Salesforce ist aktuell implementiert
    if (crmType !== "salesforce") {
      return NextResponse.json(
        { error: `${crmType} integration not yet implemented` },
        { status: 501 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Salesforce-spezifische Konfiguration
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

    // PKCE: Generiere code_verifier
    const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(64)))
      .map(
        (b) =>
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[
            b % 66
          ]
      )
      .join("");

    // PKCE: Erstelle code_challenge
    const hash = createHash("sha256").update(codeVerifier).digest("base64");
    const codeChallenge = hash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

    // Speichere state und code_verifier in Cookies
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === "production";
    const sameSiteValue: "none" | "lax" = isProduction ? "none" : "lax";
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSiteValue,
      maxAge: 600,
      path: "/",
    };

    cookieStore.set(`${crmType}_oauth_state`, state, cookieOptions);
    cookieStore.set(`${crmType}_oauth_code_verifier`, codeVerifier, cookieOptions);

    // Salesforce OAuth URL
    const salesforceAuthUrl =
      process.env.SALESFORCE_AUTH_URL || "https://login.salesforce.com";

    const authUrl = new URL(`${salesforceAuthUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", "api refresh_token offline_access");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    const { crm } = await params;
    console.error(`[CRM Connect ${crm}] Error:`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
