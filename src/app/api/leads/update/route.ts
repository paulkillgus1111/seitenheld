import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";
import { withRateLimit } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const updateLeadSchema = z.object({
  id: z.string().uuid(),
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

    // Rate Limiting: Spam-Schutz für Lead-Updates
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.leadUpdate,
      identifier: user.id,
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = updateLeadSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 }
      );
    }

    const { id, ...updateData } = validated.data;

    // Verify lead belongs to user's event
    const { data: lead } = await supabase
      .from("leads")
      .select("id, event_id, events!inner(user_id)")
      .eq("id", id)
      .maybeSingle();

    const leadTyped = lead as {
      id: string;
      event_id: string;
      events: { user_id: string };
    } | null;

    if (!leadTyped || leadTyped.events.user_id !== user.id) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("leads")
      .update(updateData as any)
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
