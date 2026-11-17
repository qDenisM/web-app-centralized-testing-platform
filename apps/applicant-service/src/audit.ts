import { config } from "./config.js";

/** Fire-and-forget domain audit into identity-service. */
export function reportAudit(input: {
  actorId?: string | null;
  targetId?: string | null;
  action: string;
  payload?: Record<string, unknown>;
}): void {
  void fetch(`${config.identityUrl}/internal/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": config.internalAuditToken,
    },
    body: JSON.stringify({
      actorId: input.actorId ?? null,
      targetId: input.targetId ?? null,
      action: input.action,
      payload: input.payload ?? {},
    }),
  }).catch(() => {
    // audit must not break business flow
  });
}
