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

  // Finde Events die heute starten
  const { data: events, error: eventsError } = await supabase
    .from("events")
    .select(`
      id,
      name,
      start_date,
      timezone,
      phone_numbers:phone_number_id (
        phone_number,
        verified
      ),
      profiles:user_id (
        full_name,
        email
      )
    `)
    .eq("start_date", todayStr)
    .eq("morning_message_sent", false)
    .not("phone_number_id", "is", null);

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
    timezone: string | null;
    phone_numbers: Array<{ phone_number: string; verified: boolean }> | null;
    profiles: { full_name: string | null; email: string | null } | null;
  }> | null;

  if (!eventsTyped) {
    return NextResponse.json({
      success: true,
      message: "No events today or all messages already sent",
      count: 0,
    });
  }

  // Sende WhatsApp-Nachrichten
  const results = [];
  for (const event of eventsTyped) {
    const phoneNumber = (event.phone_numbers as any)?.[0];
    const profile = (event.profiles as any)?.[0];

    if (!phoneNumber?.verified || !phoneNumber?.phone_number) {
      continue;
    }

    const userName = profile?.full_name || profile?.email || "Nutzer";
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
        await supabase
          .from("events")
          .update({ morning_message_sent: true })
          .eq("id", event.id);

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
    message: `Processed ${events.length} events`,
    results,
  });
}
