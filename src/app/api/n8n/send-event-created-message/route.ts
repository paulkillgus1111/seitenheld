import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";
import { logger } from "@/lib/logger";

const N8N_EVENT_CREATED_WEBHOOK_URL =
  process.env.N8N_EVENT_CREATED_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook/[WEBHOOK_2]";

const eventCreatedSchema = z.object({
  event_id: z.string().uuid(),
  event_name: z.string(),
  phone_number: z.string(),
  user_name: z.string(),
});

export async function POST(request: Request) {
  try {
    logger.log("📥 [API] send-event-created-message called");
    
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      logger.error("❌ [API] Unauthorized - no user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.log("✅ [API] User authenticated:", { userId: user.id });

    const body = await request.json();
    logger.log("📦 [API] Request body:", body);
    
    const validated = eventCreatedSchema.safeParse(body);

    if (!validated.success) {
      logger.error("❌ [API] Validation failed:", validated.error.issues);
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    logger.log("✅ [API] Request validated:", validated.data);

    // Prüfe ob Event dem User gehört
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, user_id")
      .eq("id", validated.data.event_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (eventError) {
      logger.error("❌ [API] Error fetching event:", eventError);
    }

    if (!event) {
      logger.error("❌ [API] Event not found or access denied:", {
        event_id: validated.data.event_id,
        user_id: user.id,
      });
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    logger.log("✅ [API] Event found and belongs to user");

    // Sende WhatsApp über n8n
    const payload = {
      type: "event_created",
      phone_number: validated.data.phone_number,
      user_name: validated.data.user_name,
      event_name: validated.data.event_name,
      event_id: validated.data.event_id,
    };

    logger.log("📤 [API] Sending to n8n:", {
      url: N8N_EVENT_CREATED_WEBHOOK_URL,
      payload,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(N8N_EVENT_CREATED_WEBHOOK_URL, {
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

    const responseText = await response.text().catch(() => "");
    logger.log("📥 [API] n8n response:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      responseText: responseText.substring(0, 500),
    });

    if (!response.ok) {
      logger.error("❌ [API] n8n webhook error:", {
        status: response.status,
        statusText: response.statusText,
        responseText,
      });
      return NextResponse.json(
        { error: "Failed to send message", details: responseText },
        { status: 500 }
      );
    }

    logger.log("✅ [API] WhatsApp sent successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("❌ [API] Send event created message error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
