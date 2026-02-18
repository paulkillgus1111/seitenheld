import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { checkSubscriptionAccess } from "@/lib/subscription-check";

export async function GET() {
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

    const { data: events, error } = await supabase
      .from("events")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, events: events || [] });
  } catch (error) {
    console.error("Get events error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
