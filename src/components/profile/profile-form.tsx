"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const profileSchema = z.object({
  firstName: z.string().min(1, "Vorname ist erforderlich").max(100),
  lastName: z.string().max(100).optional(),
  phoneNumber: z.string().max(50).optional(),
});

type ProfileValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  initialFirstName: string;
  initialLastName: string;
  email: string;
  phoneNumber: string;
};

export function ProfileForm({
  initialFirstName,
  initialLastName,
  email,
  phoneNumber,
}: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: initialFirstName,
      lastName: initialLastName,
      phoneNumber: phoneNumber,
    },
  });

  const onSubmit = (values: ProfileValues) => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: `${values.firstName} ${values.lastName ?? ""}`.trim(),
            phone_number: values.phoneNumber ?? null,
          }),
        });

        if (!response.ok) {
          throw new Error("Fehler beim Speichern");
        }

        toast.success("Profil aktualisiert");
        router.refresh();
      } catch {
        toast.error("Fehler beim Aktualisieren des Profils");
      }
    });
  };

  const handlePasswordReset = async () => {
    setIsResetting(true);
    try {
      const response = await fetch("/api/profile/reset-password", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Senden der E-Mail");
      }

      toast.success("E-Mail zum Zurücksetzen wurde gesendet");
    } catch {
      toast.error("Fehler beim Senden der E-Mail");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-200 text-lg font-semibold text-neutral-600">
              {initialFirstName.charAt(0).toUpperCase()}
              {initialLastName.charAt(0).toUpperCase()}
            </div>
            <p className="text-xs text-muted-foreground">
              Avatar wird aus Initialen generiert
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vorname</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nachname</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-2">
            <Label>E-Mail</Label>
            <Input value={email} disabled />
            <p className="text-xs text-muted-foreground">
              E-Mail-Adresse kann nicht geändert werden
            </p>
          </div>

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefonnummer</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+49 151 23456789" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Speichern..." : "Änderungen speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isResetting}
            >
              {isResetting ? "Wird gesendet..." : "Passwort zurücksetzen"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
