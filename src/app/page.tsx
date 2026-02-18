import { AuthForm } from "@/components/auth/auth-form";
import { PasswordResetRedirect } from "@/components/auth/password-reset-redirect";
import { LandingPageContent } from "@/components/auth/landing-page-content";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function LandingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // WICHTIG: Weiterleitung nur, wenn User existiert UND keine Hash-Parameter vorhanden sind
  // Hash-Parameter können nur client-seitig geprüft werden, daher prüfen wir das in der Client-Komponente
  // Die LandingPageContent-Komponente prüft client-seitig, ob Hash-Parameter vorhanden sind,
  // bevor sie weiterleitet
  
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <PasswordResetRedirect />
      <LandingPageContent user={user} />
    </div>
  );
}
