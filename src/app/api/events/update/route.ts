import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { z } from "zod";

const updateEventSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(200, "Name darf maximal 200 Zeichen lang sein."),
  start_date: z.string().max(50).nullable().optional(),
  end_date: z.string().max(50).nullable().optional(),
  estimated_costs: z.number().nullable().optional(),
  phone_number_ids: z.array(z.string().uuid()).optional(),
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

    // ✅ Prüfe Subscription-Status (blockiert abgelaufene Trials)
    const subscriptionCheck = await checkSubscriptionAccess(user.id);
    if (!subscriptionCheck.allowed) {
      return subscriptionCheck.response;
    }

    const body = await request.json();
    const validated = updateEventSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { id, phone_number_ids, ...updateDataRaw } = validated.data;

    // Typisiere updateData für Supabase (ohne phone_number_ids)
    const updateData: {
      name: string;
      start_date?: string | null;
      end_date?: string | null;
      estimated_costs?: number | null;
    } = {
      name: updateDataRaw.name,
      start_date: updateDataRaw.start_date || null,
      end_date: updateDataRaw.end_date || null,
      estimated_costs: updateDataRaw.estimated_costs || null,
    };

    // Verify event belongs to user
    const { data: existingEvent } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingEvent) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Prüfe ob alle phone_number_ids dem User gehören (falls geändert)
    if (phone_number_ids !== undefined) {
      if (phone_number_ids.length > 0) {
        const { data: userSeats } = await supabase
          .from("phone_numbers")
          .select("id")
          .in("id", phone_number_ids)
          .eq("user_id", user.id);

        const userSeatsTyped = userSeats as { id: string }[] | null;
        const validSeatIds = userSeatsTyped?.map((s) => s.id) || [];

        if (validSeatIds.length !== phone_number_ids.length) {
          return NextResponse.json(
            { error: "Eine oder mehrere Telefonnummern gehören nicht zu deinem Account" },
            { status: 403 }
          );
        }
      }
    }

    const { error } = await ((supabase
      .from("events") as any)
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id));

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Aktualisiere Junction Table
    if (phone_number_ids !== undefined) {
      // 1. Hole aktuelle Zuordnungen
      const { data: currentAssignments } = await supabase
        .from("event_phone_numbers")
        .select("phone_number_id")
        .eq("event_id", id);

      const currentSeatIds = (currentAssignments as { phone_number_id: string }[] | null)
        ?.map((a) => a.phone_number_id) || [];
      
      const newSeatIds = phone_number_ids || [];
      
      // 2. Finde Seats zum Entfernen und Hinzufügen
      const seatsToRemove = currentSeatIds.filter((seatId) => !newSeatIds.includes(seatId));
      const seatsToAdd = newSeatIds.filter((seatId) => !currentSeatIds.includes(seatId));

      // 3. Entferne Zuordnungen
      if (seatsToRemove.length > 0) {
        await ((supabase.from("event_phone_numbers") as any)
          .delete()
          .eq("event_id", id)
          .in("phone_number_id", seatsToRemove));
      }

      // 4. Füge neue Zuordnungen hinzu
      if (seatsToAdd.length > 0) {
        const junctionEntries = seatsToAdd.map((phone_number_id) => ({
          event_id: id,
          phone_number_id,
        }));

        await ((supabase.from("event_phone_numbers") as any)
          .insert(junctionEntries));
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
