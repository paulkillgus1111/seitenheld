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
        { error: "Invalid request data", details: validated.error.errors },
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

    if (phoneNumber.verified) {
      return NextResponse.json(
        { error: "Phone number already verified" },
        { status: 400 }
      );
    }

    // Prüfe ob Code abgelaufen
    if (
      !phoneNumber.verification_code ||
      !phoneNumber.verification_code_expires_at
    ) {
      return NextResponse.json(
        {
          error:
            "No verification code found. Please request a new code.",
        },
        { status: 400 }
      );
    }

    const expiresAt = new Date(phoneNumber.verification_code_expires_at);
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
    if (phoneNumber.verification_code !== validated.data.code) {
      // Erhöhe Versuche
      await supabase
        .from("phone_numbers")
        .update({
          verification_attempts: (phoneNumber.verification_attempts || 0) + 1,
        })
        .eq("id", validated.data.phone_number_id);

      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Code ist korrekt - verifiziere Telefonnummer
    const { error: verifyError } = await supabase
      .from("phone_numbers")
      .update({
        verified: true,
        verification_code: null, // Lösche Code nach Verifizierung
        verification_code_expires_at: null,
        verification_attempts: 0,
      })
      .eq("id", validated.data.phone_number_id);

    if (verifyError) {
      return NextResponse.json(
        { error: "Failed to verify phone number" },
        { status: 500 }
      );
    }

    // ✅ Sende Welcome-Nachricht nach erfolgreicher Verifizierung
    try {
      const { data: phoneNumberData } = await supabase
        .from("phone_numbers")
        .select("phone_number")
        .eq("id", validated.data.phone_number_id)
        .single();

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (phoneNumberData?.phone_number) {
        const userName = profile?.full_name || user.email || "Nutzer";

        // Sende Welcome-Nachricht (nicht-blockierend)
        fetch("/api/n8n/send-welcome-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number: phoneNumberData.phone_number,
            user_name: userName,
          }),
        }).catch((error) => {
          console.error("Error sending welcome message:", error);
          // Nicht kritisch - Verifizierung war erfolgreich
        });
      }
    } catch (welcomeError) {
      console.error("Welcome message error:", welcomeError);
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
