"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";

// Complex password validation (same as auth-form)
const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen erforderlich.")
  .max(64, "Maximal 64 Zeichen erlaubt.")
  .regex(/[A-Z]/, "Mindestens ein Großbuchstabe erforderlich.")
  .regex(/[a-z]/, "Mindestens ein Kleinbuchstabe erforderlich.")
  .regex(/[0-9]/, "Mindestens eine Zahl erforderlich.")
  .regex(/[^A-Za-z0-9]/, "Mindestens ein Sonderzeichen erforderlich.");

const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwörter stimmen nicht überein.",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Check if we have a valid reset token in the URL
    const checkToken = async () => {
      try {
        // Prüfe Hash-Parameter (Standard-Flow: #access_token=...&type=recovery)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const type = hashParams.get("type");
        const refreshToken = hashParams.get("refresh_token");

        // Prüfe Query-Parameter (PKCE-Flow: ?code=...)
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get("code");

        // Debug-Logging
        console.log("Reset Password Debug:", {
          fullUrl: window.location.href,
          hash: window.location.hash,
          search: window.location.search,
          hasHash: window.location.hash.length > 0,
          hasQuery: window.location.search.length > 0,
          accessToken: accessToken ? "present" : "missing",
          type,
          refreshToken: refreshToken ? "present" : "missing",
          code: code ? "present" : "missing",
        });

        // Fall 1: Hash-Parameter Flow (#access_token=...&type=recovery)
        if (accessToken && type === "recovery") {
          // Setze die Session mit dem Recovery-Token
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });

          console.log("setSession result (hash):", { 
            hasError: !!error, 
            error: error?.message,
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user 
          });

          if (error || !data.session) {
            console.error("Session error:", error);
            toast.error("Ungültiger oder abgelaufener Reset-Link.");
            setIsValidToken(false);
            setIsValidating(false);
            return;
          }

          // WICHTIG: Entferne Fragment aus URL (Sicherheit)
          window.history.replaceState(
            null,
            '',
            window.location.pathname + window.location.search
          );

          if (data.session.user) {
            console.log("Token valid (hash), setting isValidToken=true");
            // WICHTIG: Setze State SYNCHRON, damit React sofort rendert
            setIsValidToken(true);
            setIsValidating(false);
            return;
          } else {
            toast.error("Ungültiger Reset-Link.");
            setIsValidToken(false);
            setIsValidating(false);
            return;
          }
        }

        // Fall 2: Code-Parameter Flow (?code=...)
        // Tausche Code auf dem Server, wo Cookies verfügbar sind
        if (code) {
          try {
            const response = await fetch(`/api/auth/exchange-code?code=${encodeURIComponent(code)}`, {
              method: "POST",
            });

            console.log("Code exchange response:", {
              ok: response.ok,
              status: response.status,
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
              console.error("Code exchange error:", errorData);
              toast.error(
                errorData.error?.includes("expired") || errorData.error?.includes("Invalid")
                  ? "Der Reset-Link ist abgelaufen. Bitte fordere einen neuen Link an."
                  : errorData.error || "Ungültiger oder abgelaufener Reset-Link."
              );
              setIsValidToken(false);
              setIsValidating(false);
              return;
            }

            const { session } = await response.json();

            if (!session?.access_token) {
              console.error("No access token in response");
              toast.error("Ungültiger Reset-Link.");
              setIsValidToken(false);
              setIsValidating(false);
              return;
            }

            // Setze die Session im Browser
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            });

            console.log("setSession result (code):", { 
              hasError: !!sessionError, 
              error: sessionError?.message,
            });

            if (sessionError) {
              toast.error("Fehler beim Setzen der Session.");
              setIsValidToken(false);
              setIsValidating(false);
              return;
            }

            // WICHTIG: Entferne Code-Parameter aus URL (Sicherheit)
            window.history.replaceState(
              null,
              '',
              window.location.pathname
            );

            console.log("Token valid (code), setting isValidToken=true");
            // WICHTIG: Setze State SYNCHRON, damit React sofort rendert
            setIsValidToken(true);
            setIsValidating(false);
            
            // WICHTIG: Verhindere automatische Weiterleitung durch Next.js Router
            // Kein router.refresh() oder router.push() hier!
            return;
          } catch (fetchError) {
            console.error("Fetch error:", fetchError);
            toast.error("Fehler beim Überprüfen des Reset-Links.");
            setIsValidToken(false);
            setIsValidating(false);
            return;
          }
        }

        // Kein gültiger Link gefunden
        console.error("Invalid reset link:", { accessToken: !!accessToken, type, code: !!code });
        toast.error("Kein gültiger Reset-Link gefunden.");
        setIsValidToken(false);
        setIsValidating(false);
      } catch (err) {
        console.error("Token validation error:", err);
        toast.error("Fehler beim Überprüfen des Reset-Links.");
        setIsValidToken(false);
        setIsValidating(false);
      }
    };

    checkToken();
    // WICHTIG: Nur supabase als Dependency, NICHT router - verhindert Re-Render-Loops
  }, [supabase]);

  const onSubmit = async (values: ResetPasswordValues) => {
    startTransition(async () => {
      try {
        // Prüfe nochmal, dass wir eine gültige Session haben
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          toast.error("Session abgelaufen. Bitte fordere einen neuen Reset-Link an.");
          // WICHTIG: KEINE Weiterleitung - User bleibt auf der Seite
          setIsValidToken(false);
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: values.password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success("Passwort erfolgreich zurückgesetzt!");
        
        // Wichtig: Nach erfolgreichem Reset die Session beenden
        await supabase.auth.signOut();
        
        // Warte, bis signOut() vollständig abgeschlossen ist
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Prüfe, ob Session wirklich gelöscht ist
        const { data: { user: userAfterSignOut } } = await supabase.auth.getUser();
        
        if (userAfterSignOut) {
          // Session existiert noch - versuche es nochmal
          await supabase.auth.signOut();
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Refresh Server-Side, damit gelöschte Cookies erkannt werden
        router.refresh();
        
        // Vollständige Seitenneuladung zur Startseite (damit Server gelöschte Cookies sieht)
        window.location.href = "/";
      } catch (err) {
        toast.error("Fehler beim Zurücksetzen des Passworts.");
      }
    });
  };

  // Debug-Logging für Render-Zyklus
  console.log("ResetPasswordForm render:", { isValidToken, isValidating });

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Link wird überprüft...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidToken) {
    console.log("Rendering invalid token screen");
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Ungültiger Reset-Link</CardTitle>
            <CardDescription>
              Der Passwort-Reset-Link ist ungültig oder abgelaufen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Zur Startseite
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log("Rendering reset form - SHOULD SEE THIS!");
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Neues Passwort setzen</CardTitle>
          <CardDescription>
            Bitte gib ein neues, sicheres Passwort ein.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Neues Passwort</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Mindestens 8 Zeichen, Groß- und Kleinbuchstaben, Zahl und
                      Sonderzeichen
                    </p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passwort bestätigen</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || form.formState.isSubmitting}
              >
                {isPending ? "Wird gespeichert..." : "Passwort zurücksetzen"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Wird geladen...
              </p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
