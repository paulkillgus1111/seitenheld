import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { startTrialOnFirstLead } from "@/lib/trial-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const createLeadSchema = z.object({
  event_id: z.string().uuid(),
  vorname: z.string().max(100).nullable().optional(),
  nachname: z.string().max(100).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  firma: z.string().max(200).nullable().optional(),
  telefon: z.string().max(50).nullable().optional(),
  zusammenfassung: z.string().max(5000).nullable().optional(),
  potential: z.enum(["Hoch", "Medium", "Niedrig"]).nullable().optional(),
  jobtitel: z.string().max(200).nullable().optional(),
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

    // ✅ Prüfe Subscription-Status (blockiert abgelaufene Trials)
    const subscriptionCheck = await checkSubscriptionAccess(user.id);
    if (!subscriptionCheck.allowed) {
      return subscriptionCheck.response;
    }

    // Rate Limiting: Spam-Schutz für Lead-Erstellung
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.leadCreate,
      identifier: user.id, // User-ID für user-basierte Limits
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = createLeadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.errors },
        { status: 400 }
      );
    }

    const { event_id, ...leadData } = validated.data;

    // Verify event belongs to user
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", event_id)
      .eq("user_id", user.id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or access denied" },
        { status: 404 }
      );
    }

    // Check if email already exists (if provided)
    if (leadData.email) {
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id")
        .eq("email", leadData.email)
        .is("deleted_at", null)
        .single();

      if (existingLead) {
        return NextResponse.json(
          { error: "Ein Lead mit dieser E-Mail-Adresse existiert bereits" },
          { status: 409 }
        );
      }
    }

    // Prüfe ob dies der erste Lead ist (VOR dem Insert)
    const { data: userEvents } = await supabase
      .from("events")
      .select("id")
      .eq("user_id", user.id);

    let isFirstLead = false;
    let totalLeadCount = 0;
    
    if (userEvents && userEvents.length > 0) {
      const eventIds = userEvents.map((e) => e.id);
      const { count: existingLeadCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .in("event_id", eventIds)
        .is("deleted_at", null); // Nur nicht-gelöschte Leads zählen

      totalLeadCount = existingLeadCount || 0;
      isFirstLead = totalLeadCount === 0;
    } else {
      isFirstLead = true; // Keine Events = definitiv erster Lead
      totalLeadCount = 0;
    }

    // ✅ Prüfe maximales Lead-Limit (10.000 pro User)
    const MAX_LEADS_PER_USER = 10000;
    if (totalLeadCount >= MAX_LEADS_PER_USER) {
      return NextResponse.json(
        {
          error: "Lead-Limit erreicht",
          details: `Du hast das maximale Limit von ${MAX_LEADS_PER_USER} Leads erreicht. Bitte lösche alte Leads oder kontaktiere den Support.`,
          maxLeads: MAX_LEADS_PER_USER,
          currentLeads: totalLeadCount,
        },
        { status: 403 }
      );
    }

    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        event_id,
        ...leadData,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Starte Trial beim ersten Lead (wenn noch nicht gestartet)
    if (isFirstLead) {
      try {
        await startTrialOnFirstLead(user.id);
      } catch (trialError) {
        // Trial-Fehler nicht kritisch, nur loggen
        console.log("Trial start error (non-critical):", trialError);
      }
    }

    return NextResponse.json({ success: true, lead: newLead });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
