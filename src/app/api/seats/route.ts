import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Hole alle Seats des Users mit zugeordneten Events
    const { data: seats, error } = await supabase
      .from("phone_numbers")
      .select(
        `
        id,
        phone_number,
        assigned_to_event_id,
        is_active,
        created_at,
        events:assigned_to_event_id (
          id,
          name
        )
      `
      )
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, seats: seats || [] });
  } catch (error) {
    console.error("Get seats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
