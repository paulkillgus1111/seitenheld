import type { CRMProvider, CRMIntegration, LeadData } from "./base";

/**
 * HubSpot CRM Implementation
 * TODO: Implementiere OAuth2 Flow und API-Calls
 */

export const hubspotProvider: CRMProvider = {
  async getAccessToken(_userId: string): Promise<string> {
    throw new Error("HubSpot not yet implemented");
  },

  async pushLead(_payload: {
    userId: string;
    lead: LeadData;
    mapping?: CRMIntegration["field_mapping"] | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }> {
    return { success: false, error: "HubSpot not yet implemented" };
  },

  async testConnection(_userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return { success: false, error: "HubSpot not yet implemented" };
  },

  async isConnected(_userId: string): Promise<boolean> {
    return false;
  },
};
