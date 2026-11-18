import { config } from "./config.js";

export type IdentityUserBrief = {
  id: string;
  email: string;
  fullName: string;
  role: string;
};

/**
 * Best-effort list of users with moderator/admin roles for in-app fan-out.
 * Identity outage → empty list (no notifications), never throws.
 */
export async function listModeratorUserIds(): Promise<string[]> {
  try {
    const res = await fetch(`${config.identityUrl}/internal/users/by-role`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": config.internalAuditToken,
      },
      // Admins can use the moderator cabinet; include both.
      body: JSON.stringify({ roles: ["moderator", "admin"] }),
    });
    if (!res.ok) return [];

    const json = (await res.json().catch(() => null)) as {
      users?: IdentityUserBrief[];
    } | null;

    const ids = (json?.users || [])
      .map((user) => user?.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    return [...new Set(ids)];
  } catch {
    return [];
  }
}
