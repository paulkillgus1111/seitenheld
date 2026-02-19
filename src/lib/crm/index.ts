/**
 * CRM Provider Registry
 * Zentrale Stelle für alle CRM-Implementierungen
 * WICHTIG: Diese Datei sollte nur in Server Components verwendet werden!
 */

import type { CRMType, CRMProvider } from "./base";
import { salesforceProvider } from "./salesforce";
import { pipedriveProvider } from "./pipedrive";
import { hubspotProvider } from "./hubspot";
import { zohoProvider } from "./zoho";
import { dynamics365Provider } from "./dynamics365";

// Re-export types for easier imports
export type { CRMType, CRMProvider } from "./base";

export const crmProviders: Record<CRMType, CRMProvider> = {
  salesforce: salesforceProvider,
  pipedrive: pipedriveProvider,
  hubspot: hubspotProvider,
  zoho: zohoProvider,
  dynamics365: dynamics365Provider,
};

export function getCRMProvider(crmType: CRMType): CRMProvider {
  const provider = crmProviders[crmType];
  if (!provider) {
    throw new Error(`Unknown CRM type: ${crmType}`);
  }
  return provider;
}

// Re-export UI-Konstanten für einfacheren Import
export { crmDisplayNames, crmColors } from "./constants";
