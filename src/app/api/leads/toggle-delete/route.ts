import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";

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

    const body = await request.json();
    const { id, deleted } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Lead ID is required" },
        { status: 400 }
      );
    }

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
      .update({
        deleted_at: deleted ? new Date().toISOString() : null,
      } as any)
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
