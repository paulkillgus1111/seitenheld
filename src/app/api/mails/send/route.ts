import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { sendToN8N } from "@/lib/n8n";
import { isSubscriptionActive } from "@/lib/subscription";
import { getTrialStatus } from "@/lib/trial-server";
import { withRateLimit, addRateLimitHeaders } from "@/lib/rate-limit-middleware";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { z } from "zod";

const sendEmailsSchema = z.object({
  templateId: z.string().uuid(),
  leadIds: z.array(z.string().uuid()).min(1, "Mindestens ein Lead auswählen"),
});

const DAILY_LEAD_LIMIT = 20;

// HTML-Escaping Funktion für XSS-Schutz
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function renderTemplate(template: string, data: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "gi");
    // Escape HTML um XSS-Angriffe zu verhindern
    const escapedValue = escapeHtml(value || "");
    rendered = rendered.replace(regex, escapedValue);
  }
  return rendered;
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prüfe Subscription-Status
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", session.user.id)
      .maybeSingle();

    const profileTyped = profile as {
      subscription_status: string | null;
    } | null;

    const status = (profileTyped?.subscription_status ||
      "none") as "active" | "past_due" | "canceled" | "trialing" | "incomplete" | "none";

    // Prüfe auch Trial-Status
    const trialStatus = await getTrialStatus(session.user.id);

    // Für E-Mail-Versand: Nur aktive Subscription oder aktiver Trial erlauben
    // "available" Trial reicht nicht - User muss erst einen Lead erstellen
    if (
      !isSubscriptionActive(status, trialStatus) ||
      trialStatus === "available"
    ) {
      return NextResponse.json(
        {
          error: "Subscription required",
          details: "Du benötigst ein aktives Abo oder einen aktiven Trial, um E-Mails zu versenden.",
        },
        { status: 403 }
      );
    }

    // Rate Limiting: E-Mail-Missbrauch-Schutz
    const rateLimitResult = await withRateLimit(request, {
      config: rateLimitConfigs.emailSend,
      identifier: session.user.id, // User-ID für user-basierte Limits
    });

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const validated = sendEmailsSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { templateId, leadIds } = validated.data;

    // Prüfe tägliches Limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { count: todaySentCount } = await supabase
      .from("sent_emails")
      .select("*", { count: "exact", head: true })
      .eq("user_id", session.user.id)
      .gte("sent_at", todayISO);

    const availableLimit = DAILY_LEAD_LIMIT - (todaySentCount || 0);

    if (leadIds.length > availableLimit) {
      return NextResponse.json(
        {
          error: `Tägliches Limit erreicht`,
          details: `Du kannst heute noch ${availableLimit} Lead${availableLimit !== 1 ? "s" : ""} versenden. Tägliches Limit: ${DAILY_LEAD_LIMIT} Leads.`,
          remainingLimit: availableLimit,
          dailyLimit: DAILY_LEAD_LIMIT,
        },
        { status: 400 }
      );
    }

    // Lade Template
    const { data: template, error: templateError } = await supabase
      .from("mail_templates")
      .select("id, name, subject, template")
      .eq("id", templateId)
      .eq("user_id", session.user.id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Lade Leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("id, vorname, nachname, email, firma, telefon, event_id")
      .in("id", leadIds)
      .is("deleted_at", null);

    if (leadsError) {
      return NextResponse.json(
        { error: leadsError.message },
        { status: 500 }
      );
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found" },
        { status: 400 }
      );
    }

    // Lade Events für Lead-Daten
    const eventIds = [...new Set(leads.map((lead) => lead.event_id).filter(Boolean))];
    const { data: events } = await supabase
      .from("events")
      .select("id, name")
      .in("id", eventIds)
      .eq("user_id", session.user.id);

    const eventMap = new Map(events?.map((e) => [e.id, e.name]) || []);

    // Rendere Templates für jeden Lead
    const emails = leads
      .filter((lead) => lead.email) // Nur Leads mit E-Mail
      .map((lead) => {
        const eventName = eventMap.get(lead.event_id || "") || "Unbekanntes Event";
        const leadData = {
          vorname: lead.vorname || "",
          nachname: lead.nachname || "",
          firma: lead.firma || "",
          telefon: lead.telefon || "",
          email: lead.email || "",
          event_name: eventName,
          datum: new Date().toLocaleDateString("de-DE"),
        };

        const subject = renderTemplate(template.subject, leadData);
        const body = renderTemplate(template.template, leadData);

        return {
          leadId: lead.id,
          to: lead.email!,
          subject,
          body,
          leadData,
        };
      });

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "Keine Leads mit E-Mail-Adresse gefunden" },
        { status: 400 }
      );
    }

    // Sende an n8n
    const n8nPayload = {
      templateId: template.id,
      templateName: template.name,
      userId: session.user.id,
      emails,
    };

    console.log("Preparing to send to n8n:", {
      templateId: template.id,
      templateName: template.name,
      emailCount: emails.length,
      firstEmail: emails[0] ? {
        to: emails[0].to,
        subject: emails[0].subject.substring(0, 50),
      } : null,
    });

    try {
      await sendToN8N(n8nPayload);
      console.log("Successfully sent to n8n");
    } catch (n8nError) {
      const errorMessage = n8nError instanceof Error ? n8nError.message : String(n8nError);
      console.error("n8n error:", {
        error: errorMessage,
        templateId: template.id,
        emailCount: emails.length,
        webhookUrl: "https://seitenheld.app.n8n.cloud/webhook-test/800af2a6-550c-48ab-8711-87d164792b69",
      });
      
      // Extrahiere Hinweis aus Fehlermeldung falls vorhanden
      const hintMatch = errorMessage.match(/Hinweis: (.+)/);
      const hint = hintMatch 
        ? hintMatch[1] 
        : "Stelle sicher, dass der n8n Workflow aktiviert ist und der Webhook-Node ausgeführt wurde (klicke auf 'Execute workflow' im Test-Modus).";
      
      return NextResponse.json(
        { 
          error: "Fehler beim Senden an n8n", 
          details: errorMessage,
          hint: hint,
        },
        { status: 500 }
      );
    }

    // Aktualisiere followup_mail_sent_at in leads Tabelle
    const leadIdsToUpdate = emails.map((e) => e.leadId);
    await supabase
      .from("leads")
      .update({ followup_mail_sent_at: new Date().toISOString() })
      .in("id", leadIdsToUpdate);

    // Speichere in sent_emails Tabelle
    const sentEmailsRecords = emails.map((email) => ({
      user_id: session.user.id,
      lead_id: email.leadId,
      subject: email.subject,
      body: email.body,
    }));

    await supabase.from("sent_emails").insert(sentEmailsRecords);

    // Berechne verbleibendes Limit nach dem Versenden
    const newTodayCount = (todaySentCount || 0) + emails.length;
    const newRemainingLimit = DAILY_LEAD_LIMIT - newTodayCount;

    const response = NextResponse.json({
      success: true,
      sentCount: emails.length,
      remainingLimit: Math.max(0, newRemainingLimit),
      dailyLimit: DAILY_LEAD_LIMIT,
    });

    // Rate Limit Headers werden bereits durch withRateLimit gesetzt
    // (wenn Request erfolgreich war)
    return response;
  } catch (error) {
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
    } : { message: String(error) };
    
    console.error("Send emails error:", errorDetails);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: errorDetails.message,
        hint: "Prüfe die Server-Logs im Terminal (wo 'npm run dev' läuft) für weitere Details.",
      },
      { status: 500 }
    );
  }
}
