import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

let cached: { url: string; jwks: JWTVerifyGetKey } | null = null;

export function getJwks(jwksUrl: string): JWTVerifyGetKey {
  if (cached?.url === jwksUrl) {
    return cached.jwks;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  cached = { url: jwksUrl, jwks };
  return jwks;
}

export function resetJwksCache(): void {
  cached = null;
}
