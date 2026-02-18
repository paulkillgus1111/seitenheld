"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  XCircle,
  Link2,
  Settings,
  Zap,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { crmDisplayNames } from "@/lib/crm/constants";
import type { CRMType } from "@/lib/crm/base";
import Link from "next/link";

interface CRMIntegration {
  crm_type: CRMType | null;
  crm_access_token: string | null;
  crm_instance_url: string | null;
  crm_connection_type: string | null;
  salesforce_field_mapping: {
    summary?: boolean;
    email?: boolean;
    phone?: boolean;
  } | null;
}

interface CRMTabsProps {
  integrations: Record<CRMType, CRMIntegration | null>;
  onSaveMapping: (crm: CRMType, formData: FormData) => Promise<void>;
  onTestConnection: (crm: CRMType) => Promise<void>;
}

// CRM Icons Mapping
const crmIcons: Record<CRMType, React.ReactNode> = {
  salesforce: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.2 4.4c-.4-.2-.8-.3-1.2-.3-1.1 0-2 .9-2 2s.9 2 2 2c.4 0 .8-.1 1.2-.3.4.2.8.3 1.2.3 1.1 0 2-.9 2-2s-.9-2-2-2c-.4 0-.8.1-1.2.3zm-1.2 3.6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm9.6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-9.6 3.6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  ),
  pipedrive: <Zap className="h-5 w-5" />,
  hubspot: <Link2 className="h-5 w-5" />,
  zoho: <Settings className="h-5 w-5" />,
  dynamics365: <Link2 className="h-5 w-5" />,
};

export function CRMTabs({
  integrations,
  onSaveMapping,
  onTestConnection,
}: CRMTabsProps) {
  const [activeCRM, setActiveCRM] = useState<CRMType>("salesforce");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full">
        <div className="grid gap-6 lg:grid-cols-[1.1fr,1fr]">
          <Card className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>CRM Integration</CardTitle>
              <CardDescription>Lade...</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 animate-pulse bg-muted/40 rounded" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isConnected = (crm: CRMType): boolean => {
    const integration = integrations[crm];
    if (!integration) return false;

    if (crm === "salesforce") {
      return !!(
        (integration.crm_access_token ||
          (integration as any).salesforce_access_token) &&
        (integration.crm_instance_url ||
          (integration as any).salesforce_instance_url)
      );
    }

    return !!(
      integration.crm_access_token && integration.crm_instance_url
    );
  };

  const isImplemented = (crm: CRMType): boolean => {
    // Salesforce ist auf "Soon" gesetzt, da OAuth nur mit bezahltem Account funktioniert
    // Zum Aktivieren: return true statt false
    if (crm === "salesforce") return false;
    // Pipedrive, HubSpot, Zoho, Dynamics365 können hier hinzugefügt werden, wenn sie implementiert sind
    return false;
  };

  const getFieldMapping = (crm: CRMType) => {
    const integration = integrations[crm];
    return (
      integration?.salesforce_field_mapping || {
        summary: true,
        email: true,
        phone: true,
      }
    );
  };

  const connected = isConnected(activeCRM);
  const implemented = isImplemented(activeCRM);
  const mapping = getFieldMapping(activeCRM);

  return (
    <div className="w-full space-y-6">
      {/* Dropdown für CRM-Auswahl */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Label htmlFor="crm-select" className="text-sm font-semibold whitespace-nowrap pt-2">
          CRM-System:
        </Label>
        <Select
          value={activeCRM}
          onValueChange={(value) => setActiveCRM(value as CRMType)}
        >
          <SelectTrigger id="crm-select" className="w-full sm:w-[350px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {crmIcons[activeCRM]}
                </span>
                <span>{crmDisplayNames[activeCRM]}</span>
                {isConnected(activeCRM) && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />
                )}
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {(["salesforce", "pipedrive", "hubspot", "zoho", "dynamics365"] as CRMType[]).map(
              (crm) => {
                const crmConnected = isConnected(crm);
                const crmImplemented = isImplemented(crm);
                return (
                  <SelectItem key={crm} value={crm}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {crmIcons[crm]}
                        </span>
                        <span>{crmDisplayNames[crm]}</span>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        {crmConnected && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        )}
                        {!crmImplemented && (
                          <Badge
                            variant="secondary"
                            className="h-4 px-1.5 text-[10px] font-normal"
                          >
                            Soon
                          </Badge>
                        )}
                      </div>
                    </div>
                  </SelectItem>
                );
              }
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Content für ausgewähltes CRM */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <Card className="border border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  {crmIcons[activeCRM]}
                </div>
                <div>
                  <CardTitle className="text-xl">
                    {crmDisplayNames[activeCRM]}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {implemented
                      ? "Automatische Lead-Synchronisation"
                      : "Integration in Entwicklung"}
                  </CardDescription>
                </div>
              </div>
              {connected && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" />
                  Verbunden
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!implemented ? (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Coming Soon
                </p>
                <p className="text-xs text-muted-foreground">
                  Diese Integration wird in Kürze verfügbar sein.
                </p>
              </div>
            ) : !connected ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">
                      Nicht verbunden
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Verbinde dich mit {crmDisplayNames[activeCRM]}, um Leads
                  automatisch zu synchronisieren und deine
                  Verkaufsprozesse zu optimieren.
                </p>
                <Link href={`/api/crm/connect/${activeCRM}`}>
                  <Button className="w-full" size="lg">
                    <Link2 className="mr-2 h-4 w-4" />
                    Mit {crmDisplayNames[activeCRM]} verbinden
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-900">
                      Erfolgreich verbunden
                    </p>
                  </div>
                  {integrations[activeCRM]?.crm_connection_type && (
                    <p className="text-xs text-emerald-700/80 ml-6">
                      Verbindungstyp:{" "}
                      {integrations[activeCRM]?.crm_connection_type.toUpperCase()}
                    </p>
                  )}
                </div>

                <form
                  action={(formData) => onSaveMapping(activeCRM, formData)}
                  className="space-y-5"
                >
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-semibold">
                        Feld-Mapping
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Wähle, welche Lead-Felder an{" "}
                        {crmDisplayNames[activeCRM]} übertragen werden sollen.
                      </p>
                    </div>
                    <div className="space-y-2 rounded-lg border bg-card p-4">
                      {[
                        {
                          key: "summary",
                          name: "map_summary",
                          label: "Zusammenfassung",
                          checked: mapping.summary,
                          icon: FileText,
                        },
                        {
                          key: "email",
                          name: "map_email",
                          label: "E-Mail",
                          checked: mapping.email,
                          icon: Mail,
                        },
                        {
                          key: "phone",
                          name: "map_phone",
                          label: "Telefon",
                          checked: mapping.phone,
                          icon: Phone,
                        },
                      ].map((field) => {
                        const Icon = field.icon;
                        return (
                          <label
                            key={field.key}
                            className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          >
                            <Checkbox
                              name={field.name}
                              defaultChecked={field.checked}
                            />
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm flex-1">
                              {field.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" size="default" className="flex-1">
                      <Settings className="mr-2 h-4 w-4" />
                      Mapping speichern
                    </Button>
                    <form
                      action={() => onTestConnection(activeCRM)}
                      className="inline"
                    >
                      <Button
                        type="submit"
                        size="default"
                        variant="outline"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        Testen
                      </Button>
                    </form>
                  </div>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Anleitung
            </CardTitle>
            <CardDescription>
              Schritt-für-Schritt Setup für {crmDisplayNames[activeCRM]}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {implemented ? (
              <>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Verbindung starten
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Klicke auf "Mit {crmDisplayNames[activeCRM]} verbinden"
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Anmelden & Autorisieren
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Logge dich in dein {crmDisplayNames[activeCRM]}-Konto
                        ein
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        Integration autorisieren
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Erlaube Seitenheld den Zugriff auf dein CRM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary mt-0.5">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Fertig!</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Leads werden automatisch synchronisiert
                      </p>
                    </div>
                  </div>
                </div>
                {activeCRM === "salesforce" && (
                  <div className="pt-4 border-t">
                    <a
                      href="https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Salesforce-Dokumentation
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-dashed bg-muted/30 px-4 py-6 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">
                  In Entwicklung
                </p>
                <p className="text-xs text-muted-foreground">
                  Die Anleitung wird verfügbar sein, sobald die
                  Integration fertiggestellt ist.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
