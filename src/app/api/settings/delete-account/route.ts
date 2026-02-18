import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Delete user account (this will cascade delete related data via foreign keys)
    const { error } = await supabase.auth.admin.deleteUser(session.user.id);

    if (error) {
      // If admin API is not available, use regular delete
      return NextResponse.json(
        { error: "Account deletion requires admin privileges" },
        { status: 403 }
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
