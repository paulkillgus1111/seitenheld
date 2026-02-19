import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { z } from "zod";

const updateSeatSchema = z.object({
  phone_number: z
    .string()
    .min(1, "Telefonnummer ist erforderlich")
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      "Ungültiges Telefonnummer-Format. Verwende z.B. +49 151 23456789"
    )
    .optional(),
  assigned_to_event_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const validated = updateSeatSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Prüfe ob Seat dem User gehört
    const { data: seat } = await supabase
      .from("phone_numbers")
      .select("id, user_id, phone_number")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seat) {
      return NextResponse.json(
        { error: "Seat not found or access denied" },
        { status: 404 }
      );
    }

    const seatTyped = seat as { phone_number: string };

    // Prüfe ob neue Telefonnummer bereits existiert (wenn geändert)
    if (validated.data.phone_number) {
      const { data: existingSeat } = await supabase
        .from("phone_numbers")
        .select("id")
        .eq("phone_number", validated.data.phone_number)
        .neq("id", id)
        .maybeSingle();

      if (existingSeat) {
        return NextResponse.json(
          {
            error: "Telefonnummer bereits vorhanden",
            details: "Diese Telefonnummer wird bereits von einem anderen Seat verwendet.",
          },
          { status: 409 }
        );
      }
    }

    // Prüfe ob Event dem User gehört (falls zugeordnet)
    if (validated.data.assigned_to_event_id !== undefined) {
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
    }

    // Update Seat
    const updateData: Record<string, unknown> = {};
    if (validated.data.phone_number !== undefined) {
      updateData.phone_number = validated.data.phone_number;
      // Wenn Telefonnummer geändert wurde, Verifizierung zurücksetzen
      if (validated.data.phone_number !== seatTyped.phone_number) {
        updateData.verified = false;
        updateData.verification_code = null;
        updateData.verification_code_expires_at = null;
        updateData.verification_attempts = 0;
      }
    }
    if (validated.data.assigned_to_event_id !== undefined) {
      updateData.assigned_to_event_id = validated.data.assigned_to_event_id;
    }
    if (validated.data.is_active !== undefined) {
      updateData.is_active = validated.data.is_active;
    }

    const { data: updatedSeat, error } = await ((supabase
      .from("phone_numbers") as any)
      .update(updateData)
      .eq("id", id)
      .select()
      .single());

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, seat: updatedSeat });
  } catch (error) {
    console.error("Update seat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Prüfe ob Seat dem User gehört
    const { data: seat } = await supabase
      .from("phone_numbers")
      .select("id, user_id, assigned_to_event_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!seat) {
      return NextResponse.json(
        { error: "Seat not found or access denied" },
        { status: 404 }
      );
    }

    // Prüfe ob Seat einem Event zugeordnet ist
    const seatTyped = seat as {
      assigned_to_event_id: string | null;
    };

    if (seatTyped.assigned_to_event_id) {
      // Optional: Setze is_active auf false statt zu löschen
      const { error } = await ((supabase
        .from("phone_numbers") as any)
        .update({ is_active: false })
        .eq("id", id));

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Seat wurde deaktiviert (war einem Event zugeordnet)",
      });
    }

    // Lösche Seat wenn kein Event zugeordnet ist
    const { error } = await supabase
      .from("phone_numbers")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete seat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
