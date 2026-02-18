# Stripe Subscription System Setup

## Umgebungsvariablen

Füge folgende Umgebungsvariablen zu deiner `.env.local` Datei hinzu:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (aus Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_MESSE_PASS=price_...
NEXT_PUBLIC_STRIPE_PRICE_ID_LTD=price_...

# App URL (für Redirects)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Stripe Dashboard Setup

1. **Produkte erstellen**:
   - Jahresabo: 9,95€/Monat, jährlich abgerechnet (Recurring Subscription, Billing Period: Year, jährlich kündbar)
   - Messe-Pass: 39,95€ (One-time Payment)
   - LTD: 299,95€ (One-time Payment)

2. **Price IDs kopieren**:
   - Gehe zu jedem Produkt → Kopiere die Price ID
   - Füge sie in `.env.local` ein

3. **Webhook konfigurieren**:
   - Gehe zu Stripe Dashboard → Developers → Webhooks
   - Erstelle neuen Webhook-Endpoint: `https://deine-domain.com/api/webhooks/stripe`
   - Wähle folgende Events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Kopiere das Webhook Secret → Füge es in `.env.local` ein

4. **Customer Portal aktivieren**:
   - Gehe zu Stripe Dashboard → Settings → Billing → Customer portal
   - Aktiviere das Customer Portal
   - Konfiguriere erlaubte Features (Kündigung, Zahlungsmethoden, etc.)

## Datenbank-Migration

Führe die SQL-Migration aus:
```bash
# In Supabase SQL Editor
# Führe SUPABASE_UPDATE_STRIPE_SUBSCRIPTION.sql aus
```

## Testen

1. **Test-Modus**:
   - Verwende Stripe Test-Keys (`pk_test_...`, `sk_test_...`)
   - Verwende Test-Kreditkarten: `4242 4242 4242 4242`

2. **Webhook Testing**:
   - Verwende Stripe CLI für lokales Testing:
     ```bash
     stripe listen --forward-to localhost:3000/api/webhooks/stripe
     ```
   - Oder verwende Stripe Dashboard → Webhooks → Test-Webhook senden

3. **Checkout Flow**:
   - Gehe zu `/dashboard/pricing`
   - Wähle einen Plan
   - Führe Checkout durch
   - Prüfe, ob Webhook-Events ankommen
   - Prüfe, ob Profile in Supabase aktualisiert wird

## Wichtige Hinweise

- **Webhook Security**: Die Signature-Verifikation ist kritisch für Produktion
- **Idempotenz**: Webhook-Handler sind idempotent (können mehrfach verarbeitet werden)
- **Error Handling**: Alle Fehler werden geloggt
- **Status-Synchronisation**: Profile-Status sollte immer mit Stripe synchron sein
