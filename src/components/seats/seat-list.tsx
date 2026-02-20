"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Phone, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { SeatForm } from "./seat-form";
import { PhoneVerification } from "@/components/phone/phone-verification";

type Seat = {
  id: string;
  phone_number: string;
  is_active: boolean;
  verified?: boolean | null;
  created_at: string;
  assigned_to_event_id?: string | null;
};

type SeatListProps = {
  seats: Seat[];
  onUpdate?: () => void;
};

export function SeatList({ seats, onUpdate }: SeatListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingSeatId, setEditingSeatId] = useState<string | null>(null);
  const [verifyingSeatId, setVerifyingSeatId] = useState<string | null>(null);

  // Sicherstellen, dass seats immer ein Array ist
  const safeSeats = seats || [];

  const handleDelete = (seatId: string) => {
    startTransition(async () => {
      try {
        const response = await fetch(`/api/seats/${seatId}`, {
          method: "DELETE",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Löschen");
        }

        toast.success("Seat gelöscht");
        router.refresh();
        onUpdate?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Löschen"
        );
      }
    });
  };

  const editingSeat = safeSeats.find((s) => s.id === editingSeatId);
  const verifyingSeat = safeSeats.find((s) => s.id === verifyingSeatId);

  if (editingSeatId && editingSeat) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Seat bearbeiten</h3>
        <SeatForm
          seatId={editingSeat.id}
          initialPhoneNumber={editingSeat.phone_number}
          initialEventId={null}
          onSuccess={() => {
            setEditingSeatId(null);
            onUpdate?.();
          }}
          onCancel={() => setEditingSeatId(null)}
        />
      </div>
    );
  }

  if (verifyingSeatId && verifyingSeat) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Telefonnummer verifizieren</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVerifyingSeatId(null)}
          >
            Zurück
          </Button>
        </div>
        <PhoneVerification
          phoneNumberId={verifyingSeat.id}
          phoneNumber={verifyingSeat.phone_number}
          isVerified={verifyingSeat.verified}
          onVerified={() => {
            setVerifyingSeatId(null);
            router.refresh();
            onUpdate?.();
          }}
        />
      </div>
    );
  }

  if (safeSeats.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Phone className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Noch keine Seats vorhanden</p>
        <p className="text-sm">Erstelle deinen ersten Seat</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Telefonnummer</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="whitespace-nowrap">Verifizierung</TableHead>
              <TableHead className="whitespace-nowrap">Erstellt am</TableHead>
              <TableHead className="text-right whitespace-nowrap">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {safeSeats.map((seat) => (
            <TableRow key={seat.id}>
              <TableCell className="font-medium">
                {seat.phone_number}
              </TableCell>
              <TableCell>
                <Badge
                  variant={seat.is_active ? "default" : "secondary"}
                  className="flex items-center gap-1 w-fit"
                >
                  {seat.is_active ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Aktiv
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      Inaktiv
                    </>
                  )}
                </Badge>
              </TableCell>
              <TableCell>
                {seat.verified === true ? (
                  <Badge variant="default" className="flex items-center gap-1 w-fit bg-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Verifiziert
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerifyingSeatId(seat.id)}
                    className="w-fit"
                  >
                    Verifizieren
                  </Button>
                )}
              </TableCell>
              <TableCell>
                {new Date(seat.created_at).toLocaleDateString("de-DE")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingSeatId(seat.id)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Seat löschen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchtest du den Seat mit der Telefonnummer{" "}
                          <strong>{seat.phone_number}</strong> wirklich löschen?
                          {seat.assigned_to_event_id &&
                            " Der Seat wird deaktiviert, da er einem Event zugeordnet ist."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(seat.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Löschen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
