"use client";

import { useState, useTransition, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

type PhoneVerificationProps = {
  phoneNumberId: string;
  phoneNumber: string;
  isVerified?: boolean | null;
  onVerified: () => void;
};

export function PhoneVerification({
  phoneNumberId,
  phoneNumber,
  isVerified: initialVerified,
  onVerified,
}: PhoneVerificationProps) {
  const [isVerified, setIsVerified] = useState(initialVerified === true);
  const [code, setCode] = useState("");
  const [isRequesting, startRequesting] = useTransition();
  const [isVerifying, startVerifying] = useTransition();
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Countdown in Echtzeit aktualisieren
  useEffect(() => {
    if (!expiresAt) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeRemaining(null);
        setExpiresAt(null); // Code abgelaufen
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    // Sofort aktualisieren
    updateCountdown();

    // Dann jede Sekunde aktualisieren
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleRequestCode = () => {
    startRequesting(async () => {
      try {
        setError(null);
        const response = await fetch("/api/phone/request-verification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number_id: phoneNumberId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Anfordern des Codes");
        }

        if (data.expires_at) {
          setExpiresAt(new Date(data.expires_at));
        }

        toast.success(
          data.warning
            ? "Code generiert (WhatsApp-Versand möglicherweise fehlgeschlagen)"
            : "Verifizierungscode wurde per WhatsApp gesendet"
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler beim Anfordern des Codes";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    });
  };

  const handleVerifyCode = () => {
    if (code.length !== 6) {
      setError("Code muss 6-stellig sein");
      return;
    }

    startVerifying(async () => {
      try {
        setError(null);
        const response = await fetch("/api/phone/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone_number_id: phoneNumberId,
            code: code,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler bei der Verifizierung");
        }

        setIsVerified(true);
        setCode("");
        setExpiresAt(null);
        toast.success("Telefonnummer erfolgreich verifiziert");
        onVerified();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Fehler bei der Verifizierung";
        setError(errorMessage);
        toast.error(errorMessage);
      }
    });
  };


  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Telefonnummer verifiziert</span>
      </div>
    );
  }

  return (
    <Card className="border border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Telefonnummer verifizieren</CardTitle>
            <CardDescription>
              Wir senden dir einen 6-stelligen Code per WhatsApp
            </CardDescription>
          </div>
          <Badge variant="secondary">Nicht verifiziert</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="phone-display">Telefonnummer</Label>
          <Input
            id="phone-display"
            value={phoneNumber}
            disabled
            className="mt-1 bg-muted"
          />
        </div>

        {!expiresAt && (
          <Button
            onClick={handleRequestCode}
            disabled={isRequesting}
            className="w-full"
          >
            {isRequesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Code wird angefordert...
              </>
            ) : (
              "Verifizierungscode anfordern"
            )}
          </Button>
        )}

        {expiresAt && (
          <>
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verifizierungscode</Label>
              <Input
                id="verification-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setCode(value);
                  setError(null);
                }}
                placeholder="123456"
                className="text-center text-2xl tracking-widest"
              />
              {timeRemaining ? (
                <p className="text-xs text-muted-foreground text-center">
                  Code gültig für: <span className="font-mono font-semibold">{timeRemaining}</span>
                </p>
              ) : expiresAt ? (
                <p className="text-xs text-destructive text-center">
                  Code abgelaufen. Bitte fordere einen neuen Code an.
                </p>
              ) : null}
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyCode}
                disabled={isVerifying || code.length !== 6 || !timeRemaining}
                className="flex-1"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird verifiziert...
                  </>
                ) : (
                  "Code verifizieren"
                )}
              </Button>
              <Button
                onClick={handleRequestCode}
                disabled={isRequesting}
                variant="outline"
              >
                {isRequesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Neuer Code"
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
