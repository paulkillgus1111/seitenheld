"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getPlanType, formatSubscriptionStatus } from "@/lib/subscription";
import Link from "next/link";

type SettingsSecurityProps = {
  subscriptionStatus: string | null;
  planType: string | null;
  currentPeriodEnd: Date | null;
  hasStripeCustomer: boolean;
  seatCount: number;
  seatsUsed: number;
};

export function SettingsSecurity({
  subscriptionStatus,
  planType,
  currentPeriodEnd,
  hasStripeCustomer,
  seatCount,
  seatsUsed,
}: SettingsSecurityProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isOpeningPortal, startOpeningPortal] = useTransition();

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch("/api/settings/delete-account", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Fehler beim Löschen");
      }

      toast.success("Account wird gelöscht...");
      window.location.href = "/";
    } catch {
      toast.error("Fehler beim Löschen des Accounts");
      setIsDeleting(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    startOpeningPortal(async () => {
      try {
        const response = await fetch("/api/stripe/portal", {
          method: "POST",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Öffnen des Customer Portals");
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Keine Portal-URL erhalten");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Öffnen des Customer Portals"
        );
      }
    });
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Kündigen");
      }

      toast.success("Abo wird am Ende der Abrechnungsperiode gekündigt");
      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Fehler beim Kündigen des Abos"
      );
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Abo-Status</CardTitle>
          <CardDescription>
            Verwalte dein Abo und Zahlungsinformationen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscriptionStatus && subscriptionStatus !== "none" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {planType ? getPlanType(planType as "yearly" | "messe_pass" | "ltd" | "none") : "Kein Plan"}
                  </p>
                </div>
                <Badge variant={subscriptionStatus === "active" ? "default" : "secondary"}>
                  {formatSubscriptionStatus(subscriptionStatus as any)}
                </Badge>
              </div>
              {currentPeriodEnd && (
                <div>
                  <p className="text-sm font-medium">Läuft ab am</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(currentPeriodEnd).toLocaleDateString("de-DE")}
                  </p>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {hasStripeCustomer && (
                  <Button
                    onClick={handleOpenCustomerPortal}
                    disabled={isOpeningPortal}
                    variant="outline"
                    className="w-full"
                  >
                    {isOpeningPortal ? "Wird geöffnet..." : "Abo verwalten"}
                  </Button>
                )}
                {/* Kündigungs-Button nur für yearly Pläne */}
                {planType === "yearly" && subscriptionStatus === "active" && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        disabled={isCancelling}
                        className="w-full"
                      >
                        Abo kündigen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Abo kündigen?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Möchtest du dein Abo wirklich kündigen? Dein Abo bleibt
                          bis zum Ende der aktuellen Abrechnungsperiode aktiv. Danach
                          wird es automatisch gekündigt und du verlierst den Zugang
                          zu allen Premium-Features.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelSubscription}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isCancelling ? "Wird gekündigt..." : "Ja, kündigen"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Du hast noch kein Abo aktiviert.
              </p>
              <Button
                onClick={() => window.location.href = "/dashboard/pricing"}
                variant="default"
              >
                Plan auswählen
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Seats</CardTitle>
          <CardDescription>
            Verwalte deine Telefonnummern und Seats
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Gekaufte Seats</p>
              <p className="text-2xl font-bold">{seatCount}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Genutzte Seats</p>
              <p className="text-2xl font-bold">{seatsUsed}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Verfügbare Seats</p>
            <p className="text-2xl font-bold text-emerald-600">
              {seatCount - seatsUsed}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/seats">
              <Button variant="outline" className="w-full">
                Seats verwalten
              </Button>
            </Link>
            {seatCount - seatsUsed === 0 && (
              <Link href="/dashboard/pricing">
                <Button variant="default" className="w-full">
                  Mehr Seats kaufen
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border-2 border-destructive bg-destructive/5 p-6">
        <h3 className="mb-2 text-lg font-semibold text-destructive">
          Gefahrenzone
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Wenn du deinen Account löschst, werden alle deine Daten
          unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht
          werden.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              Account löschen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bist du sicher?</AlertDialogTitle>
              <AlertDialogDescription>
                Diese Aktion kann nicht rückgängig gemacht werden. Dein Account
                und alle zugehörigen Daten werden permanent gelöscht.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Wird gelöscht..." : "Ja, Account löschen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
