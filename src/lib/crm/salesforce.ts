import { createSupabaseServerClient } from "@/lib/supabase-server";
import type { CRMProvider, CRMIntegration, LeadData } from "./base";

/**
 * Salesforce CRM Implementation
 */

async function getCRMIntegration(
  userId: string
): Promise<CRMIntegration | null> {
  const supabase = await createSupabaseServerClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select(
      "crm_type, crm_access_token, crm_refresh_token, crm_token_expires_at, crm_instance_url, crm_connection_type, salesforce_field_mapping"
    )
    .eq("user_id", userId)
    .eq("crm_type", "salesforce")
    .maybeSingle();

  if (error || !integration) return null;
  return {
    crm_type: integration.crm_type as "salesforce",
    crm_access_token: integration.crm_access_token,
    crm_refresh_token: integration.crm_refresh_token,
    crm_token_expires_at: integration.crm_token_expires_at,
    crm_instance_url: integration.crm_instance_url,
    crm_org_id: null, // Wird später aus userInfo geholt
    crm_user_id: null, // Wird später aus userInfo geholt
    crm_connection_type: integration.crm_connection_type,
    field_mapping: integration.salesforce_field_mapping,
  };
}

async function getAccessToken(userId: string): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const { data: integration, error } = await supabase
    .from("integrations")
    .select(
      "crm_access_token, crm_refresh_token, crm_token_expires_at, crm_instance_url"
    )
    .eq("user_id", userId)
    .eq("crm_type", "salesforce")
    .maybeSingle();

  if (error || !integration?.crm_access_token) {
    throw new Error("Salesforce not connected");
  }

  const expiresAt = integration.crm_token_expires_at
    ? new Date(integration.crm_token_expires_at)
    : null;
  const now = new Date();
  const isExpired = expiresAt ? expiresAt < now : false;

  if (isExpired && integration.crm_refresh_token) {
    return await refreshToken(userId, integration.crm_refresh_token);
  }

  if (!integration.crm_access_token) {
    throw new Error("No access token available");
  }

  return integration.crm_access_token;
}

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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
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
      crm_access_token: tokenData.access_token,
      crm_token_expires_at: expiresAt,
    })
    .eq("user_id", userId)
    .eq("crm_type", "salesforce");

  if (updateError) {
    console.error("Failed to update refreshed token:", updateError);
    throw new Error("Failed to save refreshed token");
  }

  return tokenData.access_token;
}

export const salesforceProvider: CRMProvider = {
  async getAccessToken(userId: string): Promise<string> {
    return getAccessToken(userId);
  },

  async pushLead(payload: {
    userId: string;
    lead: LeadData;
    mapping?: CRMIntegration["field_mapping"] | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    try {
      const accessToken = await getAccessToken(payload.userId);
      const integration = await getCRMIntegration(payload.userId);

      if (!integration?.crm_instance_url) {
        return { success: false, error: "Salesforce instance URL not found" };
      }

      const mapping =
        payload.mapping ||
        integration.field_mapping || { summary: true, email: true, phone: true };
      const salesforceLead: Record<string, any> = {
        LastName: payload.lead.nachname || "Unknown",
        Company: payload.lead.firma || "Unknown",
      };

      if (payload.lead.vorname) salesforceLead.FirstName = payload.lead.vorname;
      if (mapping.email && payload.lead.email)
        salesforceLead.Email = payload.lead.email;
      if (mapping.phone && payload.lead.telefon)
        salesforceLead.Phone = payload.lead.telefon;
      if (mapping.summary && payload.lead.zusammenfassung)
        salesforceLead.Description = payload.lead.zusammenfassung;

      const response = await fetch(
        `${integration.crm_instance_url}/services/data/v58.0/sobjects/Lead`,
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
        return { success: false, error: `Salesforce API error: ${errorText}` };
      }

      const result = await response.json();
      return { success: true, id: result.id || "unknown" };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("pushLeadToSalesforce error:", error);
      return { success: false, error: errorMessage };
    }
  },

  async testConnection(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const accessToken = await getAccessToken(userId);
      const integration = await getCRMIntegration(userId);

      if (!integration?.crm_instance_url) {
        return { success: false, error: "Salesforce instance URL not found" };
      }

      const response = await fetch(
        `${integration.crm_instance_url}/services/data/v58.0/`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Salesforce API error: ${errorText}`,
        };
      }

      const testLeadResult = await salesforceProvider.pushLead({
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
        return { success: false, error: testLeadResult.error };
      }

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: errorMessage };
    }
  },

  async isConnected(userId: string): Promise<boolean> {
    const integration = await getCRMIntegration(userId);
    return !!(
      integration?.crm_access_token && integration?.crm_instance_url
    );
  },
};

// Legacy exports für Rückwärtskompatibilität
export async function pushLeadToSalesforce(payload: {
  userId: string;
  lead: LeadData;
  mapping?: { summary?: boolean; email?: boolean; phone?: boolean } | null;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  return salesforceProvider.pushLead(payload);
}

export async function testSalesforceConnection(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  return salesforceProvider.testConnection(userId);
}

export async function isSalesforceConnected(
  userId: string
): Promise<boolean> {
  return salesforceProvider.isConnected(userId);
}
