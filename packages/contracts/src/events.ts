export const RABBIT_EXCHANGE = "abiturent.events";

export const EVENT_VERIFICATION_DECIDED = "verification.decided";
export const EVENT_RESULT_PUBLISHED = "result.published";

export type VerificationDecidedEvent = {
  type: typeof EVENT_VERIFICATION_DECIDED;
  userId: string;
  verificationId: string;
  decision: "approved" | "returned" | "rejected";
  reason: string | null;
  at: string;
};

export type ResultPublishedEvent = {
  type: typeof EVENT_RESULT_PUBLISHED;
  userId: string;
  resultId: string;
  examId: string;
  score: number;
  at: string;
};
