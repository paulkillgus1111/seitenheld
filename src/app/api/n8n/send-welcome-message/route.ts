import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { z } from "zod";

const N8N_WELCOME_WEBHOOK_URL =
  process.env.N8N_WELCOME_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook/[WEBHOOK_3]";

const welcomeMessageSchema = z.object({
  phone_number: z.string(),
  user_name: z.string(),
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

    const body = await request.json();
    const validated = welcomeMessageSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    // Prüfe ob Telefonnummer dem User gehört und verifiziert ist
    const { data: phoneNumber } = await supabase
      .from("phone_numbers")
      .select("id, verified")
      .eq("phone_number", validated.data.phone_number)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!phoneNumber || !phoneNumber.verified) {
      return NextResponse.json(
        { error: "Phone number not found or not verified" },
        { status: 404 }
      );
    }

    // Sende WhatsApp über n8n
    const payload = {
      type: "welcome_message",
      phone_number: validated.data.phone_number,
      user_name: validated.data.user_name,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(N8N_WELCOME_WEBHOOK_URL, {
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
      console.error("n8n welcome webhook error:", response.status);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Send welcome message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
