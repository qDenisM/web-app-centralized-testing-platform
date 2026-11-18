import { config } from "./config.js";

export type IdentityUserBrief = {
  id: string;
  email: string;
  fullName: string;
};

/** Batch-fetch identity profiles for moderator enrichment. Best-effort. */
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
    // Identity outage must not break the verification queue.
  }

  return map;
}

export function applicantBriefFromMap(
  userId: string,
  users: Map<string, IdentityUserBrief>,
): { fullName: string | null; email: string | null } {
  const user = users.get(userId);
  return {
    fullName: user?.fullName?.trim() || null,
    email: user?.email?.trim() || null,
  };
}
