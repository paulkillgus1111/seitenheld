"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export function PhoneVerificationBanner() {
  return (
    <Card className="border border-amber-200 bg-amber-50">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">
                Telefonnummer nicht verifiziert
              </p>
              <p className="text-xs text-amber-700">
                Bitte verifiziere deine Telefonnummer, damit eingehende WhatsApp-Nachrichten korrekt zugeordnet werden können.
              </p>
            </div>
          </div>
          <Link href="/dashboard/seats">
            <Button variant="outline" size="sm" className="w-full sm:w-auto border-amber-300 text-amber-900 hover:bg-amber-100">
              Jetzt verifizieren
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
