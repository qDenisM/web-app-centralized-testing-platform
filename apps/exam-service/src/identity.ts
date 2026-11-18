import { config } from "./config.js";

export type IdentityUserBrief = {
  id: string;
  email: string;
  fullName: string;
};

/** Batch-fetch identity profiles for examiner/moderator enrichment. Best-effort. */
export async function lookupIdentityUsers(
  ids: string[],
): Promise<Map<string, IdentityUserBrief>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, IdentityUserBrief>();
  if (unique.length === 0) return map;

  try {
    const res = await fetch(`${config.identityUrl}/internal/users/lookup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": config.internalAuditToken,
      },
      body: JSON.stringify({ ids: unique }),
    });
    if (!res.ok) return map;

    const json = (await res.json().catch(() => null)) as {
      users?: IdentityUserBrief[];
    } | null;

    for (const user of json?.users || []) {
      if (user?.id) map.set(user.id, user);
    }
  } catch {
    // Identity outage must not break examiner queues.
  }

  return map;
}
