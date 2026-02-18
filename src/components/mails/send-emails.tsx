"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Template = {
  id: string;
  name: string;
  subject: string;
  template: string;
};

type Lead = {
  id: string;
  vorname: string | null;
  nachname: string | null;
  email: string | null;
  firma: string | null;
  event_id: string | null;
};

type Event = {
  id: string;
  name: string;
};

type SendEmailsProps = {
  templates: Template[];
  leads: Lead[];
  events: Event[];
};

export function SendEmails({ templates, leads, events }: SendEmailsProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("all");
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesEvent =
        selectedEventId === "all" || lead.event_id === selectedEventId;
      const matchesSearch =
        !searchQuery ||
        (lead.vorname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.nachname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.firma?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lead.email?.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesEvent && matchesSearch && lead.email; // Nur Leads mit E-Mail
    });
  }, [leads, selectedEventId, searchQuery]);

  const handleToggleLead = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId)
        ? prev.filter((id) => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((lead) => lead.id));
    }
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Bitte wähle ein Template aus");
      return;
    }

    if (selectedLeadIds.length === 0) {
      toast.error("Bitte wähle mindestens einen Lead aus");
      return;
    }

    setIsSending(true);
    setSentCount(null);

    let errorData: { error?: string; details?: string } | null = null;

    try {
      const response = await fetch("/api/mails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          leadIds: selectedLeadIds,
        }),
      });

      let data;
      try {
        data = await response.json();
        errorData = data;
      } catch (e) {
        const text = await response.text();
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        const errorMsg = data.error || "Fehler beim Versenden";
        const details = data.details ? ` ${data.details}` : "";
        throw new Error(errorMsg + details);
      }

      const sentCount = data.sentCount || selectedLeadIds.length;
      setSentCount(sentCount);
      
      if (data.remainingLimit !== undefined) {
        toast.success(
          `${sentCount} E-Mails erfolgreich versendet. Noch ${data.remainingLimit} Leads heute möglich.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`${sentCount} E-Mails erfolgreich versendet`);
      }
      setSelectedLeadIds([]);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Fehler beim Versenden der E-Mails";
      console.error("Send emails error:", error);
      
      // Zeige detaillierte Fehlermeldung
      const details = errorData?.details || errorData?.error;
      if (details && details !== errorMessage) {
        toast.error(`${errorMessage}: ${details}`, {
          duration: 10000,
        });
      } else {
        toast.error(errorMessage, {
          duration: 5000,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  const selectedLeadsCount = selectedLeadIds.length;
  const canSend = selectedTemplateId && selectedLeadsCount > 0 && !isSending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">E-Mails versenden</h2>
        <p className="text-sm text-muted-foreground">
          Wähle ein Template und die Leads aus, an die E-Mails verschickt werden
          sollen.
        </p>
      </div>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Template auswählen</CardTitle>
          <CardDescription>
            Wähle das Template, das für alle ausgewählten Leads verwendet werden
            soll.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Templates vorhanden. Erstelle zuerst ein Template.
            </p>
          ) : (
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Template auswählen" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {selectedTemplate && (
            <div className="mt-4 space-y-2 rounded-md border bg-muted/40 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Template-Vorschau
              </p>
              <div className="space-y-1">
                <p className="text-xs">
                  <span className="font-medium">Betreff:</span> {selectedTemplate.subject}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {selectedTemplate.template}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Leads auswählen</CardTitle>
          <CardDescription>
            Wähle die Leads aus, an die E-Mails verschickt werden sollen.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <Label htmlFor="lead-search">Suche</Label>
              <Input
                id="lead-search"
                placeholder="Name, Firma oder E-Mail..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-filter">Event</Label>
              {mounted ? (
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger id="event-filter" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-9 w-[200px] rounded-md border bg-muted animate-pulse" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredLeads.length} Leads gefunden
              {selectedLeadsCount > 0 && ` · ${selectedLeadsCount} ausgewählt`}
            </p>
            {filteredLeads.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedLeadIds.length === filteredLeads.length
                  ? "Auswahl aufheben"
                  : "Alle auswählen"}
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto rounded-lg border bg-white">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Keine Leads gefunden
              </div>
            ) : (
              <div className="divide-y">
                {filteredLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);
                  return (
                    <label
                      key={lead.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleLead(lead.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {lead.vorname || ""} {lead.nachname || ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.email} · {lead.firma || "—"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {selectedLeadsCount} Lead{selectedLeadsCount !== 1 ? "s" : ""} ausgewählt
              </p>
              {sentCount !== null && (
                <div className="mt-2 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{sentCount} E-Mails erfolgreich versendet</span>
                </div>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Tägliches Limit: 20 Leads pro Tag
              </p>
            </div>
            <Button
              onClick={handleSend}
              disabled={!canSend}
              size="lg"
              className="min-w-[140px]"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird versendet...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Absenden
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
