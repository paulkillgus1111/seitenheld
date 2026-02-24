import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const N8N_MORNING_MESSAGE_WEBHOOK_URL =
  process.env.N8N_MORNING_MESSAGE_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook/[WEBHOOK_1]";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Prüfe Cron-Secret (Sicherheit) - nur in Production
    if (process.env.NODE_ENV === "production") {
      if (!CRON_SECRET) {
        console.error("CRON_SECRET not set in production");
        return NextResponse.json(
          { error: "Server configuration error" },
          { status: 500 }
        );
      }

      // Vercel sendet x-vercel-cron-auth Header automatisch
      const vercelCronAuth = request.headers.get("x-vercel-cron-auth");
      // Fallback für manuelle Tests mit authorization Header
      const authHeader = request.headers.get("authorization");

      // Unterstütze beide: Vercel's x-vercel-cron-auth und manuellen authorization Header
      if (vercelCronAuth !== CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
        console.error("Cron auth failed", {
          has_vercel_header: !!vercelCronAuth,
          has_auth_header: !!authHeader,
          cron_secret_set: !!CRON_SECRET,
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = await createSupabaseServerClient();
    
    // Aktuelle UTC-Zeit
    const now = new Date();

    // Finde alle Events mit start_date, end_date und phone_number
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
      console.error("Error fetching events:", eventsError);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No events to process",
        count: 0,
      });
    }

    // Prüfe für jedes Event, ob es heute aktiv ist und 6 Uhr in dessen Zeitzone ist
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
    
    const eventsToSend: typeof eventsTyped = [];
    
    if (!eventsTyped) {
      return NextResponse.json({
        success: true,
        message: "No events to process",
        count: 0,
      });
    }
    
    // Heute als Date-String (YYYY-MM-DD) für Vergleich
    const todayStr = now.toISOString().split("T")[0];
    
    for (const event of eventsTyped) {
      const eventTimezone = event.timezone || "Europe/Berlin"; // Fallback
      const eventStartDate = event.start_date;
      const eventEndDate = event.end_date;
      
      if (!eventStartDate) continue;

      try {
        // Prüfe ob Event heute aktiv ist (heute >= start_date && heute <= end_date)
        const startDate = new Date(eventStartDate + "T00:00:00");
        const endDate = eventEndDate ? new Date(eventEndDate + "T23:59:59") : null;
        const today = new Date(todayStr + "T00:00:00");
        
        const isEventActiveToday = 
          today >= startDate && 
          (endDate === null || today <= endDate);
        
        if (!isEventActiveToday) continue;
        
        // Prüfe ob heute schon eine Nachricht gesendet wurde
        const lastMessageDate = event.last_morning_message_date;
        const messageSentToday = lastMessageDate === todayStr;
        
        if (messageSentToday) continue; // Heute schon gesendet
        
        // Prüfe ob es 6 Uhr in der Event-Zeitzone ist
        const currentHourInTimezone = parseInt(
          now.toLocaleString("en-US", {
            timeZone: eventTimezone,
            hour: "numeric",
            hour12: false,
          })
        );
        
        if (currentHourInTimezone === 6) {
          eventsToSend.push(event);
        }
      } catch (timezoneError) {
        console.error(`Error processing timezone for event ${event.id}:`, timezoneError);
        // Bei Fehler: Überspringe Event
        continue;
      }
    }

    if (eventsToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No events at 6 AM in their timezone right now",
        count: 0,
      });
    }

    // Sende WhatsApp-Nachrichten
    const results = [];
    for (const event of eventsToSend) {
      const phoneNumber = (event.phone_numbers as any)?.[0];
      const profile = (event.profiles as any)?.[0];

      if (!phoneNumber?.verified || !phoneNumber?.phone_number) {
        continue; // Überspringe nicht verifizierte Telefonnummern
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
          // Markiere als gesendet (heute)
          await ((supabase
            .from("events") as any)
            .update({ last_morning_message_date: todayStr })
            .eq("id", event.id));

          results.push({ event_id: event.id, status: "sent" });
        } else {
          results.push({ event_id: event.id, status: "failed" });
        }
      } catch (error) {
        console.error(`Error sending message for event ${event.id}:`, error);
        results.push({ event_id: event.id, status: "error" });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${eventsToSend.length} events`,
      results,
    });
  } catch (error) {
    console.error("Morning messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
