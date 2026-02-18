import { createSupabaseServerClient } from "@/lib/supabase-server";

interface SalesforceToken {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  expires_at: Date;
}

interface SalesforceIntegration {
  salesforce_access_token: string | null;
  salesforce_refresh_token: string | null;
  salesforce_token_expires_at: string | null;
  salesforce_instance_url: string | null;
  salesforce_connection_type: "oauth2" | "client_credentials" | null;
  salesforce_field_mapping: {
    summary?: boolean;
    email?: boolean;
    phone?: boolean;
  } | null;
}

/**
 * Holt oder erneuert den Access Token für einen User
 */
async function getAccessToken(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select(
      "salesforce_access_token, salesforce_refresh_token, salesforce_token_expires_at, salesforce_instance_url, salesforce_connection_type"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !integration?.salesforce_access_token) {
    throw new Error("Salesforce not connected");
  }

  // Prüfe ob Token abgelaufen
  const expiresAt = integration.salesforce_token_expires_at
    ? new Date(integration.salesforce_token_expires_at)
    : null;

  const now = new Date();
  const isExpired = expiresAt ? expiresAt < now : false;

  if (isExpired && integration.salesforce_refresh_token) {
    // Token erneuern
    return await refreshToken(userId, integration.salesforce_refresh_token);
  }

  if (!integration.salesforce_access_token) {
    throw new Error("No access token available");
  }

  return integration.salesforce_access_token;
}

/**
 * Erneuert einen abgelaufenen Access Token mit dem Refresh Token
 */
async function refreshToken(
  userId: string,
  refreshToken: string
): Promise<string> {
  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const salesforceTokenUrl =
    process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com";

  if (!clientId || !clientSecret) {
    throw new Error("Salesforce not configured");
  }

  const response = await fetch(`${salesforceTokenUrl}/services/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to refresh token:", errorText);
    throw new Error("Failed to refresh Salesforce token");
  }

  const tokenData = await response.json();
  const supabase = await createSupabaseServerClient();

  const expiresAt = new Date(
    Date.now() + (tokenData.expires_in || 7200) * 1000
  ).toISOString();

  const { error: updateError } = await supabase
    .from("integrations")
    .update({
      salesforce_access_token: tokenData.access_token,
      salesforce_token_expires_at: expiresAt,
      // Refresh Token bleibt gleich (wird nur bei OAuth2 Flow neu gesetzt)
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Failed to update refreshed token:", updateError);
    throw new Error("Failed to save refreshed token");
  }

  return tokenData.access_token;
}

/**
 * Holt die Salesforce Integration-Daten eines Users
 */
async function getSalesforceIntegration(
  userId: string
): Promise<SalesforceIntegration | null> {
  const supabase = await createSupabaseServerClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select(
      "salesforce_access_token, salesforce_refresh_token, salesforce_token_expires_at, salesforce_instance_url, salesforce_connection_type, salesforce_field_mapping"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !integration) {
    return null;
  }

  return integration as SalesforceIntegration;
}

/**
 * Sendet einen Lead an Salesforce
 */
export async function pushLeadToSalesforce(payload: {
  userId: string;
  lead: {
    vorname?: string | null;
    nachname?: string | null;
    email?: string | null;
    telefon?: string | null;
    firma?: string | null;
    zusammenfassung?: string | null;
  };
  mapping?: {
    summary?: boolean;
    email?: boolean;
    phone?: boolean;
  } | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const accessToken = await getAccessToken(payload.userId);
    const integration = await getSalesforceIntegration(payload.userId);

    if (!integration?.salesforce_instance_url) {
      return {
        success: false,
        error: "Salesforce instance URL not found",
      };
    }

    // Verwende Mapping aus DB oder Default
    const mapping = payload.mapping || integration.salesforce_field_mapping || {
      summary: true,
      email: true,
      phone: true,
    };

    // Mappe Lead-Daten zu Salesforce Lead-Format
    const salesforceLead: Record<string, any> = {
      LastName: payload.lead.nachname || "Unknown",
      Company: payload.lead.firma || "Unknown",
    };

    // FirstName ist optional in Salesforce
    if (payload.lead.vorname) {
      salesforceLead.FirstName = payload.lead.vorname;
    }

    if (mapping.email && payload.lead.email) {
      salesforceLead.Email = payload.lead.email;
    }

    if (mapping.phone && payload.lead.telefon) {
      salesforceLead.Phone = payload.lead.telefon;
    }

    if (mapping.summary && payload.lead.zusammenfassung) {
      salesforceLead.Description = payload.lead.zusammenfassung;
    }

    // Erstelle Lead in Salesforce
    const response = await fetch(
      `${integration.salesforce_instance_url}/services/data/v58.0/sobjects/Lead`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(salesforceLead),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Salesforce API error:", errorText);
      return {
        success: false,
        error: `Salesforce API error: ${errorText}`,
      };
    }

    const result = await response.json();

    return {
      success: true,
      id: result.id || result.id || "unknown",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("pushLeadToSalesforce error:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Testet die Salesforce-Verbindung
 */
export async function testSalesforceConnection(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(userId);
    const integration = await getSalesforceIntegration(userId);

    if (!integration?.salesforce_instance_url) {
      return {
        success: false,
        error: "Salesforce instance URL not found",
      };
    }

    // Teste Verbindung mit einfachem API-Call (Identity Endpoint)
    const response = await fetch(
      `${integration.salesforce_instance_url}/services/data/v58.0/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Salesforce API error: ${errorText}`,
      };
    }

    // Erstelle einen Test-Lead
    const testLeadResult = await pushLeadToSalesforce({
      userId,
      lead: {
        vorname: "Test",
        nachname: "Lead",
        email: "test@example.com",
        firma: "Test Company",
        zusammenfassung: "Test-Lead aus Seitenheld",
      },
    });

    if (!testLeadResult.success) {
      return {
        success: false,
        error: testLeadResult.error,
      };
    }

    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Prüft ob ein User mit Salesforce verbunden ist
 */
export async function isSalesforceConnected(
  userId: string
): Promise<boolean> {
  const integration = await getSalesforceIntegration(userId);
  return !!(
    integration?.salesforce_access_token &&
    integration?.salesforce_instance_url
  );
}
