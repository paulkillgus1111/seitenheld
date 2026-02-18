// Rate Limiting Middleware für API Routes
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getClientIdentifier,
  rateLimitConfigs as _rateLimitConfigs,
  type RateLimitConfig,
} from "./rate-limit";

// Re-export rateLimitConfigs für einfachere Imports
export const rateLimitConfigs = _rateLimitConfigs;

// Helper um Request zu NextRequest zu konvertieren (für API Routes)
function requestToNextRequest(request: Request): NextRequest {
  return request as unknown as NextRequest;
}

export type RateLimitOptions = {
  config: RateLimitConfig;
  identifier?: string; // Optional: Zusätzlicher Identifier (z.B. user_id)
  skipOnSuccess?: boolean; // Skip Rate Limit Check wenn Request erfolgreich ist
};

/**
 * Rate Limiting Middleware für API Routes
 * Unterstützt sowohl NextRequest als auch Request (für API Routes)
 * Verwendung:
 * ```typescript
 * const rateLimitResult = await withRateLimit(request, {
 *   config: rateLimitConfigs.api,
 *   identifier: session?.user?.id, // Optional: User-ID für user-basierte Limits
 * });
 * 
 * if (!rateLimitResult.success) {
 *   return rateLimitResult.response;
 * }
 * ```
 */
export async function withRateLimit(
  request: NextRequest | Request,
  options: RateLimitOptions
): Promise<
  | { success: true; response: null }
  | { success: false; response: NextResponse }
> {
  // Konvertiere Request zu NextRequest falls nötig
  const nextRequest =
    request instanceof Request
      ? requestToNextRequest(request)
      : request;
  const { config, identifier } = options;

  // Hole Client-Identifier (IP-Adresse)
  // getClientIdentifier unterstützt sowohl Request als auch NextRequest
  const clientIp = getClientIdentifier(nextRequest);

  // Kombiniere IP + optionaler Identifier (z.B. user_id)
  const rateLimitKey = identifier ? `${clientIp}:${identifier}` : clientIp;

  // Prüfe Rate Limit
  const result = checkRateLimit(rateLimitKey, config);

  if (!result.success) {
    // Rate Limit überschritten
    const response = NextResponse.json(
      {
        error: "Rate limit exceeded",
        message: "Zu viele Anfragen. Bitte versuche es später erneut.",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000), // Sekunden bis Reset
      },
      { status: 429 }
    );

    // Setze Rate Limit Headers
    response.headers.set("X-RateLimit-Limit", String(result.limit));
    response.headers.set("X-RateLimit-Remaining", String(result.remaining));
    response.headers.set("X-RateLimit-Reset", String(result.reset));
    response.headers.set(
      "Retry-After",
      String(Math.ceil((result.reset - Date.now()) / 1000))
    );

    return { success: false, response };
  }

  // Rate Limit OK - Setze Headers für Client-Information
  return { success: true, response: null };
}

/**
 * Helper-Funktion um Rate Limit Headers zu einer Response hinzuzufügen
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; reset: number }
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}
