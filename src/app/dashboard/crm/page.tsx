import { redirect } from "next/navigation";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCRMProvider, type CRMType } from "@/lib/crm/index";
import { CRMTabs } from "@/components/crm/crm-tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";

const mappingSchema = z.object({
  summary: z.boolean().optional(),
  email: z.boolean().optional(),
  phone: z.boolean().optional(),
});

async function saveFieldMapping(crm: CRMType, formData: FormData) {
  "use server";

  const mapping: z.infer<typeof mappingSchema> = {
    summary: formData.get("map_summary") === "on",
    email: formData.get("map_email") === "on",
    phone: formData.get("map_phone") === "on",
  };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Aktualisiere nur das Field-Mapping (aktuell nur Salesforce)
  await supabase
    .from("integrations")
    .update({
      salesforce_field_mapping: mapping,
    })
    .eq("user_id", user.id);
}

async function testConnection(crm: CRMType) {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const provider = getCRMProvider(crm);
  const result = await provider.testConnection(user.id);

  if (result.success) {
    redirect(`/dashboard/crm?test=success&crm=${crm}`);
  } else {
    redirect(
      `/dashboard/crm?test=error&message=${encodeURIComponent(result.error || "Unknown error")}&crm=${crm}`
    );
  }
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;

  // Lade alle CRM-Integrationen (inkl. Legacy Salesforce-Felder für Rückwärtskompatibilität)
  const { data: integration } = await supabase
    .from("integrations")
    .select(
      "crm_type, crm_access_token, crm_instance_url, crm_connection_type, salesforce_access_token, salesforce_instance_url, salesforce_connection_type, salesforce_field_mapping"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  // Erstelle Integrations-Objekt für alle CRMs
  // Unterstütze sowohl neue generische Felder als auch Legacy Salesforce-Felder
  const salesforceIntegration = integration
    ? {
        crm_type: (integration.crm_type || "salesforce") as CRMType,
        crm_access_token:
          integration.crm_access_token || integration.salesforce_access_token,
        crm_instance_url:
          integration.crm_instance_url || integration.salesforce_instance_url,
        crm_connection_type:
          integration.crm_connection_type ||
          integration.salesforce_connection_type,
        salesforce_field_mapping: integration.salesforce_field_mapping,
      }
    : null;

  const integrations: Record<CRMType, any> = {
    salesforce: salesforceIntegration,
    pipedrive: integration?.crm_type === "pipedrive" ? integration : null,
    hubspot: integration?.crm_type === "hubspot" ? integration : null,
    zoho: integration?.crm_type === "zoho" ? integration : null,
    dynamics365: integration?.crm_type === "dynamics365" ? integration : null,
  };

  // URL Parameter für Status-Messages
  const connected = resolvedSearchParams.connected === "true";
  const testResult = resolvedSearchParams.test;
  const testMessage = resolvedSearchParams.message;
  const error = resolvedSearchParams.error;
  const activeCRM = (resolvedSearchParams.crm as CRMType) || "salesforce";

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          CRM Integration
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            CRM-Anbindung
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Verbinde Seitenheld mit deinem CRM-System.
          </p>
        </div>
      </header>

      <div className="space-y-6">
        {/* Status Messages */}
        {connected && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              {activeCRM === "salesforce" && "Salesforce erfolgreich verbunden!"}
              {activeCRM !== "salesforce" && `${activeCRM} erfolgreich verbunden!`}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Fehler: {typeof error === "string" ? error : "Unbekannter Fehler"}
            </AlertDescription>
          </Alert>
        )}

        {testResult === "success" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              Verbindung erfolgreich getestet! Ein Test-Lead wurde erstellt.
            </AlertDescription>
          </Alert>
        )}

        {testResult === "error" && (
          <Alert className="border-destructive/50 bg-destructive/10">
            <XCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Test fehlgeschlagen:{" "}
              {typeof testMessage === "string"
                ? testMessage
                : "Unbekannter Fehler"}
            </AlertDescription>
          </Alert>
        )}

        <CRMTabs
          integrations={integrations}
          onSaveMapping={saveFieldMapping}
          onTestConnection={testConnection}
        />
      </div>
    </>
  );
}
