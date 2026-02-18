"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { EventForm } from "./event-form";

type Event = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  estimated_costs: number | null;
};

type EventListProps = {
  events: Event[];
};

export function EventList({ events }: EventListProps) {
  const router = useRouter();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const handleDelete = async (eventId: string) => {
    startDeleting(async () => {
      try {
        const response = await fetch("/api/events/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: eventId }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Löschen");
        }

        toast.success("Event gelöscht");
        router.refresh();
      } catch {
        toast.error("Fehler beim Löschen des Events");
      }
    });
  };

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Events angelegt. Starte rechts mit einem neuen Event.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex items-center justify-between rounded-lg border border-border/70 bg-white px-4 py-3"
        >
          <div className="flex-1 space-y-0.5">
            <p className="font-medium text-foreground">{event.name}</p>
            <p className="text-xs text-muted-foreground">
              {event.start_date || "kein Start"} – {event.end_date || "kein Ende"}
            </p>
            <p className="text-xs text-muted-foreground">
              Budget:{" "}
              {event.estimated_costs != null
                ? `${event.estimated_costs} €`
                : "nicht gesetzt"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingEvent(event)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Event wirklich löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Wenn du dieses Event löschst, werden alle zugehörigen Leads
                    ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht
                    werden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(event.id)}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? "Löschen..." : "Löschen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}
      {editingEvent && (
        <EventEditDialog
          event={editingEvent}
          onClose={() => setEditingEvent(null)}
        />
      )}
    </div>
  );
}

type EventEditDialogProps = {
  event: Event;
  onClose: () => void;
};

function EventEditDialog({ event, onClose }: EventEditDialogProps) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startSaving(async () => {
      try {
        const response = await fetch("/api/events/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: event.id,
            name: formData.get("name"),
            start_date: formData.get("start_date") || null,
            end_date: formData.get("end_date") || null,
            estimated_costs: formData.get("budget")
              ? Number(formData.get("budget"))
              : null,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Speichern");
        }

        toast.success("Event aktualisiert");
        router.refresh();
        onClose();
      } catch {
        toast.error("Fehler beim Aktualisieren des Events");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold">Event bearbeiten</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Event / Messe</label>
            <input
              type="text"
              name="name"
              defaultValue={event.name}
              required
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Startdatum</label>
              <input
                type="date"
                name="start_date"
                defaultValue={event.start_date || ""}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Enddatum</label>
              <input
                type="date"
                name="end_date"
                defaultValue={event.end_date || ""}
                className="mt-1 w-full rounded-md border px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Gesamtbudget (€)</label>
            <input
              type="number"
              name="budget"
              min="0"
              step="100"
              defaultValue={event.estimated_costs || ""}
              className="mt-1 w-full rounded-md border px-3 py-2"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border px-4 py-2 text-sm"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-md bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isSaving ? "Speichern..." : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
