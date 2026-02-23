"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

interface LandingPageContentProps {
  user: User | null;
}

export function LandingPageContent({ user }: LandingPageContentProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    // Prüfe, ob Hash-Parameter vorhanden sind (z.B. Recovery-Token)
    // Wenn ja, NICHT weiterleiten - die PasswordResetRedirect-Komponente übernimmt
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const hasRecoveryToken = hashParams.get("type") === "recovery" && hashParams.get("access_token");

    // Wenn Recovery-Token vorhanden, NICHT weiterleiten
    if (hasRecoveryToken) {
      return;
    }

    // Wenn User existiert und KEIN Recovery-Token, dann weiterleiten
    if (user) {
      // Prüfe Profil asynchron
      const checkProfile = async () => {
        // Prüfe ob verifizierter Seat existiert (NEUE Logik)
        const { data: phoneNumber } = await supabase
          .from("phone_numbers")
          .select("id, verified")
          .eq("user_id", user.id)
          .eq("verified", true)
          .maybeSingle();

        const phoneNumberTyped = phoneNumber as {
          id: string;
          verified: boolean;
        } | null;

        if (phoneNumberTyped?.verified) {
          router.replace("/dashboard");
        } else {
          router.replace("/onboarding");
        }
      };

      checkProfile();
    }
  }, [user, router, supabase]);

  return (
    <main className="flex w-full max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="mb-8 flex flex-col items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-black dark:bg-white" />
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Seitenheld
        </h1>
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          Messe-Leads via WhatsApp
        </p>
      </div>
      <Card className="w-full border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Willkommen</CardTitle>
        </CardHeader>
        <CardContent>
          <AuthForm />
        </CardContent>
      </Card>
    </main>
  );
}
