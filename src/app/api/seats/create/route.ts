import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const createSeatSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Telefonnummer ist erforderlich")
    .max(50, "Telefonnummer darf maximal 50 Zeichen lang sein.")
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Ungültiges Telefonnummer-Format. Verwende z.B. +49 151 23456789"
    ),
  assigned_to_event_id: z.string().uuid().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prüfe ob User bereits Seats hat (für Onboarding-Flow)
    const { count: existingSeatsCount } = await supabase
      .from("phone_numbers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    // ✅ Prüfe Subscription-Status nur wenn User bereits Seats hat (nicht beim Onboarding)
    if (existingSeatsCount && existingSeatsCount > 0) {
      const subscriptionCheck = await checkSubscriptionAccess(user.id);
      if (!subscriptionCheck.allowed) {
        return subscriptionCheck.response;
      }
    }

    // Rate Limiting: Seat-Missbrauch-Schutz
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.seatCreate,
      identifier: user.id, // User-ID für user-basierte Limits
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = createSeatSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.errors },
        { status: 400 }
      );
    }

    // Prüfe ob Event dem User gehört (falls zugeordnet)
    if (validated.data.assigned_to_event_id) {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("id", validated.data.assigned_to_event_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!event) {
        return NextResponse.json(
          { error: "Event not found or access denied" },
          { status: 404 }
        );
      }
    }

    // Atomare Seat-Erstellung mit Prüfung (verhindert Race Conditions)
    const { data: newSeatId, error: rpcError } = await supabase.rpc(
      "create_seat_atomic",
      {
        p_user_id: user.id,
        p_phone_number: validated.data.phone_number,
        p_assigned_to_event_id: validated.data.assigned_to_event_id || null,
      }
    );

    if (rpcError) {
      // Prüfe spezifische Fehlermeldungen
      const errorMessage = rpcError.message || "";
      
      if (errorMessage.includes("Maximale Anzahl an Seats erreicht")) {
        return NextResponse.json(
          {
            error: "Maximale Anzahl an Seats erreicht",
            details: "Du hast bereits die maximale Anzahl an Seats genutzt. Bitte kaufe mehr Seats oder entferne einen bestehenden Seat.",
          },
          { status: 403 }
        );
      }
      
      if (errorMessage.includes("Telefonnummer bereits vorhanden")) {
        return NextResponse.json(
          {
            error: "Telefonnummer bereits vorhanden",
            details: "Diese Telefonnummer wird bereits von einem anderen Account verwendet.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: rpcError.message || "Fehler beim Erstellen des Seats" },
        { status: 500 }
      );
    }

    // Hole den erstellten Seat
    const { data: newSeat, error: fetchError } = await supabase
      .from("phone_numbers")
      .select("*")
      .eq("id", newSeatId)
      .single();

    if (fetchError || !newSeat) {
      return NextResponse.json(
        { error: "Seat wurde erstellt, aber konnte nicht abgerufen werden" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, seat: newSeat });
  } catch (error) {
    console.error("Create seat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
