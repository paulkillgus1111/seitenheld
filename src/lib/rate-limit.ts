// Rate Limiting Utility
// Verwendet in-memory Store für Development, kann für Production auf Redis/Upstash erweitert werden

type RateLimitStore = {
  [key: string]: {
    count: number;
    resetAt: number;
  };
};

// In-memory Store (für Development/kleine Apps)
// Für Production sollte Redis oder Upstash verwendet werden
const store: RateLimitStore = {};

// Cleanup alte Einträge alle 5 Minuten (nur im Node.js Environment)
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  if (typeof setInterval !== "undefined") {
    setInterval(() => {
      const now = Date.now();
      Object.keys(store).forEach((key) => {
        if (store[key].resetAt < now) {
          delete store[key];
        }
      });
    }, 5 * 60 * 1000); // 5 Minuten
  }
}

export type RateLimitConfig = {
  windowMs: number; // Zeitfenster in Millisekunden
  maxRequests: number; // Maximale Requests pro Zeitfenster
  identifier?: string; // Optional: Zusätzlicher Identifier (z.B. user_id)
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Timestamp wann das Limit zurückgesetzt wird
};

/**
 * Prüft ob ein Request innerhalb des Rate Limits liegt
 * @param identifier - Eindeutiger Identifier (z.B. IP-Adresse oder user_id)
 * @param config - Rate Limit Konfiguration
 * @returns RateLimitResult
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const { windowMs, maxRequests } = config;
  const now = Date.now();
  const key = config.identifier
    ? `${identifier}:${config.identifier}`
    : identifier;

  const entry = store[key];

  // Wenn kein Eintrag existiert oder abgelaufen, erstelle neuen
  if (!entry || entry.resetAt < now) {
    store[key] = {
      count: 1,
      resetAt: now + windowMs,
    };
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: now + windowMs,
    };
  }

  // Prüfe ob Limit erreicht
  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetAt,
    };
  }

  // Inkrementiere Counter
  entry.count += 1;

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetAt,
  };
}

/**
 * Rate Limit Konfigurationen für verschiedene Endpoints
 */
export const rateLimitConfigs = {
  // Strikte Limits für Auth-Endpoints (Brute-Force-Schutz)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 Minuten
    maxRequests: 5, // 5 Versuche pro 15 Minuten
  },
  // Moderate Limits für API-Endpoints
  api: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 60, // 60 Requests pro Minute
  },
  // Strikte Limits für Lead-Erstellung (Spam-Schutz)
  leadCreate: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 20, // 20 Leads pro Minute
  },
  // Moderate Limits für E-Mail-Versand
  emailSend: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 40, // 40 E-Mails pro Minute
  },
  // Strikte Limits für Seat-Erstellung
  seatCreate: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 5, // 5 Seats pro Minute
  },
  // Moderate Limits für Event-Erstellung
  eventCreate: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 10, // 10 Events pro Minute
  },
  // Limits für Telefonnummer-Verifizierung (Brute-Force-Schutz)
  phoneVerify: {
    windowMs: 60 * 60 * 1000, // 1 Stunde
    maxRequests: 10, // 10 Versuche pro Stunde
  },
  // Limits für Lead-Updates
  leadUpdate: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 30, // 30 Updates pro Minute
  },
  // Strikte Limits für Stripe Checkout (Payment-Schutz)
  checkout: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 5, // 5 Checkout-Sessions pro Minute
  },
  // Generische API-Limits
  default: {
    windowMs: 60 * 1000, // 1 Minute
    maxRequests: 100, // 100 Requests pro Minute
  },
};

/**
 * Helper-Funktion um IP-Adresse aus Request zu extrahieren
 * Unterstützt sowohl Request als auch NextRequest
 */
export function getClientIdentifier(
  request: Request | { headers: Headers }
): string {
  const headers = request.headers;

  // Prüfe X-Forwarded-For Header (für Vercel/Proxies)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Nimm die erste IP (Client-IP)
    return forwarded.split(",")[0].trim();
  }

  // Prüfe X-Real-IP Header
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback: Verwende "unknown" (sollte nicht vorkommen in Production)
  return "unknown";
}
