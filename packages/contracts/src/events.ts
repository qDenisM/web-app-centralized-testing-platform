export const RABBIT_EXCHANGE = "abiturent.events";

export const EVENT_VERIFICATION_DECIDED = "verification.decided";

export type VerificationDecidedEvent = {
  type: typeof EVENT_VERIFICATION_DECIDED;
  userId: string;
  verificationId: string;
  decision: "approved" | "returned" | "rejected";
  reason: string | null;
  at: string;
};
