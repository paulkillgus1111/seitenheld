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
  phone_number_id: z.string().uuid("Telefonnummer ist erforderlich"),
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

    const { id, ...updateDataRaw } = validated.data;

    // Typisiere updateData für Supabase
    const updateData: {
      name: string;
      phone_number_id: string;
      start_date?: string | null;
      end_date?: string | null;
      estimated_costs?: number | null;
    } = {
      name: updateDataRaw.name,
      phone_number_id: updateDataRaw.phone_number_id,
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

    // Prüfe ob phone_number_id dem User gehört (falls geändert)
    if (updateData.phone_number_id) {
      const { data: phoneNumber } = await supabase
        .from("phone_numbers")
        .select("id, user_id")
        .eq("id", updateData.phone_number_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!phoneNumber) {
        return NextResponse.json(
          { error: "Telefonnummer nicht gefunden oder Zugriff verweigert" },
          { status: 404 }
        );
      }
    }

    const query = supabase
      .from("events")
      .update(updateData as any)
      .eq("id", id)
      .eq("user_id", user.id);
    
    const { error } = await (query as any);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
