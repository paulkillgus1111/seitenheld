"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type SettingsNotificationsProps = {
  initialEmailOnLead: boolean;
  initialWeeklySummary: boolean;
  initialCrmSyncReports: boolean;
};

export function SettingsNotifications({
  initialEmailOnLead,
  initialWeeklySummary,
  initialCrmSyncReports,
}: SettingsNotificationsProps) {
  const router = useRouter();
  const [emailOnLead, setEmailOnLead] = useState(initialEmailOnLead);
  const [weeklySummary, setWeeklySummary] = useState(initialWeeklySummary);
  const [crmSyncReports, setCrmSyncReports] = useState(initialCrmSyncReports);
  const [isSaving, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_on_lead: emailOnLead,
            weekly_summary: weeklySummary,
            crm_sync_reports: crmSyncReports,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Speichern");
        }

        toast.success("Benachrichtigungen aktualisiert");
        router.refresh();
      } catch {
        toast.error("Fehler beim Aktualisieren");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="email-on-lead" className="text-sm font-medium">
              E-Mail bei jedem neuen Lead-Eingang
            </Label>
            <p className="text-xs text-muted-foreground">
              Erhalte eine E-Mail-Benachrichtigung, sobald ein neuer Lead
              eingeht
            </p>
          </div>
          <Switch
            id="email-on-lead"
            checked={emailOnLead}
            onCheckedChange={setEmailOnLead}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="weekly-summary" className="text-sm font-medium">
              Wöchentliche Zusammenfassung der KPI
            </Label>
            <p className="text-xs text-muted-foreground">
              Erhalte jeden Montag eine E-Mail mit deinen Lead-KPIs der
              vergangenen Woche
            </p>
          </div>
          <Switch
            id="weekly-summary"
            checked={weeklySummary}
            onCheckedChange={setWeeklySummary}
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="crm-sync-reports" className="text-sm font-medium">
              CRM-Sync Statusberichte
            </Label>
            <p className="text-xs text-muted-foreground">
              Erhalte Benachrichtigungen über den Status der
              Salesforce-Synchronisation
            </p>
          </div>
          <Switch
            id="crm-sync-reports"
            checked={crmSyncReports}
            onCheckedChange={setCrmSyncReports}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? "Speichern..." : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
