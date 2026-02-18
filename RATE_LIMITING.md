# Rate Limiting Dokumentation

## Übersicht

Rate Limiting wurde implementiert, um die API vor Missbrauch, DDoS-Angriffe und Brute-Force-Attacken zu schützen.

## Implementierung

### In-Memory Store (Development)

Die aktuelle Implementierung verwendet einen in-memory Store, der für Development und kleine Apps ausreichend ist.

**Vorteile:**
- Keine zusätzlichen Dependencies
- Einfach zu verwenden
- Funktioniert sofort

**Nachteile:**
- Nicht persistent (verliert Daten bei Server-Neustart)
- Nicht skalierbar über mehrere Server-Instanzen
- Begrenzte Memory-Nutzung

### Production-Empfehlung

Für Production sollte ein Redis-basierter Store verwendet werden:

**Option 1: Upstash Redis**
```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});
```

**Option 2: Vercel KV (Redis)**
```typescript
import { kv } from "@vercel/kv";
// Implementierung ähnlich wie Upstash
```

## Rate Limit Konfigurationen

### Auth-Endpoints (Brute-Force-Schutz)
- **Limit**: 5 Requests pro 15 Minuten
- **Zweck**: Verhindert Brute-Force-Angriffe auf Login/Passwort-Reset

### Lead-Erstellung (Spam-Schutz)
- **Limit**: 10 Leads pro Minute
- **Zweck**: Verhindert Spam und Mass-Erstellung von Leads

### E-Mail-Versand
- **Limit**: 20 E-Mails pro Minute
- **Zweck**: Verhindert E-Mail-Missbrauch (zusätzlich zum täglichen Limit von 20)

### Seat-Erstellung
- **Limit**: 5 Seats pro Minute
- **Zweck**: Verhindert Missbrauch der Seat-Funktion

### Stripe Checkout (Payment-Schutz)
- **Limit**: 5 Checkout-Sessions pro Minute
- **Zweck**: Verhindert Checkout-Spam und unnötige Stripe-API-Calls

### Event-Erstellung
- **Limit**: 10 Events pro Minute
- **Zweck**: Verhindert Mass-Erstellung von Events

### Generische API-Limits
- **Limit**: 100 Requests pro Minute
- **Zweck**: Standard-Limit für alle anderen API-Endpoints

## Verwendung

### In API Routes

```typescript
import { withRateLimit, rateLimitConfigs } from "@/lib/rate-limit-middleware";

export async function POST(request: Request) {
  // Session-Check
  const session = await getSession();
  
  // Rate Limiting
  const rateLimitResult = await withRateLimit(request, {
    config: rateLimitConfigs.leadCreate,
    identifier: session?.user?.id, // Optional: User-ID für user-basierte Limits
  });

  if (!rateLimitResult.success) {
    return rateLimitResult.response; // 429 Too Many Requests
  }

  // Weiter mit normaler Logik...
}
```

## Rate Limit Headers

Die API antwortet mit folgenden Headers:

- `X-RateLimit-Limit`: Maximale Anzahl Requests
- `X-RateLimit-Remaining`: Verbleibende Requests
- `X-RateLimit-Reset`: Timestamp wann das Limit zurückgesetzt wird
- `Retry-After`: Sekunden bis zum Reset (bei 429)

## Fehlerbehandlung

Bei Überschreitung des Limits:

```json
{
  "error": "Rate limit exceeded",
  "message": "Zu viele Anfragen. Bitte versuche es später erneut.",
  "retryAfter": 45
}
```

**Status Code**: `429 Too Many Requests`

## Aktuell geschützte Endpoints

- ✅ `/api/leads/create` - 10 Leads/Minute
- ✅ `/api/mails/send` - 20 E-Mails/Minute
- ✅ `/api/stripe/checkout` - 5 Checkouts/Minute
- ✅ `/api/seats/create` - 5 Seats/Minute

## Zukünftige Erweiterungen

1. **Redis/Upstash Integration** für Production
2. **IP-basierte Whitelist** für vertrauenswürdige IPs
3. **User-basierte Limits** für Premium-User
4. **Dynamische Limits** basierend auf Subscription-Plan
5. **Rate Limit Monitoring** und Alerting

## Migration zu Production

Um auf Redis/Upstash umzusteigen:

1. Installiere `@upstash/ratelimit` oder `@vercel/kv`
2. Erstelle neue `rate-limit-redis.ts` Datei
3. Ersetze `checkRateLimit` Funktion mit Redis-Implementierung
4. Setze Environment Variables für Redis-Connection

Die Middleware-API bleibt gleich, nur die Backend-Implementierung ändert sich.
