# TypeScript Fix Plan - Systematische App-Scan

## Phase 1: Identifikation & Kategorisierung

### Kategorie A: Write-Operationen ohne `as any` auf `.from()`
**Status:** ⚠️ Potentiell problematisch

Dateien zu prüfen:
- [ ] `src/app/api/mails/send/route.ts` - `.update()` auf leads
- [ ] `src/app/api/leads/create/route.ts` - `.insert()` auf leads
- [ ] `src/app/api/events/create/route.ts` - `.insert()` auf events
- [ ] `src/app/api/crm/callback/[crm]/route.ts` - `.upsert()` auf integrations
- [ ] `src/app/api/leads/update/route.ts` - `.update()` auf leads (bereits gefixt?)
- [ ] `src/app/api/leads/toggle-delete/route.ts` - `.update()` auf leads (bereits gefixt?)

### Kategorie B: Select-Queries mit Relations
**Status:** ⚠️ Potentiell problematisch

Dateien zu prüfen:
- [ ] Alle Dateien mit `!inner` oder `!left` Joins
- [ ] Alle Dateien mit verschachtelten Selects (z.B. `events(user_id)`)

### Kategorie C: Profile/Integration Queries
**Status:** ⚠️ Potentiell problematisch

Dateien zu prüfen:
- [ ] Alle Dateien mit `.from("profiles")`
- [ ] Alle Dateien mit `.from("integrations")`

### Kategorie D: Stripe-bezogene Dateien
**Status:** ⚠️ Potentiell problematisch

Dateien zu prüfen:
- [ ] `src/app/api/webhooks/stripe/route.ts`
- [ ] `src/app/api/stripe/cancel-subscription/route.ts`
- [ ] `src/app/api/stripe/checkout/route.ts`
- [ ] `src/app/api/stripe/portal/route.ts`

### Kategorie E: Dashboard Pages
**Status:** ⚠️ Potentiell problematisch

Dateien zu prüfen:
- [ ] `src/app/dashboard/crm/page.tsx` (bereits teilweise gefixt)
- [ ] `src/app/dashboard/downloads/page.tsx` (bereits gefixt)
- [ ] `src/app/dashboard/events/page.tsx` (bereits gefixt)
- [ ] `src/app/dashboard/leads/page.tsx` (bereits gefixt)
- [ ] `src/app/dashboard/mails/page.tsx`
- [ ] `src/app/dashboard/profile/page.tsx`
- [ ] `src/app/dashboard/settings/page.tsx`
- [ ] `src/app/dashboard/seats/page.tsx`

---

## Phase 2: Systematische Prüfung

### Schritt 1: Prüfe alle Write-Operationen
```bash
# Finde alle .update(), .upsert(), .insert() ohne as any auf .from()
grep -r "\.from.*\)\s*\.\(update\|upsert\|insert\)" src/app/api --include="*.ts"
```

**Checkliste pro Datei:**
- [ ] Ist `.from()` mit `as any` gecastet?
- [ ] Wird die gesamte Chain gecastet, nicht nur das Objekt?

### Schritt 2: Prüfe alle Select-Queries mit Relations
```bash
# Finde alle Select-Queries mit Relations
grep -r "\.select.*!inner\|!left\|(" src/app --include="*.ts" --include="*.tsx"
```

**Checkliste pro Datei:**
- [ ] Wird direkt nach der Query eine Type Assertion erstellt?
- [ ] Wird die getypte Variable überall verwendet?

### Schritt 3: Prüfe Profile/Integration Queries
```bash
# Finde alle profiles/integrations Queries
grep -r "\.from\(\"profiles\"\)\|\.from\(\"integrations\"\)" src/app --include="*.ts" --include="*.tsx"
```

**Checkliste pro Datei:**
- [ ] Wird direkt nach der Query eine Type Assertion erstellt?
- [ ] Werden alle Felder korrekt typisiert?

### Schritt 4: Prüfe Stripe-Dateien
**Checkliste pro Datei:**
- [ ] Werden `subscription` Objekte mit `as Stripe.Subscription` gecastet?
- [ ] Werden spezielle Felder wie `current_period_end` mit `as any` zugegriffen?
- [ ] Werden `invoice` Objekte korrekt behandelt?

---

## Phase 3: Batch-Fixes

### Batch 1: API Routes - Write Operations
**Ziel:** Alle `.update()`, `.upsert()`, `.insert()` absichern

**Dateien:**
1. `src/app/api/mails/send/route.ts`
2. `src/app/api/leads/create/route.ts`
3. `src/app/api/events/create/route.ts`
4. `src/app/api/crm/callback/[crm]/route.ts`

**Commit:** `fix: Add as any casting for all write operations in API routes`

### Batch 2: API Routes - Select Queries mit Relations
**Ziel:** Alle Select-Queries mit Relations typisieren

**Dateien zu prüfen:**
- Alle Dateien mit `!inner` oder verschachtelten Selects

**Commit:** `fix: Add type assertions for all select queries with relations`

### Batch 3: Profile/Integration Queries
**Ziel:** Alle `profiles` und `integrations` Queries typisieren

**Dateien zu prüfen:**
- Alle Dateien mit `.from("profiles")` oder `.from("integrations")`

**Commit:** `fix: Add type assertions for all profile and integration queries`

### Batch 4: Dashboard Pages
**Ziel:** Alle Dashboard-Seiten mit Queries typisieren

**Dateien:**
1. `src/app/dashboard/mails/page.tsx`
2. `src/app/dashboard/profile/page.tsx`
3. `src/app/dashboard/settings/page.tsx`
4. `src/app/dashboard/seats/page.tsx`

**Commit:** `fix: Add type assertions for all dashboard page queries`

### Batch 5: Stripe-spezifische Fixes
**Ziel:** Alle Stripe-Objekte korrekt behandeln

**Dateien:**
1. `src/app/api/webhooks/stripe/route.ts` (bereits teilweise gefixt)
2. `src/app/api/stripe/cancel-subscription/route.ts` (bereits gefixt)
3. `src/app/api/stripe/checkout/route.ts`
4. `src/app/api/stripe/portal/route.ts`

**Commit:** `fix: Add type assertions for all Stripe objects`

---

## Phase 4: Verifikation

### Build-Test
```bash
npm run build
```

### Linter-Check
```bash
# Prüfe alle geänderten Dateien
npm run lint
```

### Final Commit
```bash
git add .
git commit -m "fix: Complete TypeScript type safety improvements across entire app"
```

---

## Priorisierung

### 🔴 Hoch (sofort beheben)
- Write-Operationen ohne `as any` auf `.from()`
- Select-Queries mit Relations ohne Type Assertions

### 🟡 Mittel (nächste Schritte)
- Profile/Integration Queries ohne Type Assertions
- Dashboard Pages ohne Type Assertions

### 🟢 Niedrig (wenn Zeit)
- Stripe-spezifische Verbesserungen (bereits größtenteils gefixt)

---

## Workflow

1. **Scannen** → Identifiziere alle problematischen Stellen
2. **Kategorisieren** → Gruppiere nach Typ (Write/Select/Stripe/Dashboard)
3. **Fixen** → Batch-weise beheben
4. **Testen** → Build nach jedem Batch
5. **Committen** → Logische Commits erstellen

---

**Erstellt:** 2024-01-XX
**Status:** Bereit zur Ausführung
