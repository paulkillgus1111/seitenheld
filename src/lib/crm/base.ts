/**
 * Abstraktes CRM-Interface für alle CRM-Integrationen
 */

export type CRMType = "salesforce" | "pipedrive" | "hubspot" | "zoho" | "dynamics365";

export interface CRMIntegration {
  crm_type: CRMType | null;
  crm_access_token: string | null;
  crm_refresh_token: string | null;
  crm_token_expires_at: string | null;
  crm_instance_url: string | null;
  crm_org_id: string | null;
  crm_user_id: string | null;
  crm_connection_type: "oauth2" | "client_credentials" | null;
  field_mapping: {
    summary?: boolean;
    email?: boolean;
    phone?: boolean;
  } | null;
}

export interface LeadData {
  vorname?: string | null;
  nachname?: string | null;
  email?: string | null;
  telefon?: string | null;
  firma?: string | null;
  zusammenfassung?: string | null;
}

export interface CRMConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl?: string;
  tokenUrl?: string;
}

export interface CRMProvider {
  /**
   * Holt oder erneuert den Access Token
   */
  getAccessToken(userId: string): Promise<string>;

  /**
   * Sendet einen Lead an das CRM
   */
  pushLead(payload: {
    userId: string;
    lead: LeadData;
    mapping?: CRMIntegration["field_mapping"] | null;
  }): Promise<{ success: true; id: string } | { success: false; error: string }>;

  /**
   * Testet die CRM-Verbindung
   */
  testConnection(userId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Prüft ob ein User mit dem CRM verbunden ist
   */
  isConnected(userId: string): Promise<boolean>;
}
