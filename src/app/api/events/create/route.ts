import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const createEventSchema = z.object({
  name: z.string().min(2, "Bitte einen Namen angeben.").max(200, "Name darf maximal 200 Zeichen lang sein."),
  start_date: z.string().max(50).nullable().optional(),
  end_date: z.string().max(50).nullable().optional(),
  estimated_costs: z.number().nullable().optional(),
  phone_number_id: z.string().uuid("Bitte wähle eine Telefonnummer aus."),
  timezone: z.string().default("Europe/Berlin"),
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

    // Rate Limiting: Spam-Schutz für Event-Erstellung
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.eventCreate,
      identifier: user.id,
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = createEventSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Prüfe ob phone_number_id dem User gehört
    const { data: phoneNumber } = await supabase
      .from("phone_numbers")
      .select("id, user_id")
      .eq("id", validated.data.phone_number_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: "Telefonnummer nicht gefunden oder Zugriff verweigert" },
        { status: 404 }
      );
    }

    // Prüfe LTD Event-Limit (wird durch Datenbank-Trigger geprüft, aber hier als Fallback)
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_type, ltd_events_used")
      .eq("id", user.id)
      .maybeSingle();

    const profileTyped = profile as {
      plan_type: string | null;
      ltd_events_used: number | null;
    } | null;

    if (profileTyped?.plan_type === "ltd" && (profileTyped.ltd_events_used ?? 0) >= 50) {
      return NextResponse.json(
        {
          error: "Event-Limit erreicht",
          details: "Du hast das maximale Limit von 50 Events für LTD-User erreicht.",
          maxEvents: 50,
          currentEvents: profileTyped.ltd_events_used ?? 0,
        },
        { status: 403 }
      );
    }

    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({
        user_id: user.id,
        name: validated.data.name,
        start_date: validated.data.start_date || null,
        end_date: validated.data.end_date || null,
        estimated_costs: validated.data.estimated_costs || null,
        phone_number_id: validated.data.phone_number_id,
        timezone: validated.data.timezone || "Europe/Berlin",
        morning_message_sent: false,
      } as any)
      .select()
      .single();

    if (insertError) {
      // Prüfe ob es ein LTD-Limit-Fehler ist
      if (insertError.message.includes("LTD Event limit reached")) {
        return NextResponse.json(
          {
            error: "Event-Limit erreicht",
            details: "Du hast das maximale Limit von 50 Events für LTD-User erreicht.",
            maxEvents: 50,
          },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
