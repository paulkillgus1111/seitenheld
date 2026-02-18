# Salesforce OAuth2 Setup Guide

## 📋 Übersicht

Dieser Guide führt dich durch die Einrichtung der Salesforce OAuth2 Integration für Seitenheld.

## ✅ Schritt 1: Salesforce Developer Account erstellen

1. Gehe zu: https://developer.salesforce.com/signup
2. Fülle das Formular aus:
   - **First Name**: Dein Vorname
   - **Last Name**: Dein Nachname
   - **Email**: Deine E-Mail-Adresse
   - **Username**: Wähle einen eindeutigen Username (z.B. `deinname-seitenheld`)
   - **Password**: Sicheres Passwort
   - **Company**: Seitenheld (oder dein Unternehmen)
   - **Country**: Deutschland
3. Klicke auf **"Sign me up"**
4. Bestätige deine E-Mail-Adresse
5. **Fertig!** Du hast jetzt einen kostenlosen Salesforce Developer Account

**Hinweis:** Der Account ist kostenlos und hat keine Laufzeitbegrenzung.

---

## ✅ Schritt 2: Connected App in Salesforce erstellen

1. **Logge dich in Salesforce ein**
   - Gehe zu: https://login.salesforce.com
   - Logge dich mit deinem neuen Account ein

2. **Öffne Setup**
   - Klicke auf das **Zahnrad-Symbol** (oben rechts)
   - Wähle **"Setup"**

3. **Navigiere zu App Manager**
   - Im linken Menü: **Platform Tools** → **Apps** → **App Manager**
   - Oder suche nach "App Manager" in der Quick Find Box

4. **Erstelle neue Connected App**
   - Klicke auf **"New Connected App"** (oben rechts)

5. **Basic Information ausfüllen**
   - **Connected App Name**: `Seitenheld Integration`
   - **API Name**: `Seitenheld_Integration` (wird automatisch generiert)
   - **Contact Email**: Deine E-Mail-Adresse
   - **Description**: `Integration für Seitenheld CRM` (optional)

6. **OAuth Settings konfigurieren**
   - ✅ **Enable OAuth Settings** aktivieren
   - **Callback URL**: 
     - Development: `http://localhost:3000/api/salesforce/callback`
     - Production: `https://deine-domain.com/api/salesforce/callback`
   - **Selected OAuth Scopes**: Wähle folgende Scopes:
     - ✅ `Access and manage your data (api)`
     - ✅ `Perform requests on your behalf at any time (refresh_token, offline_access)`
   - **Require Secret for Web Server Flow**: ✅ Aktiviert (Standard)

7. **Speichern**
   - Klicke auf **"Save"**
   - **WICHTIG:** Salesforce zeigt jetzt eine Warnung, dass die App in 2-10 Minuten verfügbar ist
   - Klicke auf **"Continue"**

8. **Consumer Key und Secret notieren**
   - Nach dem Speichern siehst du die **Consumer Key** (Client ID)
   - Klicke auf **"Click to reveal"** neben **Consumer Secret**
   - **Kopiere beide Werte** und speichere sie sicher (du brauchst sie gleich!)

**⚠️ WICHTIG:** 
- Die Connected App kann 2-10 Minuten brauchen, bis sie aktiv ist
- Wenn du den Secret verlierst, musst du eine neue Connected App erstellen

---

## ✅ Schritt 3: Environment Variables setzen

1. **Öffne `.env.local`** im Projekt-Root

2. **Füge folgende Variablen hinzu:**

```env
# Salesforce OAuth2 Configuration
SALESFORCE_CLIENT_ID=deine_consumer_key_hier
SALESFORCE_CLIENT_SECRET=dein_consumer_secret_hier
SALESFORCE_REDIRECT_URI=http://localhost:3000/api/salesforce/callback

# Optional: Für Sandbox/Test-Umgebung
# SALESFORCE_AUTH_URL=https://test.salesforce.com
# SALESFORCE_TOKEN_URL=https://test.salesforce.com
```

3. **Ersetze die Platzhalter:**
   - `deine_consumer_key_hier` → Deine Consumer Key aus Schritt 2
   - `dein_consumer_secret_hier` → Dein Consumer Secret aus Schritt 2

4. **Speichere die Datei**

**Hinweis:** Für Production musst du diese Variablen auch in Vercel setzen:
- Vercel Dashboard → Dein Projekt → Settings → Environment Variables
- `SALESFORCE_REDIRECT_URI` muss dann deine Production-URL sein

---

## ✅ Schritt 4: Datenbank-Migration ausführen

1. **Öffne Supabase Dashboard**
   - Gehe zu: https://supabase.com/dashboard
   - Wähle dein Projekt

2. **Öffne SQL Editor**
   - Im linken Menü: **SQL Editor**
   - Klicke auf **"New query"**

3. **Führe Migration aus**
   - Öffne die Datei `SUPABASE_SALESFORCE_OAUTH2.sql`
   - Kopiere den gesamten Inhalt
   - Füge ihn in den SQL Editor ein
   - Klicke auf **"Run"** (oder `Cmd/Ctrl + Enter`)

4. **Prüfe Erfolg**
   - Du solltest eine Erfolgsmeldung sehen
   - Die `integrations` Tabelle wurde erweitert

---

## ✅ Schritt 5: Server starten und testen

1. **Server starten**
   ```bash
   npm run dev
   ```

2. **Zu CRM-Seite navigieren**
   - Gehe zu: http://localhost:3000/dashboard/crm
   - Du solltest die Salesforce-Integration-Seite sehen

3. **Verbindung testen**
   - Klicke auf **"Mit Salesforce verbinden"**
   - Du wirst zu Salesforce weitergeleitet
   - Logge dich ein (falls nicht bereits eingeloggt)
   - Klicke auf **"Allow"** um die Integration zu autorisieren
   - Du wirst zurück zu `/dashboard/crm?connected=true` geleitet

4. **Erfolg prüfen**
   - Du solltest eine grüne Erfolgsmeldung sehen
   - Status sollte "Verbunden" sein
   - Klicke auf **"Verbindung testen"** um einen Test-Lead zu erstellen

---

## 🔧 Troubleshooting

### Problem: "Salesforce not configured"
**Lösung:** 
- Prüfe ob Environment Variables gesetzt sind
- Server neu starten nach Änderungen

### Problem: "Invalid redirect_uri"
**Lösung:**
- Prüfe ob Callback URL in Connected App genau übereinstimmt
- Muss exakt sein: `http://localhost:3000/api/salesforce/callback` (kein `/` am Ende!)

### Problem: "Connected App not found"
**Lösung:**
- Warte 2-10 Minuten nach Erstellung der Connected App
- Prüfe ob Consumer Key korrekt ist

### Problem: "Token exchange failed"
**Lösung:**
- Prüfe ob Consumer Secret korrekt ist
- Prüfe ob Connected App aktiviert ist
- Prüfe ob OAuth Scopes korrekt gesetzt sind

### Problem: "Salesforce instance URL not found"
**Lösung:**
- Prüfe ob OAuth Flow erfolgreich war
- Versuche Verbindung erneut herzustellen

---

## 📝 Nächste Schritte

Nach erfolgreicher Verbindung:

1. **Feld-Mapping konfigurieren**
   - Wähle welche Lead-Felder an Salesforce übertragen werden sollen
   - Klicke auf "Mapping speichern"

2. **Automatischer Sync**
   - Neue Leads werden automatisch an Salesforce gesendet
   - Funktioniert nur wenn Verbindung aktiv ist

3. **Production Setup**
   - Erstelle Connected App für Production (andere Callback URL)
   - Setze Environment Variables in Vercel
   - Update Callback URL in Connected App

---

## 🎉 Fertig!

Die Salesforce OAuth2 Integration ist jetzt eingerichtet und funktionsfähig!

Bei Fragen oder Problemen, schaue in die [Salesforce-Dokumentation](https://help.salesforce.com/s/articleView?id=sf.connected_app_create.htm).
