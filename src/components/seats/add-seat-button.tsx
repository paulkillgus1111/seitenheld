"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SeatForm } from "./seat-form";

export function AddSeatButton() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Seat hinzufügen
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Neuen Seat erstellen</SheetTitle>
          <SheetDescription>
            Füge eine neue Telefonnummer hinzu und ordne sie optional einem Event zu.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <SeatForm
            onSuccess={() => {
              setOpen(false);
            }}
            onCancel={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
