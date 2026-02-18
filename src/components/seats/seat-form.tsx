"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const seatSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Telefonnummer ist erforderlich")
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Ungültiges Format. Verwende z.B. +49 151 23456789"
    ),
});

type SeatValues = z.infer<typeof seatSchema>;

type SeatFormProps = {
  seatId?: string;
  initialPhoneNumber?: string;
  initialEventId?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function SeatForm({
  seatId,
  initialPhoneNumber = "",
  initialEventId = null,
  onSuccess,
  onCancel,
}: SeatFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<SeatValues>({
    resolver: zodResolver(seatSchema),
    defaultValues: {
      phone_number: initialPhoneNumber,
    },
  });

  const onSubmit = (values: SeatValues) => {
    startTransition(async () => {
      try {
        const url = seatId ? `/api/seats/${seatId}` : "/api/seats/create";
        const method = seatId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: values.phone_number,
            assigned_to_event_id: null, // Nicht mehr verwendet
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.details || "Fehler beim Speichern");
        }

        toast.success(seatId ? "Seat aktualisiert" : "Seat erstellt");
        router.refresh();
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Speichern"
        );
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefonnummer</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="+49 151 23456789"
                  autoComplete="tel"
                  {...field}
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-muted-foreground">
                Format: +49 151 23456789 (mit Landesvorwahl)
              </p>
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Wird gespeichert..." : seatId ? "Aktualisieren" : "Erstellen"}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Abbrechen
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
