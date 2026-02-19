import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { SeatList } from "@/components/seats/seat-list";
import { AddSeatButton } from "@/components/seats/add-seat-button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SeatsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Lade Seats
  const { data: seats = [] } = await supabase
    .from("phone_numbers")
    .select(
      `
      id,
      phone_number,
      is_active,
      verified,
      created_at
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Type assertion für seats query
  const seatsRaw = (seats || []) as Array<{
    id: string;
    phone_number: string;
    is_active: boolean;
    verified: boolean | null;
    created_at: string | null;
  }>;

  // Sicherstellen dass verified nicht null ist
  const safeSeats = seatsRaw.map((seat) => ({
    ...seat,
    verified: seat.verified ?? false,
  }));

  // Lade Profile für Seat-Informationen
  const { data: profile } = await supabase
    .from("profiles")
    .select("seat_count, seats_used")
    .eq("id", user.id)
    .maybeSingle();

  const profileTyped = profile as {
    seat_count: number | null;
    seats_used: number | null;
  } | null;

  const seatCount = profileTyped?.seat_count || 1;
  const seatsUsed = profileTyped?.seats_used || 0;
  const seatsAvailable = seatCount - seatsUsed;

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Seats
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Telefonnummern verwalten
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Verwalte deine Seats und ordne sie Events zu.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:gap-6">
        {/* Seat-Übersicht */}
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Seat-Übersicht</CardTitle>
              {seatsAvailable > 0 && (
                <Link href="/dashboard/pricing">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto">
                    Mehr Seats kaufen
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gekaufte Seats</p>
                <p className="text-2xl font-bold">{seatCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Genutzte Seats</p>
                <p className="text-2xl font-bold">{seatsUsed}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verfügbare Seats</p>
                <p className="text-2xl font-bold">{seatsAvailable}</p>
              </div>
            </div>
            {seatsAvailable === 0 && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
                <p className="text-amber-900">
                  Alle Seats sind genutzt.{" "}
                  <Link href="/dashboard/pricing" className="underline">
                    Kaufe mehr Seats
                  </Link>{" "}
                  um weitere Telefonnummern hinzuzufügen.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seat-Liste */}
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Deine Seats</CardTitle>
              {seatsAvailable > 0 && <AddSeatButton />}
            </div>
          </CardHeader>
          <CardContent>
            <SeatList seats={safeSeats as any} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
