import { BackButton } from "@/components/ui/back-button";

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-neutral-50">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 pb-16 pt-20">
        <BackButton />
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Datenschutzerklärung
          </h1>
        </header>
        <div className="prose prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">
              1. Datenschutzerklärung (Privacy Policy)
            </h2>
            <p className="text-muted-foreground mb-2">
              <strong>Verantwortlicher:</strong> Seitenheld
              <br />
              Paul Killgus
              <br />
              E-Mail:{" "}
              <a
                href="mailto:paul.killgus@seitenheld.com"
                className="text-blue-600 hover:underline"
              >
                paul.killgus@seitenheld.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              § 1 Gegenstand des Datenschutzes
            </h2>
            <p className="text-muted-foreground">
              Gegenstand des Datenschutzes sind personenbezogene Daten. Dies
              sind Informationen, die sich auf eine identifizierte oder
              identifizierbare natürliche Person beziehen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              § 2 Datenerfassung über die WhatsApp Business API (Meta)
            </h2>
            <p className="text-muted-foreground mb-2">
              Unsere App verarbeitet Daten, die über die WhatsApp Business API
              von Meta Platforms Ireland Ltd. empfangen werden.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Art der Daten:</strong> Audio-Diktate, Textnachrichten und
              Kontaktinformationen der Leads.
            </p>
            <p className="text-muted-foreground mb-2">
              <strong>Zweck:</strong> Strukturierung und Übertragung dieser
              Daten in das CRM-System des Nutzers.
            </p>
            <p className="text-muted-foreground">
              <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. b DSGVO
              (Vertragserfüllung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
              Interesse an effizientem Vertrieb).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              § 3 Zusammenarbeit mit Auftragsverarbeitern (Tool-Stack)
            </h2>
            <p className="text-muted-foreground mb-2">
              Zur Bereitstellung unseres Dienstes nutzen wir folgende Partner,
              mit denen Verträge zur Auftragsverarbeitung (AVV) bestehen:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>
                <strong>Supabase (Datenbank):</strong> Speicherung von
                Nutzerkonten und Lead-Daten in der Region Frankfurt (EU).
              </li>
              <li>
                <strong>OpenAI (KI-Analyse):</strong> Strukturierung der Daten
                via API. Die Daten werden nicht zum Training der Modelle
                verwendet.
              </li>
              <li>
                <strong>n8n (Automatisierung):</strong> Technische Verarbeitung
                und Workflow-Steuerung.
              </li>
              <li>
                <strong>Vercel (Hosting App):</strong> Bereitstellung der
                App-Oberfläche unter app.seitenheld.com.
              </li>
              <li>
                <strong>Framer (Hosting Landingpage):</strong> Bereitstellung der
                Webseite unter seitenheld.com.
              </li>
              <li>
                <strong>Stripe (Zahlungen):</strong> Abwicklung von
                Transaktionen und Abonnements.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">
              § 4 Speicherdauer und Löschung
            </h2>
            <p className="text-muted-foreground mb-2">
              Lead-Daten verbleiben für 12 Monate im System, um eine
              Nachbereitung zu ermöglichen.
            </p>
            <p className="text-muted-foreground mb-2">
              Anfragen zur Datenlöschung (Meta-User-Data-Deletion) können
              formlos an{" "}
              <a
                href="mailto:paul.killgus@seitenheld.com"
                className="text-blue-600 hover:underline"
              >
                paul.killgus@seitenheld.com
              </a>{" "}
              gesendet werden.
            </p>
            <p className="text-muted-foreground">
              Eine detaillierte Anleitung finden Sie unter:{" "}
              <a
                href="https://www.seitenheld.com/datenschutz#loeschung"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                https://www.seitenheld.com/datenschutz#loeschung
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
