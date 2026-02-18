export default function ImpressumPage() {
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Impressum
        </h1>
      </header>
      <div className="prose prose-sm max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Angaben gemäß § 5 TMG</h2>
          <p className="text-muted-foreground">
            Bootstrapped Ventures
            <br />
            Paul Killgus
            <br />
            Schwandorfer Straße 8
            <br />
            93059 Regensburg
          </p>
          <p className="text-muted-foreground mt-4">
            Vertreten durch: Paul Killgus
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Kontakt</h2>
          <p className="text-muted-foreground">
            E-Mail:{" "}
            <a
              href="mailto:kontakt@seitenheld.com"
              className="text-blue-600 hover:underline"
            >
              kontakt@seitenheld.com
            </a>
            <br />
            Website:{" "}
            <a
              href="https://www.seitenheld.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              www.seitenheld.com
            </a>
            <br />
            Telefon:
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Umsatzsteuer-ID</h2>
          <p className="text-muted-foreground">
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
            [DE XXXXXXXXX]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Redaktionell verantwortlich
          </h2>
          <p className="text-muted-foreground">
            Paul Killgus, Schwandorfer Straße 8, 93059 Regensburg
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">EU-Streitschlichtung</h2>
          <p className="text-muted-foreground">
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Unsere E-Mail-Adresse findest du oben im Impressum.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">
            Verbraucherstreitbeilegung/Universalschlichtungsstelle
          </h2>
          <p className="text-muted-foreground">
            Wir sind nicht bereit oder verpflichtet, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </section>
      </div>
    </>
  );
}
