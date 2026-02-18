"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type PlanType = "yearly" | "messe_pass" | "ltd";

type PricingCardProps = {
  name: string;
  price: string;
  originalPrice?: string;
  discount?: string;
  description: string;
  features: string[];
  planType: PlanType;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  limitedOffer?: string;
};

export function PricingCard({
  name,
  price,
  originalPrice,
  discount,
  description,
  features,
  planType,
  isCurrentPlan = false,
  isPopular = false,
  limitedOffer,
}: PricingCardProps) {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const [seatCount, setSeatCount] = useState<number>(1);

  const handleSubscribe = () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            planType,
            seatCount: seatCount,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Erstellen der Checkout-Session");
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Keine Checkout-URL erhalten");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Abonnieren"
        );
      }
    });
  };

  return (
    <Card
      className={`relative border-2 ${
        isPopular
          ? "border-primary shadow-lg"
          : "border-border/70 shadow-sm"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="default" className="px-3 py-1">
            Beliebt
          </Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4 space-y-1">
          {originalPrice && (
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground line-through">
                {originalPrice}
              </span>
              {discount && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {discount}
                </Badge>
              )}
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">
              {seatCount > 1
                ? `${(parseFloat(price.replace(",", ".").replace("€", "")) * seatCount).toFixed(2).replace(".", ",")}€`
                : price}
            </span>
            {seatCount > 1 && (
              <span className="text-sm text-muted-foreground">
                {planType === "yearly" ? `/Monat (${seatCount} Seats)` : `(${seatCount} Seats)`}
              </span>
            )}
          </div>
          {limitedOffer && (
            <p className="text-xs text-muted-foreground italic mt-2">
              {limitedOffer}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`seat-count-${planType}`}>Anzahl Seats</Label>
          <Select
            value={seatCount.toString()}
            onValueChange={(value) => setSeatCount(parseInt(value))}
          >
            <SelectTrigger id={`seat-count-${planType}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((count) => (
                <SelectItem key={count} value={count.toString()}>
                  {count} {count === 1 ? "Seat" : "Seats"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {seatCount === 1
              ? "1 Telefonnummer inklusive"
              : `${seatCount} Telefonnummern inklusive`}
          </p>
        </div>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
        <Button
          onClick={handleSubscribe}
          disabled={isLoading || isCurrentPlan}
          className="w-full"
          variant={isPopular ? "default" : "outline"}
        >
          {isLoading
            ? "Wird geladen..."
            : isCurrentPlan
            ? "Aktueller Plan"
            : "Jetzt abonnieren"}
        </Button>
      </CardContent>
    </Card>
  );
}
