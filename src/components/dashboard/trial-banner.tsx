"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type TrialBannerProps = {
  expiresAt: string;
};

export function TrialBanner({ expiresAt }: TrialBannerProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = Date.now();
      const expires = new Date(expiresAt).getTime();
      const diff = expires - now;
      setTimeLeft(Math.max(0, diff));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  if (timeLeft <= 0) {
    return null;
  }

  return (
    <Card className="border border-blue-200 bg-blue-50">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3 flex-1">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Kostenloser Messetag aktiv
              </p>
              <p className="text-xs text-blue-700">
                Noch {hoursLeft}h {minutesLeft}m verfügbar. Danach wird der Zugriff blockiert.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              Trial
            </Badge>
            <Link href="/dashboard/pricing">
              <Button variant="outline" size="sm">
                Jetzt upgraden
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
