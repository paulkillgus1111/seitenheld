"use client";

import { useMemo, useState, useTransition } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { toast } from "sonner";

// Complex password validation
const passwordSchema = z
  .string()
  .min(8, "Mindestens 8 Zeichen erforderlich.")
  .max(64, "Maximal 64 Zeichen erlaubt.")
  .regex(/[A-Z]/, "Mindestens ein Großbuchstabe erforderlich.")
  .regex(/[a-z]/, "Mindestens ein Kleinbuchstabe erforderlich.")
  .regex(/[0-9]/, "Mindestens eine Zahl erforderlich.")
  .regex(/[^A-Za-z0-9]/, "Mindestens ein Sonderzeichen erforderlich.");

const authSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail angeben.").max(255),
  password: passwordSchema,
  fullName: z.string().max(200).optional(),
  acceptTerms: z.boolean().optional(),
});

type AuthValues = z.infer<typeof authSchema>;
type Mode = "signin" | "signup";

export function AuthForm() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isSendingReset, setIsSendingReset] = useState(false);

  const form = useForm<AuthValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (values: AuthValues) => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      if (mode === "signup") {
        // ✅ Prüfe DSGVO-Einwilligung
        if (!values.acceptTerms) {
          setError("Du musst den AGB und der Datenschutzerklärung zustimmen.");
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              full_name: values.fullName?.trim() || null,
            },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        setMessage(
          "Signup abgeschlossen. Prüfe dein Postfach und dann weiter zur Onboarding-Nummer."
        );
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }
      }

      router.refresh();
    });
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast.error("Bitte gib zuerst deine E-Mail-Adresse ein.");
      return;
    }

    setIsSendingReset(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (resetError) {
        toast.error(resetError.message);
        return;
      }

      toast.success(
        "E-Mail zum Zurücksetzen des Passworts wurde gesendet. Prüfe dein Postfach."
      );
    } catch (err) {
      toast.error("Fehler beim Senden der E-Mail.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("signin")}
          className={`rounded-full px-3 py-1 transition ${
            mode === "signin"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode("signup")}
          className={`rounded-full px-3 py-1 transition ${
            mode === "signup"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          Signup
        </button>
      </div>

      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-Mail</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {mode === "signup" && (
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Voller Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Max Mustermann"
                      autoComplete="name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Passwort</FormLabel>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      disabled={isSendingReset}
                      className="text-xs text-primary hover:underline"
                    >
                      {isSendingReset ? "Wird gesendet..." : "Passwort vergessen?"}
                    </button>
                  )}
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete={
                      mode === "signin" ? "current-password" : "new-password"
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    Mindestens 8 Zeichen, Groß- und Kleinbuchstaben, Zahl und
                    Sonderzeichen
                  </p>
                )}
              </FormItem>
            )}
          />

          {mode === "signup" && (
            <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="mt-0.5"
                    />
                  </FormControl>
                  <div className="space-y-0 leading-tight">
                    <FormLabel className="text-xs text-muted-foreground font-normal cursor-pointer block">
                      <span className="block">Ich akzeptiere die{" "}
                        <Link
                          href="/agb"
                          className="underline hover:text-primary"
                          target="_blank"
                        >
                          AGB
                        </Link>{" "}
                        und</span>
                      <span className="block">
                        die{" "}
                        <Link
                          href="/datenschutz"
                          className="underline hover:text-primary"
                          target="_blank"
                        >
                          Datenschutzerklärung
                        </Link>
                        . *
                      </span>
                    </FormLabel>
                    <FormMessage className="text-xs" />
                  </div>
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isPending || form.formState.isSubmitting}
          >
            {mode === "signin" ? "Einloggen" : "Account anlegen"}
          </Button>
        </form>
      </Form>

      {message && (
        <p className="text-sm text-emerald-600" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Deine Zentrale für digitales Lead-Management.
      </p>
    </div>
  );
}
