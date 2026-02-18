export default function AGBPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Allgemeine Geschäftsbedingungen (AGB) – Seitenheld
        </h1>
      </header>
      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">
            § 1 Geltungsbereich und Vertragsgegenstand
          </h2>
          <p className="text-muted-foreground mb-2">
            (1) Diese Allgemeinen Geschäftsbedingungen gelten für alle
            Verträge zwischen Bootstrapped Ventures, Inhaber Paul Killgus
            (nachfolgend „Anbieter"), und seinen Kunden, die über die Plattform
            Seitenheld (seitenheld.com) geschlossen werden.
          </p>
          <p className="text-muted-foreground mb-2">
            (2) Das Angebot richtet sich ausschließlich an Unternehmer im
            Sinne des § 14 BGB. Ein Widerrufsrecht für Verbraucher besteht
            daher nicht.
          </p>
          <p className="text-muted-foreground">
            (3) Seitenheld bietet eine technologische Lösung zur smarten
            Erfassung von Messedaten über WhatsApp, deren automatisierte
            Strukturierung (via OpenAI API) und die Übertragung in
            Drittsysteme (CRM-Schnittstellen).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            § 2 Leistungsumfang und Pakete
          </h2>
          <p className="text-muted-foreground mb-2">
            Der Kunde kann zwischen drei Nutzungsmodellen wählen:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
            <li>
              <strong>Messe-Pass:</strong> Nutzung für eine einzelne Messe,
              Kapazität bis zu 500 Leads.
            </li>
            <li>
              <strong>Jahresabo:</strong> Jährliche Grundgebühr für bis zu 10
              Events pro Jahr.
            </li>
            <li>
              <strong>LTD (Lifetime Deal):</strong> Einmalige Zahlung für ein
              Kontingent von 50 Events mit bevorzugtem Zugriff auf zukünftige
              Features.
            </li>
          </ul>
          <p className="text-muted-foreground mt-4">
            Alle Pakete beinhalten die Meta-Nutzungsgebühren für WhatsApp. Die
            tägliche Versandkapazität für automatisierte Follow-Up-Mails ist
            systembedingt auf 20 Einheiten pro Tag begrenzt.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            § 3 Technische Bereitstellung und Drittanbieter
          </h2>
          <p className="text-muted-foreground mb-2">
            (1) Die Erreichbarkeit der Landingpage erfolgt über Framer,
            während die App-Funktionalität über Vercel bereitgestellt wird.
          </p>
          <p className="text-muted-foreground">
            (2) Da das System auf Diensten von Drittanbietern basiert
            (insbesondere Meta/WhatsApp für den Dateneingang sowie n8n, OpenAI
            und Supabase für die Backend-Logik), übernimmt Seitenheld keine
            Garantie für die 100%ige Verfügbarkeit dieser externen
            Schnittstellen. Wir bemühen uns um eine Verfügbarkeit von 98% im
            Jahresmittel für unsere eigene Infrastruktur.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            § 4 Datenschutz und Verantwortlichkeit
          </h2>
          <p className="text-muted-foreground mb-2">
            (1) Der Kunde agiert als Verantwortlicher für die Erhebung der
            Lead-Daten auf der Messe.
          </p>
          <p className="text-muted-foreground mb-2">
            (2) Der Kunde verpflichtet sich, die geltenden
            Datenschutzbestimmungen (DSGVO) einzuhalten und Messebesucher über
            die digitale Datenerfassung zu informieren.
          </p>
          <p className="text-muted-foreground mb-2">
            (3) Der Kunde stellt Seitenheld von sämtlichen Ansprüchen Dritter
            frei, die aus einer unrechtmäßigen Datenerhebung durch den Kunden
            resultieren.
          </p>
          <p className="text-muted-foreground">
            (4) Daten werden standardmäßig für 12 Monate in der App gespeichert,
            um eine Nachbereitung zu ermöglichen.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            § 5 Zahlungsbedingungen
          </h2>
          <p className="text-muted-foreground mb-2">
            (1) Die Vergütung richtet sich nach dem gewählten Paket und wird
            über den Dienstleister Stripe abgewickelt.
          </p>
          <p className="text-muted-foreground">
            (2) Alle Preise verstehen sich als Endpreise.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">§ 6 Haftungsausschluss</h2>
          <p className="text-muted-foreground">
            Seitenheld haftet nicht für den vertrieblichen Erfolg der Leads
            oder für Datenverluste, die durch fehlerhafte Konfigurationen im
            CRM-System des Kunden oder Ausfälle bei Meta/WhatsApp entstehen.
          </p>
        </section>
      </div>
    </>
  );
}
