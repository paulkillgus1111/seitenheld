/**
 * UI-Konstanten für CRM-Integrationen
 * Diese Datei kann sicher in Client Components importiert werden
 */

import type { CRMType } from "./base";

export const crmDisplayNames: Record<CRMType, string> = {
  salesforce: "Salesforce",
  pipedrive: "Pipedrive",
  hubspot: "HubSpot",
  zoho: "Zoho CRM",
  dynamics365: "Microsoft Dynamics 365",
};

export const crmColors: Record<CRMType, string> = {
  salesforce: "bg-blue-500",
  pipedrive: "bg-orange-500",
  hubspot: "bg-orange-600",
  zoho: "bg-blue-600",
  dynamics365: "bg-blue-700",
};
