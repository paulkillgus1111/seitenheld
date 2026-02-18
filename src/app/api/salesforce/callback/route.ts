import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
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

    // Prüfe auf Fehler von Salesforce
    if (error) {
      const errorMsg = errorDescription || error;
      return NextResponse.redirect(
        new URL(
          `/dashboard/crm?error=${encodeURIComponent(errorMsg)}`,
          request.url
        )
      );
    }

    // Validiere state (CSRF-Schutz)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("salesforce_oauth_state")?.value;
    const codeVerifier = cookieStore.get("salesforce_oauth_code_verifier")?.value;
    
    // Debug-Logging (nur in Development)
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 [Salesforce Callback] Debug Info:", {
        hasState: !!storedState,
        stateMatch: storedState === state,
        hasCodeVerifier: !!codeVerifier,
        codeVerifierLength: codeVerifier?.length,
      });
    }
    
    if (!storedState || storedState !== state) {
      console.error("❌ [Salesforce Callback] Invalid state:", {
        storedState,
        receivedState: state,
      });
      return NextResponse.redirect(
        new URL(
          "/dashboard/crm?error=invalid_state",
          request.url
        )
      );
    }

    if (!codeVerifier) {
      console.error("❌ [Salesforce Callback] Missing code_verifier");
      return NextResponse.redirect(
        new URL(
          "/dashboard/crm?error=missing_code_verifier",
          request.url
        )
      );
    }

    // Lösche state und code_verifier Cookies
    cookieStore.delete("salesforce_oauth_state");
    cookieStore.delete("salesforce_oauth_code_verifier");

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/crm?error=no_code", request.url)
      );
    }

    // Tausche Code gegen Access Token
    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const redirectUri = process.env.SALESFORCE_REDIRECT_URI;
    const salesforceTokenUrl = process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com";

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL(
          "/dashboard/crm?error=configuration_error",
          request.url
        )
      );
    }

    try {
      // Debug: Validiere code_verifier Format
      if (process.env.NODE_ENV === "development") {
        console.log("🔍 [Salesforce Token Exchange] Sending:", {
          codeLength: code?.length,
          codeVerifierLength: codeVerifier?.length,
          codeVerifierFirstChars: codeVerifier?.substring(0, 10),
        });
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
            code_verifier: codeVerifier, // PKCE: Sende code_verifier mit
          }),
        }
      );

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("❌ [Salesforce Token Exchange] Failed:", errorText);
        console.error("❌ [Salesforce Token Exchange] Code verifier used:", {
          length: codeVerifier?.length,
          firstChars: codeVerifier?.substring(0, 20),
        });
        return NextResponse.redirect(
          new URL(
            `/dashboard/crm?error=${encodeURIComponent("token_exchange_failed")}`,
            request.url
          )
        );
      }

      const tokenData = await tokenResponse.json();

      // Hole User Info von Salesforce (id endpoint gibt User + Org Info)
      const userInfoResponse = await fetch(tokenData.id, {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        console.error("Failed to fetch user info from Salesforce");
        return NextResponse.redirect(
          new URL(
            "/dashboard/crm?error=user_info_failed",
            request.url
          )
        );
      }

      const userInfo = await userInfoResponse.json();

      // Berechne Ablaufdatum
      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 7200) * 1000
      ).toISOString();

      // Speichere Tokens in DB
      const { error: upsertError } = await supabase
        .from("integrations")
        .upsert(
          {
            user_id: user.id,
            salesforce_instance_url: tokenData.instance_url,
            salesforce_access_token: tokenData.access_token,
            salesforce_refresh_token: tokenData.refresh_token,
            salesforce_token_expires_at: expiresAt,
            salesforce_org_id: userInfo.organization_id,
            salesforce_user_id: userInfo.user_id,
            salesforce_connection_type: "oauth2",
            // Behalte bestehendes Field-Mapping falls vorhanden
          },
          {
            onConflict: "user_id",
          }
        );

      if (upsertError) {
        console.error("Failed to save Salesforce tokens:", upsertError);
        return NextResponse.redirect(
          new URL(
            "/dashboard/crm?error=save_failed",
            request.url
          )
        );
      }

      return NextResponse.redirect(
        new URL("/dashboard/crm?connected=true", request.url)
      );
    } catch (error) {
      console.error("OAuth callback error:", error);
      return NextResponse.redirect(
        new URL(
          "/dashboard/crm?error=connection_failed",
          request.url
        )
      );
    }
  } catch (error) {
    console.error("Salesforce callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/crm?error=internal_error", request.url)
    );
  }
}
