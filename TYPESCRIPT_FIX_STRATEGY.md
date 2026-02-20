# TypeScript Fix Strategy - Context Knowledge

## 1. Das Kernproblem: "Never" Bug

### Problem
Die Supabase-Typgenerierung führt oft dazu, dass Tabellen oder Relationen als `never` erkannt werden, insbesondere bei:
- `.select()`
- `.update()`
- `.upsert()`
- `.rpc()`

### Lösung: Proaktive Query-Ketten-Absicherung

**WICHTIG:** Wenn ein Typfehler in einer Supabase-Abfrage auftritt, darf nicht nur die Zeile geflickt werden. Die gesamte Query-Kette muss durch Casting der `.from()` Methode abgesichert werden.

#### Muster für Write-Operationen:
```typescript
// ❌ FALSCH - nur das Objekt casten
await supabase.from("table").update({ data } as any);

// ✅ RICHTIG - die gesamte .from() Chain casten
await ((supabase.from("table") as any).update({ data }));
```

#### Muster für RPC-Aufrufe:
```typescript
// ❌ FALSCH
await supabase.rpc("function_name", { params });

// ✅ RICHTIG
await (supabase.rpc as any)("function_name", { params });
```

---

## 2. Relationen & Select-Casting

### Problem
TypeScript erkennt gejointe Tabellen (z.B. `leads(events(...))`) oft nicht korrekt.

### Regel: Typed-Variable nach jeder Select-Abfrage

**Muster:**
```typescript
// 1. Query ausführen
const { data: lead } = await supabase
  .from("leads")
  .select("*, events!inner(user_id)")
  .maybeSingle();

// 2. SOFORT Type Assertion erstellen
const leadTyped = lead as {
  id: string;
  events: { user_id: string };
} | null;

// 3. Ab jetzt nur noch leadTyped verwenden
if (!leadTyped || leadTyped.events.user_id !== user.id) {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
```

**Wichtig:** Erstelle die Type Assertion direkt nach der Query, nicht erst bei der Verwendung!

---

## 3. API-Route & Dashboard Scanning (Folder Logic)

### Strategie: Ganze Ordner scannen

Wenn ein Fehler in einer API-Route auftritt, **sofort** alle Dateien im gleichen Ordner prüfen:

#### Beispiel-Mapping:
- `src/app/api/phone/*` → Prüfe auch `src/app/api/n8n/*`
- `src/app/api/stripe/*` → Prüfe auch `src/app/api/webhooks/stripe/*`
- `src/app/api/crm/*` → Prüfe auch `src/app/api/salesforce/*` (Legacy)
- `src/app/dashboard/*` → Prüfe alle Dashboard-Seiten mit ähnlichen Queries

#### Stripe-Spezifisch:
In Stripe-Webhooks (`/api/webhooks/stripe/route.ts`) muss bei Objekten wie `invoice` oder `subscription` immer mit Type Assertions gearbeitet werden:

```typescript
// ❌ FALSCH
const subscriptionId = invoice.subscription as string | null;

// ✅ RICHTIG
const subscriptionId = (invoice as any).subscription as string | null;
const subscriptionTyped = subscription as Stripe.Subscription;
const currentPeriodEnd = (subscriptionTyped as any).current_period_end;
```

---

## 4. Häufige Fehler-Muster (Pre-Flight Checklist)

### Vor jedem Commit prüfen:

#### ✅ Zod Validierung
```typescript
// ❌ FALSCH
validated.error.errors

// ✅ RICHTIG
validated.error.issues
```

#### ✅ Rate Limiting Config
```typescript
// ❌ FALSCH
config: { limit: 3, window: 3600 }

// ✅ RICHTIG
config: { windowMs: 60 * 60 * 1000, maxRequests: 3 }
```

#### ✅ Supabase Writes
Jeder `.insert()`, `.update()` oder `.upsert()` Aufruf muss durch `as any` auf der `.from()` Ebene geschützt sein:

```typescript
// ✅ RICHTIG - Pattern für alle Write-Operationen
await ((supabase.from("table_name") as any).update({ data }));
await ((supabase.from("table_name") as any).upsert({ data }));
await ((supabase.from("table_name") as any).insert({ data }));
```

#### ✅ Null-Checks
Felder wie `ltd_events_used` benötigen einen Fallback:

```typescript
// ❌ FALSCH
if (profile.ltd_events_used >= 50) { ... }

// ✅ RICHTIG
if ((profileTyped.ltd_events_used ?? 0) >= 50) { ... }
```

#### ✅ Profile/Integration Queries
Nach jeder `profiles` oder `integrations` Query sofort Type Assertion:

```typescript
const { data: profile } = await supabase.from("profiles").select("...").maybeSingle();
const profileTyped = profile as { 
  plan_type: string | null; 
  ltd_events_used: number | null;
} | null;
```

---

## 5. Strategie für "Erfolgreiches Deployment"

### Batching: Fasse Fixes zusammen

**Gut:**
```bash
git commit -m "Fix: Add type assertions for all phone and n8n routes"
# Behebt mehrere Dateien in einem Commit
```

**Schlecht:**
```bash
git commit -m "Fix: Type error in phone/verify"
git commit -m "Fix: Type error in phone/request-verification"
git commit -m "Fix: Type error in n8n/send-morning-messages"
# Zu viele kleine Commits
```

### Antizipation: Prüfe .map() Verwendungen

Wenn eine Variable in einer `.map()` Funktion verwendet wird:

```typescript
// ❌ POTENTIELLER FEHLER
const eventIds = userEvents.map((e) => e.id);

// ✅ SOFORT PRÜFEN UND CASTEN
const userEventsTyped = userEvents as { id: string }[] | null;
const eventIds = (userEventsTyped || []).map((e) => e.id);
```

---

## 6. Quick Reference: Häufige Patterns

### Pattern 1: Select mit Relations
```typescript
const { data: items } = await supabase
  .from("table")
  .select("*, relation(field)");
const itemsTyped = items as Array<{
  id: string;
  relation: { field: string } | null;
}> | null;
```

### Pattern 2: Update Operation
```typescript
await ((supabase.from("table") as any)
  .update({ field: value })
  .eq("id", id));
```

### Pattern 3: Upsert Operation
```typescript
await ((supabase.from("table") as any)
  .upsert({ id, field: value }, { onConflict: "id" }));
```

### Pattern 4: RPC Call
```typescript
const { data, error } = await (supabase.rpc as any)(
  "function_name",
  { param: value }
);
```

### Pattern 5: Stripe Subscription
```typescript
const subscription = await stripe.subscriptions.update(...);
const subscriptionTyped = subscription as Stripe.Subscription;
const currentPeriodEnd = (subscriptionTyped as any).current_period_end;
```

---

## 7. Workflow bei neuen Fehlern

1. **Fehler identifizieren** → Welche Operation? (select/update/upsert/rpc)
2. **Ordner scannen** → Welche anderen Dateien im gleichen Ordner?
3. **Pattern anwenden** → Richtige Type Assertion hinzufügen
4. **Proaktiv prüfen** → Ähnliche Patterns in anderen Dateien?
5. **Batching** → Alle Fixes in einem Commit zusammenfassen

---

## 8. Dateien, die besonders anfällig sind

### High-Risk Dateien (immer prüfen):
- `src/app/api/webhooks/stripe/route.ts` (Stripe-Typen)
- `src/app/api/crm/callback/[crm]/route.ts` (Complex Relations)
- `src/app/api/phone/*` (Phone Numbers + Relations)
- `src/app/api/n8n/*` (Complex Event Relations)
- `src/app/dashboard/crm/page.tsx` (Integration Queries)
- Alle Dateien mit `.update()`, `.upsert()`, `.rpc()`

### Checkliste für diese Dateien:
- [ ] Alle `.from()` Chains mit `as any` gecastet?
- [ ] Alle Select-Queries haben Type Assertions?
- [ ] Alle `profile`/`integration` Queries getypt?
- [ ] Alle Stripe-Objekte mit `as any` für spezielle Felder?
- [ ] Null-Checks mit `??` vorhanden?

---

**Letzte Aktualisierung:** 2024-01-XX
**Status:** Aktiv in Verwendung
