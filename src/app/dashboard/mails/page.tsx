import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { TemplateManager } from "@/components/mails/template-manager";
import { SendEmails } from "@/components/mails/send-emails";

export default async function MailsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: templates = [] } = await supabase
    .from("mail_templates")
    .select("id, name, subject, template, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Type assertions für alle Queries
  const templatesRaw = (templates || []) as Array<{
    id: string;
    name: string;
    subject: string;
    template: string;
    created_at: string | null;
    updated_at: string | null;
  }>;

  const templatesTyped = templatesRaw.map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
    template: t.template,
    created_at: t.created_at || "",
    updated_at: t.updated_at || "",
  }));

  const { data: leads = [] } = await supabase
    .from("leads")
    .select("id, vorname, nachname, email, firma, telefon, event_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  const leadsTyped = (leads || []) as Array<{
    id: string;
    vorname: string | null;
    nachname: string | null;
    email: string | null;
    firma: string | null;
    telefon: string | null;
    event_id: string | null;
  }>;

  const { data: events = [] } = await supabase
    .from("events")
    .select("id, name")
    .eq("user_id", user.id)
    .order("start_date", { ascending: false });

  const eventsTyped = (events || []) as { id: string; name: string }[];

  return (
    <>
      <header className="flex flex-col gap-2">
        <Badge className="w-fit" variant="secondary">
          Follow-up Mails
        </Badge>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
            E-Mail Templates & Versand
          </h1>
          <p className="text-sm text-muted-foreground sm:text-base">
            Erstelle Templates und versende personalisierte Follow-up E-Mails an
            deine Leads.
          </p>
        </div>
      </header>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates verwalten</TabsTrigger>
          <TabsTrigger value="send">E-Mails versenden</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <TemplateManager initialTemplates={templatesTyped} />
        </TabsContent>

        <TabsContent value="send" className="space-y-4">
          <SendEmails templates={templatesTyped} leads={leadsTyped} events={eventsTyped} />
        </TabsContent>
      </Tabs>
    </>
  );
}
