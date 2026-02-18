"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PhoneVerification } from "@/components/phone/phone-verification";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState<string | null>(null);
  const [isCreating, startCreating] = useTransition();
  const [isVerified, setIsVerified] = useState(false);

  const handleCreateSeat = () => {
    if (!phoneNumber.trim()) {
      toast.error("Bitte gib eine Telefonnummer ein");
      return;
    }

    startCreating(async () => {
      try {
        const response = await fetch("/api/seats/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phoneNumber.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Erstellen des Seats");
        }

        setPhoneNumberId(data.seat.id);
        toast.success("Telefonnummer gespeichert. Bitte verifiziere sie jetzt.");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Speichern";
        toast.error(errorMessage);
      }
    });
  };

  const handleVerified = () => {
    setIsVerified(true);
    toast.success("Telefonnummer verifiziert! Weiterleitung zum Dashboard...");
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-neutral-50">
      <div className="mx-auto flex max-w-xl flex-col gap-8 px-6 pb-16 pt-24">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Schritt {phoneNumberId ? "2" : "1"} von 2
          </p>
          <h1 className="text-3xl font-semibold text-foreground">
            Verifiziere deine WhatsApp-Nummer
          </h1>
          <p className="text-muted-foreground">
            Wir ordnen eingehende WhatsApp-Nachrichten eindeutig deinem Account
            zu. Ohne verifizierte Handynummer können wir keine Leads empfangen.
          </p>
        </div>

        {!phoneNumberId ? (
          <Card className="border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Handynummer hinterlegen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp-Nummer</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+49 151 23456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && phoneNumber.trim()) {
                        handleCreateSeat();
                      }
                    }}
                    autoFocus
                    autoComplete="tel"
                    disabled={isCreating}
                  />
                  <p className="text-xs text-muted-foreground">
                    Nutze das Format mit Landesvorwahl. Wir senden dir einen
                    Verifizierungscode per WhatsApp.
                  </p>
                </div>
                <Button
                  onClick={handleCreateSeat}
                  disabled={isCreating || !phoneNumber.trim()}
                  className="w-full"
                >
                  {isCreating ? "Wird gespeichert..." : "Nummer speichern"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <PhoneVerification
            phoneNumberId={phoneNumberId}
            phoneNumber={phoneNumber}
            isVerified={isVerified}
            onVerified={handleVerified}
          />
        )}
      </div>
    </div>
  );
}
