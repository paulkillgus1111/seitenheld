# TypeScript Fix Action Plan - Konkrete Schritte

## 🎯 Ziel
Alle TypeScript-Fehler systematisch beheben, basierend auf TYPESCRIPT_FIX_STRATEGY.md

---

## Phase 1: Write-Operationen Fixen (PRIORITÄT 1)

### Dateien, die `.insert()` mit `as any` auf Objekt haben (sollte auf `.from()` sein):

1. **`src/app/api/events/create/route.ts`** (Zeile 93-106)
   - ❌ Aktuell: `.insert({ ... } as any)`
   - ✅ Sollte sein: `((supabase.from("events") as any).insert({ ... }))`

2. **`src/app/api/leads/create/route.ts`** (Zeile 132-139)
   - ❌ Aktuell: `.insert({ ... } as any)`
   - ✅ Sollte sein: `((supabase.from("leads") as any).insert({ ... }))`

### Dateien, die `.update()` auf leads haben (prüfen ob bereits gefixt):

3. **`src/app/api/mails/send/route.ts`** (Zeile ~250)
   - Prüfen ob `.update()` auf leads bereits mit `as any` auf `.from()` gecastet ist

---

## Phase 2: Systematische Prüfung aller Write-Operationen

### Checkliste für jede Datei mit `.update()`, `.upsert()`, `.insert()`:

```bash
# Finde alle Write-Operationen
grep -r "\.from.*\)\s*\.\(update\|upsert\|insert\)" src/app/api --include="*.ts" -A 2
```

**Für jede gefundene Stelle:**
- [ ] Ist `.from()` mit `as any` gecastet?
- [ ] Wird die gesamte Chain gecastet: `((supabase.from("table") as any).update(...))`?

---

## Phase 3: Select-Queries mit Relations prüfen

### Dateien mit Relations zu prüfen:

1. **`src/app/api/leads/update/route.ts`**
   - Prüfen: `select("id, event_id, events!inner(user_id)")`
   - ✅ Sollte bereits gefixt sein (leadTyped)

2. **`src/app/api/leads/toggle-delete/route.ts`**
   - Prüfen: `select("id, event_id, events!inner(user_id)")`
   - ✅ Sollte bereits gefixt sein (leadTyped)

3. **Alle anderen Dateien mit `!inner` oder `!left`**

---

## Phase 4: Dashboard Pages prüfen

### Noch nicht geprüfte Dashboard-Seiten:

1. **`src/app/dashboard/mails/page.tsx`**
   - Prüfen auf Select-Queries ohne Type Assertions

2. **`src/app/dashboard/profile/page.tsx`**
   - Prüfen auf Select-Queries ohne Type Assertions

3. **`src/app/dashboard/settings/page.tsx`**
   - Prüfen auf Select-Queries ohne Type Assertions

4. **`src/app/dashboard/seats/page.tsx`**
   - Prüfen auf Select-Queries ohne Type Assertions

---

## Konkrete Aktionen - JETZT

### Schritt 1: Fix Write-Operationen (Batch 1)
```typescript
// Datei: src/app/api/events/create/route.ts
// ALT:
const { data: newEvent, error: insertError } = await supabase
  .from("events")
  .insert({ ... } as any)

// NEU:
const { data: newEvent, error: insertError } = await ((supabase
  .from("events") as any)
  .insert({ ... }))
```

### Schritt 2: Fix Write-Operationen (Batch 2)
```typescript
// Datei: src/app/api/leads/create/route.ts
// ALT:
const { data: newLead, error } = await supabase
  .from("leads")
  .insert({ ... } as any)

// NEU:
const { data: newLead, error } = await ((supabase
  .from("leads") as any)
  .insert({ ... }))
```

### Schritt 3: Prüfe mails/send/route.ts
- Prüfen ob `.update()` auf leads bereits korrekt gecastet ist

---

## Execution Order

1. ✅ **JETZT:** Fix `events/create/route.ts` - `.insert()` auf `.from()` casten
2. ✅ **JETZT:** Fix `leads/create/route.ts` - `.insert()` auf `.from()` casten
3. ⏭️ **DANN:** Prüfe `mails/send/route.ts` - `.update()` prüfen
4. ⏭️ **DANN:** Systematisch alle anderen Write-Operationen prüfen
5. ⏭️ **DANN:** Dashboard Pages prüfen
6. ⏭️ **DANN:** Build-Test und Commit

---

**Status:** Bereit zur Ausführung
**Nächster Schritt:** Fix Batch 1 (events/create + leads/create)
