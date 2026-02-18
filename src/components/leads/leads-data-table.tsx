"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Pencil, Trash2, RotateCcw, Mail } from "lucide-react";
import type { LeadRow } from "./types";
import { normalizeLead } from "./lead-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type LeadsDataTableProps = {
  leads: LeadRow[];
  events: { id: string; name: string }[];
  initialEventId?: string | null;
};

export function LeadsDataTable({
  leads,
  events,
  initialEventId,
}: LeadsDataTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(
    (searchParams.get("q") as string | null) ?? ""
  );

  useEffect(() => {
    setMounted(true);
  }, []);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    vorname: "",
    nachname: "",
    email: "",
    firma: "",
    telefon: "",
    zusammenfassung: "",
    potential: null as "Hoch" | "Medium" | "Niedrig" | null,
    jobtitel: "",
  });
  const [isSaving, startSaving] = useTransition();
  const [isTogglingDelete, startTogglingDelete] = useTransition();

  const urlEventId = searchParams.get("eventId") as string | null;
  const currentEventId = urlEventId && urlEventId !== "all"
    ? urlEventId
    : initialEventId ?? "";

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const handleEventChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("eventId");
    } else {
      params.set("eventId", value);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  };

  const filtered = useMemo(() => {
    if (!leads || !Array.isArray(leads)) {
      return [];
    }
    return leads.filter((lead) => {
      const normalized = normalizeLead(lead);
      const matchesEvent =
        !currentEventId ||
        (lead as { event_id?: string }).event_id === currentEventId;
      const q = query.trim().toLowerCase();
      if (!matchesEvent) return false;
      if (!q) return true;
      return (
        normalized.firstName.toLowerCase().includes(q) ||
        normalized.lastName.toLowerCase().includes(q) ||
        normalized.company.toLowerCase().includes(q)
      );
    });
  }, [leads, query, currentEventId]);

  const handleEditClick = () => {
    if (!selectedLead) return;
    setIsEditing(true);
    setEditForm({
      vorname: selectedLead.vorname || "",
      nachname: selectedLead.nachname || "",
      email: selectedLead.email || "",
      firma: selectedLead.firma || "",
      telefon: selectedLead.telefon || "",
      zusammenfassung: selectedLead.zusammenfassung || "",
      potential: selectedLead.potential || null,
      jobtitel: selectedLead.jobtitel || "",
    });
  };

  const handleSaveEdit = () => {
    if (!selectedLead) return;
    startSaving(async () => {
      try {
        const response = await fetch("/api/leads/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedLead.id,
            ...editForm,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Speichern");
        }

        toast.success("Lead aktualisiert");
        router.refresh();
        setIsEditing(false);
      } catch {
        toast.error("Fehler beim Aktualisieren des Leads");
      }
    });
  };

  const handleToggleDelete = () => {
    if (!selectedLead) return;
    const isDeleted = !!selectedLead.deleted_at;
    startTogglingDelete(async () => {
      try {
        const response = await fetch("/api/leads/toggle-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: selectedLead.id,
            deleted: !isDeleted,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Löschen");
        }

        toast.success(isDeleted ? "Lead wiederhergestellt" : "Lead gelöscht");
        router.refresh();
      } catch {
        toast.error("Fehler beim Löschen/Wiederherstellen");
      }
    });
  };

  const selectedNormalized = selectedLead
    ? normalizeLead(selectedLead)
    : null;

  const selectedStructured =
    (selectedLead?.structured_data as Record<string, unknown> | null) ?? null;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="w-full sm:max-w-xs space-y-1">
            <Label htmlFor="lead-search">Suche</Label>
            <Input
              id="lead-search"
              placeholder="Name oder Firma..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="space-y-1 w-full sm:w-auto">
            <Label htmlFor="event-filter">Event</Label>
            {mounted ? (
              <Select value={urlEventId ?? "all"} onValueChange={handleEventChange}>
                <SelectTrigger id="event-filter" className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Alle Events" />
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
              <div className="h-9 w-full sm:w-[220px] rounded-md border bg-muted animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-x-auto -mx-4 sm:mx-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Vorname</TableHead>
              <TableHead className="whitespace-nowrap">Nachname</TableHead>
              <TableHead className="whitespace-nowrap">Firma</TableHead>
              <TableHead className="whitespace-nowrap">Jobtitel</TableHead>
              <TableHead className="whitespace-nowrap">E-Mail</TableHead>
              <TableHead className="whitespace-nowrap">Telefon</TableHead>
              <TableHead className="whitespace-nowrap">Potential</TableHead>
              <TableHead className="whitespace-nowrap">Zusammenfassung</TableHead>
              <TableHead className="whitespace-nowrap">Erstellt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-muted-foreground"
                >
                  Keine Leads gefunden. Passe Suche oder Filter an.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => {
                const normalized = normalizeLead(lead);
                const isDeleted = !!lead.deleted_at;
                const hasFollowup = !!lead.followup_mail_sent_at;
                return (
                  <TableRow
                    key={lead.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/60",
                      isDeleted && "opacity-50"
                    )}
                    onClick={() => {
                      setSelectedLead(lead);
                      setIsEditing(false);
                    }}
                  >
                    <TableCell>{normalized.firstName}</TableCell>
                    <TableCell>{normalized.lastName}</TableCell>
                    <TableCell>{normalized.company}</TableCell>
                    <TableCell>{normalized.jobTitle}</TableCell>
                    <TableCell>{normalized.email}</TableCell>
                    <TableCell>{normalized.phone}</TableCell>
                    <TableCell>
                      {normalized.potential && normalized.potential !== "—" ? (
                        <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          normalized.potential === "Hoch" ? "bg-green-100 text-green-800" :
                          normalized.potential === "Medium" ? "bg-yellow-100 text-yellow-800" :
                          normalized.potential === "Niedrig" ? "bg-red-100 text-red-800" :
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {normalized.potential}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">
                      {normalized.summary}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {normalized.createdAt}
                        {hasFollowup && (
                          <Badge variant="secondary" className="text-xs">
                            <Mail className="mr-1 h-3 w-3" />
                            Mail
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLead(null);
            setIsEditing(false);
          }
        }}
      >
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lead-Details</SheetTitle>
            <SheetDescription>
              {isEditing
                ? "Klicke auf die Felder zum Bearbeiten"
                : "Vollständige WhatsApp-Zusammenfassung und Metadaten."}
            </SheetDescription>
          </SheetHeader>

          {selectedLead && selectedNormalized && (
            <div className="space-y-4 text-sm">
              {selectedLead.deleted_at && (
                <Badge variant="destructive" className="w-fit">
                  Gelöscht
                </Badge>
              )}
              {selectedLead.followup_mail_sent_at && (
                <Badge variant="secondary" className="w-fit">
                  <Mail className="mr-1 h-3 w-3" />
                  Follow-up Mail gesendet
                </Badge>
              )}

              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Vorname</Label>
                      <Input
                        value={editForm.vorname}
                        onChange={(e) =>
                          setEditForm({ ...editForm, vorname: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Nachname</Label>
                      <Input
                        value={editForm.nachname}
                        onChange={(e) =>
                          setEditForm({ ...editForm, nachname: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Firma</Label>
                      <Input
                        value={editForm.firma}
                        onChange={(e) =>
                          setEditForm({ ...editForm, firma: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">E-Mail</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Telefon</Label>
                      <Input
                        value={editForm.telefon}
                        onChange={(e) =>
                          setEditForm({ ...editForm, telefon: e.target.value })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Jobtitel</Label>
                      <Input
                        value={editForm.jobtitel}
                        onChange={(e) =>
                          setEditForm({ ...editForm, jobtitel: e.target.value })
                        }
                        className="mt-1"
                        placeholder="z.B. Geschäftsführer"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Potential</Label>
                      <Select
                        value={editForm.potential || undefined}
                        onValueChange={(value) =>
                          setEditForm({
                            ...editForm,
                            potential: value as "Hoch" | "Medium" | "Niedrig",
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Potential auswählen (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Hoch">Hoch</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Niedrig">Niedrig</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Zusammenfassung</Label>
                      <Textarea
                        value={editForm.zusammenfassung}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            zusammenfassung: e.target.value,
                          })
                        }
                        className="mt-1"
                        rows={4}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                    >
                      {isSaving ? "Speichern..." : "Speichern"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Vorname
                      </Label>
                      <p className="font-medium">{selectedNormalized.firstName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Nachname
                      </Label>
                      <p className="font-medium">{selectedNormalized.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Firma
                      </Label>
                      <p className="font-medium">{selectedNormalized.company}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        E-Mail
                      </Label>
                      <p className="font-medium break-all">
                        {selectedNormalized.email}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Telefon
                      </Label>
                      <p className="font-medium">{selectedNormalized.phone}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Erstellt am
                      </Label>
                      <p className="font-medium">
                        {selectedNormalized.createdAt}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Jobtitel
                      </Label>
                      <p className="font-medium">{selectedNormalized.jobTitle}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Potential
                      </Label>
                      <p className="font-medium">
                        {selectedNormalized.potential && selectedNormalized.potential !== "—" ? (
                          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                            selectedNormalized.potential === "Hoch" ? "bg-green-100 text-green-800" :
                            selectedNormalized.potential === "Medium" ? "bg-yellow-100 text-yellow-800" :
                            selectedNormalized.potential === "Niedrig" ? "bg-red-100 text-red-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {selectedNormalized.potential}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Zusammenfassung (vollständig)
                    </Label>
                    <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">
                      {selectedNormalized.summary}
                    </p>
                  </div>

                  {selectedStructured && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Rohdaten (structured_data)
                      </Label>
                      <pre className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 text-xs">
                        {JSON.stringify(selectedStructured, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleEditClick}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleToggleDelete}
                      disabled={isTogglingDelete}
                      className={
                        selectedLead.deleted_at
                          ? "text-emerald-600"
                          : "text-destructive"
                      }
                    >
                      {selectedLead.deleted_at ? (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Wiederherstellen
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedLead(null);
                        setIsEditing(false);
                      }}
                    >
                      Schließen
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

