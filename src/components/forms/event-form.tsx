"use client";

import { useMemo, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { logger } from "@/lib/logger";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const eventSchema = z.object({
  name: z.string().min(2, "Bitte einen Namen angeben.").max(200, "Name darf maximal 200 Zeichen lang sein."),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  budget: z
    .string()
    .max(20)
    .optional()
    .transform((value) => (value ? Number(value.replace(",", ".")) : null))
    .refine(
      (value) => value === null || (!Number.isNaN(value) && value >= 0),
      "Budget muss eine Zahl ≥ 0 sein."
    ),
  phone_number_id: z.string().uuid("Bitte wähle eine Telefonnummer aus."),
  timezone: z.string().default("Europe/Berlin"),
});

// Type für Form-Input (vor Transform) - muss mit Zod Schema übereinstimmen
type EventFormInput = z.input<typeof eventSchema>;

// Type für Form-Output (nach Transform)
type EventValues = z.output<typeof eventSchema>;

type PhoneNumber = {
  id: string;
  phone_number: string;
  is_active: boolean;
};

export function EventForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [isLoadingPhoneNumbers, setIsLoadingPhoneNumbers] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const form = useForm<EventFormInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: "",
      startDate: "",
      endDate: "",
      budget: "",
      phone_number_id: "",
      timezone: "Europe/Berlin",
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Lade aktive Seats des Users
    const loadPhoneNumbers = async () => {
      try {
        const response = await fetch("/api/seats");
        if (response.ok) {
          const data = await response.json();
          const activeSeats = (data.seats || []).filter(
            (seat: PhoneNumber) => seat.is_active
          );
          setPhoneNumbers(activeSeats);
        }
      } catch (error) {
        logger.error("Error loading phone numbers:", error);
      } finally {
        setIsLoadingPhoneNumbers(false);
      }
    };

    loadPhoneNumbers();
  }, []);

  const onSubmit = async (values: EventFormInput) => {
    setError(null);
    
    // Validiere und transformiere mit Zod
    const result = eventSchema.safeParse(values);
    if (!result.success) {
      setError(result.error.issues[0]?.message || "Ungültige Eingabe");
      return;
    }
    
    const transformedValues = result.data;
    
    startTransition(async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(userError?.message ?? "Bitte erneut einloggen.");
        return;
      }

      if (!transformedValues.phone_number_id) {
        setError("Bitte wähle eine Telefonnummer aus.");
        return;
      }

      // Erstelle Event über API-Route (für Rate Limiting)
      const createResponse = await fetch("/api/events/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: transformedValues.name,
          start_date: transformedValues.startDate || null,
          end_date: transformedValues.endDate || null,
          estimated_costs:
            transformedValues.budget === null || transformedValues.budget === undefined
              ? null
              : transformedValues.budget,
          phone_number_id: transformedValues.phone_number_id,
          timezone: transformedValues.timezone || "Europe/Berlin",
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        setError(createData.error || createData.details || "Fehler beim Erstellen des Events");
        return;
      }

      const newEvent = createData.event;

      // ✅ Prüfe ob Event heute erstellt wurde und sende WhatsApp
      if (newEvent) {
        // Verwende lokale Zeitzone statt UTC
        const today = new Date();
        const todayStr = today.toLocaleDateString("en-CA"); // Format: YYYY-MM-DD in lokaler Zeitzone

        logger.log("🔍 [Event Form] Event created:", {
          event_id: newEvent.id,
          event_name: newEvent.name,
          start_date: newEvent.start_date,
          today_str: todayStr,
          is_today: newEvent.start_date === todayStr,
        });

        if (newEvent.start_date === todayStr) {
          logger.log("✅ [Event Form] Event starts today - attempting to send WhatsApp");
          
          try {
            const { data: phoneNumber, error: phoneError } = await supabase
              .from("phone_numbers")
              .select("phone_number, verified")
              .eq("id", values.phone_number_id)
              .single();

            logger.log("📞 [Event Form] Phone number check:", {
              phone_number_id: values.phone_number_id,
              phoneNumber,
              phoneError: phoneError?.message,
              is_verified: phoneNumber?.verified,
              has_phone: !!phoneNumber?.phone_number,
            });

            if (phoneError) {
              logger.error("❌ [Event Form] Error fetching phone number:", phoneError);
            }

            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, email")
              .eq("id", user.id)
              .single();

            if (phoneNumber?.verified && phoneNumber?.phone_number) {
              const userName = profile?.full_name || user.email || "Nutzer";

              logger.log("📤 [Event Form] Sending event created message:", {
                event_id: newEvent.id,
                event_name: newEvent.name,
                phone_number: phoneNumber.phone_number,
                user_name: userName,
              });

              const response = await fetch(
                "/api/n8n/send-event-created-message",
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event_id: newEvent.id,
                    event_name: newEvent.name,
                    phone_number: phoneNumber.phone_number,
                    user_name: userName,
                  }),
                }
              );

              const responseData = await response.json();
              logger.log("📥 [Event Form] Event created message response:", {
                status: response.status,
                ok: response.ok,
                data: responseData,
              });

              if (response.ok) {
                logger.log("✅ [Event Form] WhatsApp sent successfully, marking morning_message_sent");
                await supabase
                  .from("events")
                  .update({ morning_message_sent: true })
                  .eq("id", newEvent.id);
              } else {
                logger.error("❌ [Event Form] Failed to send WhatsApp:", responseData);
              }
            } else {
              logger.log("⚠️ [Event Form] Phone number not verified or missing:", {
                verified: phoneNumber?.verified,
                phone_number: phoneNumber?.phone_number,
              });
            }
          } catch (error) {
            logger.error("❌ [Event Form] Error sending event created message:", error);
          }
        } else {
          logger.log("ℹ️ [Event Form] Event does not start today, skipping WhatsApp");
        }
      }

      form.reset();
      router.refresh();
    });
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2 h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="h-10 bg-muted animate-pulse rounded" />
          <div className="md:col-span-2 h-10 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Event / Messe</FormLabel>
                <FormControl>
                  <Input
                    placeholder="z.B. IAA Mobility, Bits & Pretzels"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Startdatum</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enddatum</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gesamtbudget (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="25000"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone_number_id"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Telefonnummer *</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={isLoadingPhoneNumbers || phoneNumbers.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wähle eine Telefonnummer" />
                    </SelectTrigger>
                    <SelectContent>
                      {phoneNumbers.length === 0 ? (
                        <SelectItem value="no-seats" disabled>
                          Keine Telefonnummern verfügbar
                        </SelectItem>
                      ) : (
                        phoneNumbers.map((phone) => (
                          <SelectItem key={phone.id} value={phone.id}>
                            {phone.phone_number}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
                {phoneNumbers.length === 0 && (
                  <p className="text-xs text-destructive">
                    Du musst zuerst eine Telefonnummer in den Seats erstellen.
                  </p>
                )}
                {phoneNumbers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Wähle eine Telefonnummer für dieses Event aus (erforderlich)
                  </p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Zeitzone</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zeitzone wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/Berlin">Europa (Berlin, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/London">Europa (London, GMT/BST)</SelectItem>
                      <SelectItem value="Europe/Paris">Europa (Paris, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/Madrid">Europa (Madrid, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/Rome">Europa (Rom, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/Amsterdam">Europa (Amsterdam, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/Vienna">Europa (Wien, MEZ/MESZ)</SelectItem>
                      <SelectItem value="Europe/Zurich">Europa (Zürich, MEZ/MESZ)</SelectItem>
                      <SelectItem value="America/New_York">USA (New York, EST/EDT)</SelectItem>
                      <SelectItem value="America/Chicago">USA (Chicago, CST/CDT)</SelectItem>
                      <SelectItem value="America/Denver">USA (Denver, MST/MDT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">USA (Los Angeles, PST/PDT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asien (Tokio, JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Asien (Shanghai, CST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asien (Dubai, GST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asien (Singapur, SGT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australien (Sydney, AEDT/AEST)</SelectItem>
                      <SelectItem value="Australia/Melbourne">Australien (Melbourne, AEDT/AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">
                  Zeitzone der Messe. Die Morgen-Nachricht wird um 6 Uhr in dieser Zeitzone gesendet.
                </p>
              </FormItem>
            )}
          />

          <div className="md:col-span-2 flex gap-3">
            <Button
              type="submit"
              disabled={isPending || form.formState.isSubmitting}
            >
              Event speichern
            </Button>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </div>
        </form>
      </Form>
      <p className="text-xs text-muted-foreground">
        Hier legst du Events und Budgets an – Leads kommen per WhatsApp rein.
      </p>
    </div>
  );
}
