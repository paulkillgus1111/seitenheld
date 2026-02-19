import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const requestVerificationSchema = z.object({
  phone_number_id: z.string().uuid(),
});

const N8N_VERIFICATION_WEBHOOK_URL =
  process.env.N8N_VERIFICATION_WEBHOOK_URL ||
  "https://seitenheld.app.n8n.cloud/webhook/96538d91-730e-43d6-b458-5abcd16d662a";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limiting: Maximal 3 Anfragen pro Stunde
    const rateLimitResult = await withRateLimit(request, {
      config: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 pro Stunde
      identifier: user.id,
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = requestVerificationSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Lade Telefonnummer und prüfe Ownership
    const { data: phoneNumber, error: fetchError } = await supabase
      .from("phone_numbers")
      .select(
        "id, phone_number, verified, verification_code_expires_at, verification_attempts, last_verification_request_at"
      )
      .eq("id", validated.data.phone_number_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError || !phoneNumber) {
      return NextResponse.json(
        { error: "Phone number not found" },
        { status: 404 }
      );
    }

    const phoneNumberTyped = phoneNumber as {
      id: string;
      phone_number: string;
      verified: boolean;
      verification_code_expires_at: string | null;
      verification_attempts: number;
      last_verification_request_at: string | null;
    };

    // Prüfe ob bereits verifiziert
    if (phoneNumberTyped.verified) {
      return NextResponse.json(
        { error: "Phone number already verified" },
        { status: 400 }
      );
    }

    // Prüfe Rate Limiting: Maximal 5 Versuche pro Stunde
    const oneHourAgo = new Date(Date.now() - 3600000);
    const lastRequest = phoneNumberTyped.last_verification_request_at
      ? new Date(phoneNumberTyped.last_verification_request_at)
      : null;

    if (
      lastRequest &&
      lastRequest > oneHourAgo &&
      phoneNumberTyped.verification_attempts >= 5
    ) {
      const retryAfter = Math.ceil(
        (lastRequest.getTime() + 3600000 - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          error:
            "Zu viele Verifizierungsversuche. Bitte versuche es in einer Stunde erneut.",
          retryAfter,
        },
        { status: 429 }
      );
    }

    // Generiere neuen Code (6-stellig)
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 Minuten

    // Speichere Code in Datenbank (NOCH OHNE verification_attempts Update)
    const { error: updateError } = await ((supabase
      .from("phone_numbers") as any)
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt.toISOString(),
        // NICHT: last_verification_request_at und verification_attempts hier updaten
      })
      .eq("id", validated.data.phone_number_id));

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to generate verification code" },
        { status: 500 }
      );
    }

    // Sende WhatsApp über n8n
    try {
      // Lade User-Profil für Namen
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const userName = profile?.full_name || user.email || "Nutzer";

      // Sende an n8n Webhook für WhatsApp
      const n8nPayload = {
        type: "phone_verification",
        phone_number: phoneNumberTyped.phone_number,
        verification_code: verificationCode,
        user_name: userName,
        expires_in_minutes: 10,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const n8nResponse = await fetch(N8N_VERIFICATION_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "Seitenheld/1.0",
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text().catch(() => "");
        console.error("n8n verification webhook error:", {
          status: n8nResponse.status,
          statusText: n8nResponse.statusText,
          responseText: errorText.substring(0, 500),
        });
        // WhatsApp-Versand fehlgeschlagen - KEINE Attempts zählen
        return NextResponse.json({
          success: false,
          error: "WhatsApp-Versand fehlgeschlagen. Bitte versuche es erneut.",
        }, { status: 500 });
      }

      // ✅ WhatsApp-Versand erfolgreich - JETZT Attempts zählen
      const { error: attemptUpdateError } = await ((supabase
        .from("phone_numbers") as any)
        .update({
          last_verification_request_at: new Date().toISOString(),
          verification_attempts: (phoneNumberTyped.verification_attempts || 0) + 1,
        })
        .eq("id", validated.data.phone_number_id));

      if (attemptUpdateError) {
        console.error("Failed to update verification attempts:", attemptUpdateError);
        // Fehler beim Update, aber WhatsApp wurde gesendet - trotzdem Erfolg zurückgeben
      }

      return NextResponse.json({
        success: true,
        message: "Verifizierungscode wurde per WhatsApp gesendet",
        expires_at: expiresAt.toISOString(),
      });
    } catch (n8nError) {
      console.error("n8n WhatsApp error:", n8nError);
      // WhatsApp-Versand fehlgeschlagen - KEINE Attempts zählen
      return NextResponse.json({
        success: false,
        error: "WhatsApp-Versand fehlgeschlagen. Bitte versuche es erneut.",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Request verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
