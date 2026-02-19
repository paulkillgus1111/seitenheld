import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email_on_lead, weekly_summary, crm_sync_reports } = body;

    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await supabase.from("user_settings").upsert({
      user_id: session.user.id,
      email_on_lead: email_on_lead ?? false,
      weekly_summary: weekly_summary ?? false,
      crm_sync_reports: crm_sync_reports ?? false,
    } as any);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
