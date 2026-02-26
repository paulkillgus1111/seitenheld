import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase-server";

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

    const supabase = await createSupabaseAdminClient();
    
    // Aktuelle UTC-Zeit
    const now = new Date();

    // Finde alle Events mit start_date
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
      user_id: string;
      name: string;
      start_date: string | null;
      end_date: string | null;
      timezone: string | null;
      last_morning_message_date: string | null;
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
      // Hole ALLE Phone Numbers über Junction Table
      const { data: assignedPhoneNumbers, error: phoneError } = await supabase
        .from("event_phone_numbers")
        .select(`
          phone_numbers:phone_number_id (
            phone_number,
            verified,
            user_id,
            is_active
          )
        `)
        .eq("event_id", event.id);

      if (phoneError) {
        console.error(`Error fetching phone numbers for event ${event.id}:`, phoneError);
        continue;
      }

      const assignedPhoneNumbersTyped = assignedPhoneNumbers as Array<{
        phone_numbers: {
          phone_number: string;
          verified: boolean;
          user_id: string;
          is_active: boolean;
        } | null;
      }> | null;

      // Filtere verifizierte und aktive Nummern
      const phoneNumbersToNotify = (assignedPhoneNumbersTyped || [])
        .map((entry) => entry.phone_numbers)
        .filter((pn): pn is NonNullable<typeof pn> => 
          pn !== null && pn.verified && pn.is_active
        )
        .map((pn) => pn.phone_number);

      if (phoneNumbersToNotify.length === 0) {
        continue; // Keine verifizierten Seats zugeordnet
      }

      // Lade Profil des Event-Owners (einmal für alle Nachrichten)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", event.user_id)
        .maybeSingle();

      const profileTyped = profile as { full_name: string | null; email: string | null } | null;
      const userName = profileTyped?.full_name || profileTyped?.email || "Nutzer";
      const eventName = event.name;

      // Sende Nachricht an ALLE Nummern
      let allSent = true;
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

          if (!response.ok) {
            console.error(`Failed to send morning message to ${phoneNumber} for event ${event.id}`);
            allSent = false;
          }
        } catch (error) {
          console.error(`Error sending message to ${phoneNumber} for event ${event.id}:`, error);
          allSent = false;
        }
      }

      // Markiere als gesendet nur wenn ALLE Nachrichten erfolgreich waren
      if (allSent) {
        await ((supabase
          .from("events") as any)
          .update({ last_morning_message_date: todayStr })
          .eq("id", event.id));

        results.push({ 
          event_id: event.id, 
          status: "sent", 
          phone_numbers_count: phoneNumbersToNotify.length 
        });
      } else {
        results.push({ 
          event_id: event.id, 
          status: "partial_failed", 
          phone_numbers_count: phoneNumbersToNotify.length 
        });
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
