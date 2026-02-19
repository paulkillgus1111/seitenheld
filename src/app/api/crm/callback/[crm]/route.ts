import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import type { CRMType } from "@/lib/crm/base";

/**
 * Generische Callback-Route für alle CRMs
 * Route: /api/crm/callback/[crm]
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
      return NextResponse.redirect(
        new URL(`/dashboard/crm?error=unsupported_crm`, request.url)
      );
    }

    // Nur Salesforce ist aktuell implementiert
    if (crmType !== "salesforce") {
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=${encodeURIComponent(`${crmType} not yet implemented`)}`,
          request.url
        )
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const state = searchParams.get("state");

    // Prüfe auf Fehler
    if (error) {
      const errorMsg = errorDescription || error;
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=${encodeURIComponent(errorMsg)}&crm=${crmType}`,
          request.url
        )
      );
    }

    // Validiere state (CSRF-Schutz)
    const cookieStore = await cookies();
    const storedState = cookieStore.get(`${crmType}_oauth_state`)?.value;
    const codeVerifier = cookieStore.get(`${crmType}_oauth_code_verifier`)?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=invalid_state&crm=${crmType}`,
          request.url
        )
      );
    }

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=missing_code_verifier&crm=${crmType}`,
          request.url
        )
      );
    }

    // Lösche Cookies
    cookieStore.delete(`${crmType}_oauth_state`);
    cookieStore.delete(`${crmType}_oauth_code_verifier`);

    if (!code) {
      return NextResponse.redirect(
        new URL(`/dashboard/crm?error=no_code&crm=${crmType}`, request.url)
      );
    }

    // Salesforce-spezifische Token-Exchange
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI;
    const salesforceTokenUrl =
      process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com";

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=configuration_error&crm=${crmType}`,
          request.url
        )
      );
    }

    const tokenResponse = await fetch(
      `${salesforceTokenUrl}/services/oauth2/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code: code,
          code_verifier: codeVerifier,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=${encodeURIComponent("token_exchange_failed")}&crm=${crmType}`,
          request.url
        )
      );
    }

    const tokenData = await tokenResponse.json();

    // Hole User Info von Salesforce
    const userInfoResponse = await fetch(tokenData.id, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=user_info_failed&crm=${crmType}`,
          request.url
        )
      );
    }

    const userInfo = await userInfoResponse.json();

    // Berechne Ablaufdatum
    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in || 7200) * 1000
    ).toISOString();

    // Speichere Tokens in DB (generische Felder)
    const { error: upsertError } = await supabase
      .from("integrations")
      .upsert(
        {
          user_id: user.id,
          crm_type: crmType,
          crm_access_token: tokenData.access_token,
          crm_refresh_token: tokenData.refresh_token,
          crm_token_expires_at: expiresAt,
          crm_instance_url: tokenData.instance_url,
          crm_org_id: userInfo.organization_id,
          crm_user_id: userInfo.user_id,
          crm_connection_type: "oauth2",
          // Legacy Salesforce-Felder für Rückwärtskompatibilität
          salesforce_instance_url: tokenData.instance_url,
          salesforce_access_token: tokenData.access_token,
          salesforce_refresh_token: tokenData.refresh_token,
          salesforce_token_expires_at: expiresAt,
          salesforce_org_id: userInfo.organization_id,
          salesforce_user_id: userInfo.user_id,
          salesforce_connection_type: "oauth2",
        } as any,
        {
          onConflict: "user_id",
        }
      );

    if (upsertError) {
      console.error("Failed to save tokens:", upsertError);
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=save_failed&crm=${crmType}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(
      new URL(`/dashboard/crm?connected=true&crm=${crmType}`, request.url)
    );
  } catch (error) {
    const { crm } = await params;
    console.error(`[CRM Callback ${crm}] Error:`, error);
    return NextResponse.redirect(
      new URL(`/dashboard/crm?error=internal_error`, request.url)
    );
  }
}
