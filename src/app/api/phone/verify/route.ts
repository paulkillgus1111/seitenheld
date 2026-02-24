import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const verifyCodeSchema = z.object({
  phone_number_id: z.string().uuid(),
  code: z.string().length(6, "Code muss 6-stellig sein"),
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

    // Rate Limiting: Brute-Force-Schutz für Code-Verifizierung
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.phoneVerify,
      identifier: user.id,
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = verifyCodeSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    // Lade Telefonnummer
    const { data: phoneNumber, error: fetchError } = await supabase
      .from("phone_numbers")
      .select(
        "id, verification_code, verification_code_expires_at, verification_attempts, verified"
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
      verification_code: string | null;
      verification_code_expires_at: string | null;
      verification_attempts: number;
      verified: boolean;
    };

    if (phoneNumberTyped.verified) {
      return NextResponse.json(
        { error: "Phone number already verified" },
        { status: 400 }
      );
    }

    // Prüfe ob Code abgelaufen
    if (
      !phoneNumberTyped.verification_code ||
      !phoneNumberTyped.verification_code_expires_at
    ) {
      return NextResponse.json(
        {
          error:
            "No verification code found. Please request a new code.",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(phoneNumberTyped.verification_code_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        {
          error:
            "Verification code expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Prüfe Code
    if (phoneNumberTyped.verification_code !== validated.data.code) {
      // Erhöhe Versuche
      await ((supabase
        .from("phone_numbers") as any)
        .update({
          verification_attempts: (phoneNumberTyped.verification_attempts || 0) + 1,
        })
        .eq("id", validated.data.phone_number_id));

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Code ist korrekt - verifiziere Telefonnummer
    const { error: verifyError } = await ((supabase
      .from("phone_numbers") as any)
      .update({
        verified: true,
        verification_code: null, // Lösche Code nach Verifizierung
        verification_code_expires_at: null,
        verification_attempts: 0,
      })
      .eq("id", validated.data.phone_number_id));

    if (verifyError) {
      return NextResponse.json(
        { error: "Failed to verify phone number" },
        { status: 500 }
      );
    }

    // ✅ Sende Welcome-Nachricht nach erfolgreicher Verifizierung
    console.log("🔍 [WELCOME] Starting welcome message flow", {
      phone_number_id: validated.data.phone_number_id,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    });

    try {
      const { data: phoneNumberData } = await supabase
        .from("phone_numbers")
        .select("phone_number")
        .eq("id", validated.data.phone_number_id)
        .single();

      const phoneNumberDataTyped = phoneNumberData as { phone_number: string } | null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      const profileTyped = profile as { full_name: string | null } | null;

      console.log("🔍 [WELCOME] Data loaded", {
        has_phone_number: !!phoneNumberDataTyped?.phone_number,
        has_full_name: !!profileTyped?.full_name,
        has_email: !!user.email,
      });

      if (phoneNumberDataTyped?.phone_number) {
        const userName = profileTyped?.full_name || user.email || "Nutzer";

        // Sende Welcome-Nachricht direkt an n8n Webhook (nicht über API Route)
        const N8N_WELCOME_WEBHOOK_URL =
          process.env.N8N_WELCOME_WEBHOOK_URL ||
          "https://seitenheld.app.n8n.cloud/webhook/[WEBHOOK_3]";

        const webhookUrlIsDefault = N8N_WELCOME_WEBHOOK_URL.includes("[WEBHOOK_3]");

        console.log("📤 [WELCOME] Preparing webhook call", {
          webhook_url_set: !!process.env.N8N_WELCOME_WEBHOOK_URL,
          webhook_url_is_default: webhookUrlIsDefault,
          has_user_name: !!userName,
        });

        if (webhookUrlIsDefault) {
          console.error("❌ [WELCOME] N8N_WELCOME_WEBHOOK_URL not set, using default placeholder");
        }

        const payload = {
          type: "welcome_message",
          phone_number: phoneNumberDataTyped.phone_number,
          user_name: userName,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        // Rufe n8n Webhook direkt auf (nicht-blockierend)
        fetch(N8N_WELCOME_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "User-Agent": "Seitenheld/1.0",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
          .then((response) => {
            clearTimeout(timeoutId);
            console.log("📥 [WELCOME] Webhook response", {
              status: response.status,
              ok: response.ok,
              statusText: response.statusText,
            });
            if (!response.ok) {
              console.error("❌ [WELCOME] n8n welcome webhook error:", response.status);
            } else {
              console.log("✅ [WELCOME] Welcome message sent successfully");
            }
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            console.error("❌ [WELCOME] Error sending welcome message:", {
              error_name: error.name,
              error_message: error.message,
            });
            // Nicht kritisch - Verifizierung war erfolgreich
          });
      } else {
        console.warn("⚠️ [WELCOME] Phone number not found, skipping welcome message");
      }
    } catch (welcomeError) {
      console.error("❌ [WELCOME] Welcome message error:", {
        error_name: welcomeError instanceof Error ? welcomeError.name : "Unknown",
        error_message: welcomeError instanceof Error ? welcomeError.message : String(welcomeError),
      });
      // Nicht kritisch
    }

    return NextResponse.json({
      success: true,
      message: "Telefonnummer erfolgreich verifiziert",
    });
  } catch (error) {
    console.error("Verify code error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
