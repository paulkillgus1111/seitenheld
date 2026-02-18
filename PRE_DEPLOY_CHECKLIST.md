# Pre-Deploy Checklist für Vercel

## ✅ Vor dem ersten Deploy auf Vercel

### 1. Datenbank-Migrationen ausführen

Führe alle SQL-Migrationen in Supabase aus:

- [ ] `SUPABASE_UPDATE_STRIPE_SUBSCRIPTION.sql` - Stripe Integration
- [ ] `SUPABASE_PHONE_VERIFICATION.sql` - Telefonnummer-Verifizierung
- [ ] `SUPABASE_ADD_MORNING_MESSAGE_FLAG.sql` - Morgen-Nachricht Flag
- [ ] `SUPABASE_ADD_EVENT_TIMEZONE.sql` - Zeitzone für Events (für internationale Messen)
- [ ] `SUPABASE_UPDATE_TRIAL_CRON.sql` - Trial Expiration Cron (optional)
- [ ] `SUPABASE_SALESFORCE_OAUTH2.sql` - Salesforce OAuth2 Integration

**Wichtig:** Prüfe nach jeder Migration, ob sie erfolgreich war.

---

### 2. Environment Variables in Vercel setzen

Gehe zu Vercel Dashboard → Dein Projekt → Settings → Environment Variables

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

#### Stripe
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_MESSE_PASS`
- [ ] `NEXT_PUBLIC_STRIPE_PRICE_ID_LTD`

#### n8n Webhooks
- [ ] `N8N_WEBHOOK_URL` - Für E-Mail-Versand
- [ ] `N8N_VERIFICATION_WEBHOOK_URL` - Für Telefonnummer-Verifizierung
- [ ] `N8N_MORNING_MESSAGE_WEBHOOK_URL` - Für Morgen-Nachricht (6 Uhr)
- [ ] `N8N_EVENT_CREATED_WEBHOOK_URL` - Für Event-Erstellung (sofort)
- [ ] `N8N_WELCOME_WEBHOOK_URL` - Für Welcome-Nachricht

#### App URL
- [ ] `NEXT_PUBLIC_APP_URL` - Deine Production URL (z.B. `https://deine-domain.com`)

#### Cron Secret
- [ ] `CRON_SECRET` - Sicheres Secret für Cron-Job-Authentifizierung (generiere z.B. mit `openssl rand -hex 32`)

#### Salesforce (OAuth2)
- [ ] `SALESFORCE_CLIENT_ID` - Consumer Key aus deiner Connected App
- [ ] `SALESFORCE_CLIENT_SECRET` - Consumer Secret aus deiner Connected App
- [ ] `SALESFORCE_REDIRECT_URI` - Callback URL (z.B. `https://deine-domain.com/api/salesforce/callback`)
- [ ] `SALESFORCE_AUTH_URL` - Optional: `https://login.salesforce.com` (Production) oder `https://test.salesforce.com` (Sandbox)
- [ ] `SALESFORCE_TOKEN_URL` - Optional: Normalerweise gleich wie `SALESFORCE_AUTH_URL`

**Wichtig:** Erstelle eine Connected App in Salesforce:
1. Setup → App Manager → New Connected App
2. OAuth Settings aktivieren
3. Callback URL: `https://deine-domain.com/api/salesforce/callback`
4. Scopes: `api`, `refresh_token`, `offline_access`
5. Notiere Consumer Key (Client ID) und Consumer Secret

---

### 3. Stripe Webhook konfigurieren

In Stripe Dashboard → Developers → Webhooks:

- [ ] Erstelle Webhook-Endpoint: `https://deine-domain.com/api/webhooks/stripe`
- [ ] Wähle Events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] Kopiere Webhook Secret → Setze in Vercel als `STRIPE_WEBHOOK_SECRET`

---

### 4. Supabase E-Mail-Templates prüfen

In Supabase Dashboard → Authentication → Email Templates:

- [ ] **Confirm signup** - E-Mail-Bestätigung aktiviert?
- [ ] **Magic Link** - Falls verwendet
- [ ] **Change Email Address** - Falls verwendet
- [ ] **Reset Password** - E-Mail-Template prüfen

**Wichtig:** Redirect-URLs in Templates auf Production-URL setzen.

---

### 5. Supabase Redirect URLs konfigurieren

In Supabase Dashboard → Authentication → URL Configuration:

- [ ] **Site URL**: `https://deine-domain.com`
- [ ] **Redirect URLs**: 
  - `https://deine-domain.com/**`
  - `https://deine-domain.com/auth/**`
  - `https://deine-domain.com/dashboard/**`

---

### 6. Rate Limiting prüfen

- [ ] Aktuell: In-Memory Store (funktioniert lokal)
- [ ] **Für Production:** Überlege Upstash Redis zu nutzen (siehe `leadcap/src/lib/rate-limit.ts`)

**Optional:** Setze Upstash Redis für Production:
- [ ] Erstelle Upstash Redis Database
- [ ] Setze `UPSTASH_REDIS_REST_URL` und `UPSTASH_REDIS_REST_TOKEN` in Vercel
- [ ] Aktiviere Redis in `rate-limit.ts`

---

### 7. n8n Workflows testen

Teste alle n8n Webhooks lokal:

- [ ] E-Mail-Versand (Lead-Follow-up)
- [ ] Telefonnummer-Verifizierung
- [ ] Morgen-Nachricht (6 Uhr)
- [ ] Event-Erstellung (sofort)
- [ ] Welcome-Nachricht

**Test-Route für Morgen-Nachricht (lokal):**
- Erstelle Test-Event mit `start_date = heute`
- Rufe manuell auf: `http://localhost:3000/api/n8n/test-morning-messages` (falls vorhanden)

---

### 8. Vercel Cron Job prüfen

Nach dem ersten Deploy:

- [ ] Gehe zu Vercel Dashboard → Dein Projekt → Settings → Cron Jobs
- [ ] Prüfe ob `send-morning-messages` Cron-Job aktiv ist
- [ ] Schedule sollte sein: `0 * * * *` (jede Stunde)

**Hinweis:** Der Cron-Job läuft stündlich und prüft für jedes Event, ob es 6 Uhr in dessen Zeitzone ist. So funktioniert es auch für internationale Messen!

---

### 9. Domain & SSL

- [ ] Domain in Vercel konfiguriert
- [ ] SSL-Zertifikat aktiv (automatisch bei Vercel)
- [ ] DNS-Einträge korrekt gesetzt

---

### 10. Build & Deploy testen

- [ ] `npm run build` lokal erfolgreich
- [ ] Keine Build-Fehler
- [ ] Alle TypeScript-Fehler behoben
- [ ] Linter-Fehler behoben

---

### 11. Production-Tests nach Deploy

Nach dem ersten Deploy auf Vercel:

- [ ] Sign-Up funktioniert
- [ ] E-Mail-Bestätigung funktioniert
- [ ] Login funktioniert
- [ ] Onboarding-Flow funktioniert
- [ ] Telefonnummer-Verifizierung funktioniert
- [ ] Welcome-Nachricht wird gesendet
- [ ] Event-Erstellung funktioniert
- [ ] Event-Erstellung sendet WhatsApp (wenn heute)
- [ ] Stripe Checkout funktioniert
- [ ] Stripe Webhook funktioniert
- [ ] Subscription-Status wird aktualisiert
- [ ] Morgen-Nachricht wird gesendet (teste am nächsten Tag um 6 Uhr)
- [ ] Salesforce OAuth2 Verbindung funktioniert
- [ ] Salesforce Test-Connection funktioniert
- [ ] Leads werden automatisch an Salesforce gesendet

---

### 12. Monitoring & Logs

- [ ] Vercel Logs aktivieren
- [ ] Error Tracking einrichten (optional: Sentry)
- [ ] n8n Workflow-Logs prüfen

---

## 🔄 Nach jedem Update

Wenn du neue Features hinzufügst:

1. [ ] Neue Environment Variables in Vercel setzen
2. [ ] Neue Datenbank-Migrationen ausführen
3. [ ] Build lokal testen
4. [ ] Deploy auf Vercel
5. [ ] Production-Tests durchführen

---

## 📝 Wichtige Notizen

- **Cron-Job Zeit:** Läuft stündlich (`0 * * * *`) und prüft für jedes Event, ob es 6 Uhr in dessen Zeitzone ist. Funktioniert für internationale Messen!
- **Event-Zeitzonen:** Jedes Event hat eine eigene Zeitzone. User wählt beim Erstellen die Zeitzone der Messe.
- **Rate Limiting:** In-Memory funktioniert, aber für Production besser Redis nutzen.
- **Webhook Security:** Alle Webhooks haben Secret-Verification.
- **E-Mail-Bestätigung:** Supabase sendet automatisch E-Mails, Double Opt-In ist implementiert.
- **Salesforce Integration:** OAuth2 Flow ist implementiert. User müssen nur einmalig autorisieren. Tokens werden automatisch erneuert. Client-Credentials-Weg ist vorbereitet (Coming soon).

---

## 🚨 Bekannte Issues / To-Do

- [ ] Upstash Redis für Production Rate Limiting einrichten
- [ ] Error Tracking (Sentry) einrichten
- [ ] Analytics einrichten (optional)

---

**Letzte Aktualisierung:** [Wird automatisch aktualisiert wenn neue Features hinzugefügt werden]
