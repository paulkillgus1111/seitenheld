import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

const N8N_MORNING_MESSAGE_WEBHOOK_URL =
  process.env.N8N_MORNING_MESSAGE_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook/[WEBHOOK_1]";

// Test-Route - nur für lokale Entwicklung
// Kann später gelöscht werden oder mit Auth geschützt werden
export async function GET(request: Request) {
  // Nur in Development erlauben
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const supabase = await createSupabaseAdminClient();
  
  // Heute
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Finde Events die heute aktiv sind
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(`
      id,
      user_id,
      name,
      start_date,
      end_date,
      timezone,
      last_morning_message_date
    `)
    .not("start_date", "is", null);

  if (eventsError) {
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }

  if (!events || events.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No events today or all messages already sent",
      count: 0,
    });
  }

  const eventsTyped = events as Array<{
    id: string;
    user_id: string;
    name: string;
    start_date: string | null;
    end_date: string | null;
    timezone: string | null;
    last_morning_message_date: string | null;
  }> | null;

  if (!eventsTyped) {
    return NextResponse.json({
      success: true,
      message: "No events to process",
      count: 0,
    });
  }

  // Filtere Events die heute aktiv sind und heute noch keine Nachricht erhalten haben
  const eventsToSend = eventsTyped.filter((event) => {
    if (!event.start_date) return false;
    
    const startDate = new Date(event.start_date + "T00:00:00");
    const endDate = event.end_date ? new Date(event.end_date + "T23:59:59") : null;
    const today = new Date(todayStr + "T00:00:00");
    
    // Prüfe ob Event heute aktiv ist
    const isEventActiveToday = 
      today >= startDate && 
      (endDate === null || today <= endDate);
    
    if (!isEventActiveToday) return false;
    
    // Prüfe ob heute schon eine Nachricht gesendet wurde
    const messageSentToday = event.last_morning_message_date === todayStr;
    
    return !messageSentToday;
  });

  if (eventsToSend.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No events today or all messages already sent",
      count: 0,
    });
  }

  // Sende WhatsApp-Nachrichten
  const results = [];
  for (const event of eventsToSend) {
    // Hole ALLE Phone Numbers über Junction Table
    const { data: assignedPhoneNumbers } = await supabase
      .from("event_phone_numbers")
      .select(`
        phone_numbers:phone_number_id (
          phone_number,
          verified,
          is_active
        )
      `)
      .eq("event_id", event.id);

    const assignedPhoneNumbersTyped = assignedPhoneNumbers as Array<{
      phone_numbers: {
        phone_number: string;
        verified: boolean;
        is_active: boolean;
      } | null;
    }> | null;

    const phoneNumbersToNotify = (assignedPhoneNumbersTyped || [])
      .map((entry) => entry.phone_numbers)
      .filter((pn): pn is NonNullable<typeof pn> => 
        pn !== null && pn.verified && pn.is_active
      )
      .map((pn) => pn.phone_number);

    if (phoneNumbersToNotify.length === 0) {
      continue;
    }

    // Lade Profil des Event-Owners separat
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", event.user_id)
      .maybeSingle();

    const profileTyped = profile as { full_name: string | null; email: string | null } | null;
    const userName = profileTyped?.full_name || profileTyped?.email || "Nutzer";
    const eventName = event.name;

    // Sende an alle Nummern
    for (const phoneNumber of phoneNumbersToNotify) {
      try {
        const payload = {
          type: "morning_message",
          phone_number: phoneNumber,
          user_name: userName,
          event_name: eventName,
          event_date: event.start_date,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(N8N_MORNING_MESSAGE_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Seitenheld/1.0",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          await ((supabase
            .from("events") as any)
            .update({ last_morning_message_date: todayStr })
            .eq("id", event.id));

          results.push({ event_id: event.id, status: "sent" });
        } else {
          results.push({ event_id: event.id, status: "failed" });
        }
      } catch (error) {
        results.push({ event_id: event.id, status: "error" });
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `Processed ${eventsToSend.length} events`,
    results,
  });
}
