import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

let cached: { url: string; jwks: JWTVerifyGetKey } | null = null;

/**
 * Клиент JWKS с identity-service.
 * URL вида: http://identity-service:3001/.well-known/jwks.json
 */
export function getJwks(jwksUrl: string): JWTVerifyGetKey {
  if (cached?.url === jwksUrl) {
    return cached.jwks;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  cached = { url: jwksUrl, jwks };
  return jwks;
}

/** Сброс кеша (для тестов). */
export function resetJwksCache(): void {
  cached = null;
}
