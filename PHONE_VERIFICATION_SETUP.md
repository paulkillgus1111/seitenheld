# Telefonnummer-Verifizierung über WhatsApp

## Umgebungsvariablen

Füge folgende Umgebungsvariable zu deiner `.env.local` Datei hinzu:

```env
# n8n Webhook für WhatsApp-Verifizierung
N8N_VERIFICATION_WEBHOOK_URL=https://seitenheld.app.n8n.cloud/webhook/96538d91-730e-43d6-b458-5abcd16d662a
```

**Hinweis:** Falls nicht gesetzt, wird die Standard-URL verwendet.

## Datenbank-Migration

Führe die SQL-Migration aus:
```bash
# In Supabase SQL Editor
# Führe SUPABASE_PHONE_VERIFICATION.sql aus
```

Dies fügt folgende Felder zur `phone_numbers` Tabelle hinzu:
- `verified` (boolean) - Ist die Telefonnummer verifiziert?
- `verification_code` (text) - 6-stelliger Verifizierungscode
- `verification_code_expires_at` (timestamptz) - Ablaufzeitpunkt (10 Minuten)
- `verification_attempts` (integer) - Anzahl fehlgeschlagener Versuche
- `last_verification_request_at` (timestamptz) - Zeitpunkt der letzten Anfrage

## n8n Workflow Setup

### Erwartetes Datenformat (von Next.js)

```json
{
  "type": "phone_verification",
  "phone_number": "+4915123456789",
  "verification_code": "123456",
  "user_name": "Max Mustermann",
  "expires_in_minutes": 10
}
```

### n8n Workflow sollte:

1. **Webhook Node** empfängt POST-Request
2. **WhatsApp Node** sendet Nachricht mit Code
3. **Response Node** gibt Erfolg zurück

### Beispiel WhatsApp-Nachricht:

```
Hallo Max Mustermann,

Dein Verifizierungscode für Seitenheld:

🔐 123456

Dieser Code ist 10 Minuten gültig.

Falls du diesen Code nicht angefordert hast, ignoriere diese Nachricht.
```

## Funktionsweise

### 1. Onboarding-Flow

1. User gibt Telefonnummer ein
2. Seat wird erstellt (nicht verifiziert)
3. User kann Verifizierungscode anfordern
4. Code wird per WhatsApp gesendet
5. User gibt Code ein
6. Telefonnummer wird verifiziert
7. Weiterleitung zum Dashboard

### 2. Seats-Seite

1. User kann neue Seats hinzufügen (nicht verifiziert)
2. User kann bestehende Seats bearbeiten
3. Wenn Telefonnummer geändert wird → Verifizierung wird zurückgesetzt
4. User kann "Verifizieren" Button klicken
5. Code wird per WhatsApp gesendet
6. User gibt Code ein
7. Telefonnummer wird verifiziert

## Sicherheitsfeatures

- **Rate Limiting**: Maximal 3 Code-Anfragen pro Stunde pro User
- **Code-Gültigkeit**: 10 Minuten
- **Max. Versuche**: 5 fehlgeschlagene Versuche pro Stunde pro Telefonnummer
- **Code-Löschung**: Nach erfolgreicher Verifizierung wird Code gelöscht
- **Code-Generierung**: 6-stellig, zufällig (100000-999999)

## API-Routen

### POST `/api/phone/request-verification`

Sendet Verifizierungscode per WhatsApp.

**Request:**
```json
{
  "phone_number_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verifizierungscode wurde per WhatsApp gesendet",
  "expires_at": "2026-02-14T13:38:04.000Z"
}
```

### POST `/api/phone/verify`

Verifiziert den eingegebenen Code.

**Request:**
```json
{
  "phone_number_id": "uuid",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Telefonnummer erfolgreich verifiziert"
}
```

## UI-Komponenten

- `PhoneVerification` - Wiederverwendbare Verifizierungs-Komponente
- Integriert in:
  - Onboarding-Seite (`/onboarding`)
  - Seats-Seite (`/dashboard/seats`)

## Wichtige Hinweise

- **Verifizierung ist erforderlich**: Telefonnummern müssen verifiziert sein, bevor sie für Leads verwendet werden können
- **Automatische Zurücksetzung**: Wenn eine Telefonnummer geändert wird, wird die Verifizierung automatisch zurückgesetzt
- **WhatsApp-Versand**: Falls WhatsApp-Versand fehlschlägt, wird der Code trotzdem generiert (User kann erneut anfordern)
