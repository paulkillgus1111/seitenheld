import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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

  const supabase = await createSupabaseServerClient();
  
  // Heute
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Finde Events die heute aktiv sind
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(`
      id,
      name,
      start_date,
      end_date,
      timezone,
      last_morning_message_date,
      phone_numbers:phone_number_id (
        phone_number,
        verified
      ),
      profiles:user_id (
        full_name,
        email
      )
    `)
    .not("phone_number_id", "is", null)
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
    name: string;
    start_date: string | null;
    end_date: string | null;
    timezone: string | null;
    last_morning_message_date: string | null;
    phone_numbers: Array<{ phone_number: string; verified: boolean }> | null;
    profiles: { full_name: string | null; email: string | null } | null;
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
    const phoneNumber = (event.phone_numbers as any)?.[0];
    const profile = (event.profiles as any)?.[0];

    if (!phoneNumber?.verified || !phoneNumber?.phone_number) {
      continue;
    }

    const profileTyped = profile as { full_name: string | null; email: string | null } | null;
    const userName = profileTyped?.full_name || profileTyped?.email || "Nutzer";
    const eventName = event.name;

    try {
      const payload = {
        type: "morning_message",
        phone_number: phoneNumber.phone_number,
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

  return NextResponse.json({
    success: true,
    message: `Processed ${eventsToSend.length} events`,
    results,
  });
}
