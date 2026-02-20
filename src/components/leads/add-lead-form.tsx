"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type AddLeadFormProps = {
  events: { id: string; name: string }[];
};

export function AddLeadForm({ events }: AddLeadFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [formData, setFormData] = useState({
    event_id: "",
    vorname: "",
    nachname: "",
    email: "",
    firma: "",
    telefon: "",
    zusammenfassung: "",
    potential: null as "Hoch" | "Medium" | "Niedrig" | null,
    jobtitel: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.event_id) {
      toast.error("Bitte wähle ein Event aus");
      return;
    }

    startSaving(async () => {
      try {
        const response = await fetch("/api/leads/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: formData.event_id,
            vorname: formData.vorname || null,
            nachname: formData.nachname || null,
            email: formData.email || null,
            firma: formData.firma || null,
            telefon: formData.telefon || null,
            zusammenfassung: formData.zusammenfassung || null,
            potential: formData.potential || null,
            jobtitel: formData.jobtitel || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Erstellen des Leads");
        }

        toast.success("Lead erfolgreich hinzugefügt");
        setIsOpen(false);
        setFormData({
          event_id: "",
          vorname: "",
          nachname: "",
          email: "",
          firma: "",
          telefon: "",
          zusammenfassung: "",
          potential: null,
          jobtitel: "",
        });
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Erstellen des Leads"
        );
      }
    });
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" className="w-full sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Lead manuell hinzufügen
      </Button>
    );
  }

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>Neuen Lead hinzufügen</CardTitle>
        <CardDescription>
          Füge einen Lead manuell zu einem Event hinzu.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event_id">Event *</Label>
            <Select
              value={formData.event_id}
              onValueChange={(value) =>
                setFormData({ ...formData, event_id: value })
              }
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Event auswählen" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="vorname">Vorname</Label>
              <Input
                id="vorname"
                value={formData.vorname}
                onChange={(e) =>
                  setFormData({ ...formData, vorname: e.target.value })
                }
                placeholder="Max"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nachname">Nachname</Label>
              <Input
                id="nachname"
                value={formData.nachname}
                onChange={(e) =>
                  setFormData({ ...formData, nachname: e.target.value })
                }
                placeholder="Mustermann"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="max@example.com"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firma">Firma</Label>
              <Input
                id="firma"
                value={formData.firma}
                onChange={(e) =>
                  setFormData({ ...formData, firma: e.target.value })
                }
                placeholder="Muster GmbH"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefon">Telefon</Label>
              <Input
                id="telefon"
                type="tel"
                value={formData.telefon}
                onChange={(e) =>
                  setFormData({ ...formData, telefon: e.target.value })
                }
                placeholder="+49 151 23456789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zusammenfassung">Zusammenfassung</Label>
            <Textarea
              id="zusammenfassung"
              value={formData.zusammenfassung}
              onChange={(e) =>
                setFormData({ ...formData, zusammenfassung: e.target.value })
              }
              placeholder="Notizen zum Lead..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="potential">Potential</Label>
              <Select
                value={formData.potential}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    potential: value as "Hoch" | "Medium" | "Niedrig" | "strukturiert",
                  })
                }
              >
                <SelectTrigger id="potential">
                  <SelectValue placeholder="Potential auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hoch">Hoch</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Niedrig">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobtitel">Jobtitel</Label>
              <Input
                id="jobtitel"
                value={formData.jobtitel}
                onChange={(e) =>
                  setFormData({ ...formData, jobtitel: e.target.value })
                }
                placeholder="z.B. Geschäftsführer"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving} size="sm">
              {isSaving ? "Wird gespeichert..." : "Lead hinzufügen"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setFormData({
                  event_id: "",
                  vorname: "",
                  nachname: "",
                  email: "",
                  firma: "",
                  telefon: "",
                  zusammenfassung: "",
                  potential: null,
                  jobtitel: "",
                });
              }}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
