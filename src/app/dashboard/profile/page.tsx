import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,phone_number")
    .eq("id", user.id)
    .maybeSingle();

  const profileTyped = profile as {
    full_name: string | null;
    email: string | null;
    phone_number: string | null;
  } | null;

  const nameParts = (profileTyped?.full_name ?? "").split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Profil
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Persönliche Informationen
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Verwalte deine Profil-Daten und Account-Einstellungen.
          </p>
        </div>
      </header>

      <Card className="border border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>Profil bearbeiten</CardTitle>
          <CardDescription>
            Aktualisiere deine persönlichen Informationen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialFirstName={firstName}
            initialLastName={lastName}
            email={user.email ?? ""}
            phoneNumber={profileTyped?.phone_number ?? ""}
          />
        </CardContent>
      </Card>
    </>
  );
}
