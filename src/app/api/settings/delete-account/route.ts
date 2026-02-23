import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    // Prüfe Authentifizierung mit normalem Client
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verwende Admin Client für alle Operationen (benötigt Service Role Key)
    const adminSupabase = await createSupabaseAdminClient();

    // Lösche alle abhängigen Daten in der richtigen Reihenfolge
    // WICHTIG: Events müssen zuerst gelöscht werden, da phone_number_id ON DELETE RESTRICT hat

    // 1. Lösche Events (cascadiert zu Leads, etc.)
    const { error: eventsError } = await (adminSupabase
      .from("events") as any)
      .delete()
      .eq("user_id", user.id);

    if (eventsError) {
      console.error("Error deleting events:", eventsError);
      // Weiter versuchen, auch wenn Events-Löschung fehlschlägt
    }

    // 2. Lösche Phone Numbers (nach Events, da Events auf phone_numbers verweisen)
    const { error: phoneError } = await (adminSupabase
      .from("phone_numbers") as any)
      .delete()
      .eq("user_id", user.id);

    if (phoneError) {
      console.error("Error deleting phone numbers:", phoneError);
    }

    // 3. Lösche Mail Templates
    const { error: templatesError } = await (adminSupabase
      .from("mail_templates") as any)
      .delete()
      .eq("user_id", user.id);

    if (templatesError) {
      console.error("Error deleting mail templates:", templatesError);
    }

    // 4. Lösche Integrations
    const { error: integrationsError } = await (adminSupabase
      .from("integrations") as any)
      .delete()
      .eq("user_id", user.id);

    if (integrationsError) {
      console.error("Error deleting integrations:", integrationsError);
    }

    // 5. Lösche User Settings
    const { error: settingsError } = await (adminSupabase
      .from("user_settings") as any)
      .delete()
      .eq("user_id", user.id);

    if (settingsError) {
      console.error("Error deleting user settings:", settingsError);
    }

    // 6. Lösche Sent Emails
    const { error: sentEmailsError } = await (adminSupabase
      .from("sent_emails") as any)
      .delete()
      .eq("user_id", user.id);

    if (sentEmailsError) {
      console.error("Error deleting sent emails:", sentEmailsError);
    }

    // 7. Lösche Profile (wird durch CASCADE automatisch gelöscht, aber sicherheitshalber)
    const { error: profileError } = await (adminSupabase
      .from("profiles") as any)
      .delete()
      .eq("id", user.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // 8. Lösche User Account (Auth) - zuletzt
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete account" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in delete-account route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
