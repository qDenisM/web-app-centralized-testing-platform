export const RABBIT_EXCHANGE = "abiturent.events";

export const EVENT_VERIFICATION_SUBMITTED = "verification.submitted";
export const EVENT_VERIFICATION_DECIDED = "verification.decided";
export const EVENT_APPLICATION_SUBMITTED = "application.submitted";
export const EVENT_APPLICATION_APPROVED = "application.approved";
export const EVENT_APPLICATION_REJECTED = "application.rejected";
export const EVENT_RESULT_PUBLISHED = "result.published";

/** Applicant sent anketa/attestat to the moderator verification queue. */
export type VerificationSubmittedEvent = {
  type: typeof EVENT_VERIFICATION_SUBMITTED;
  userId: string;
  verificationId: string;
  at: string;
};

export type VerificationDecidedEvent = {
  type: typeof EVENT_VERIFICATION_DECIDED;
  userId: string;
  verificationId: string;
  /** Includes `pending` when a moderator reopens a decided verification. */
  decision: "approved" | "returned" | "rejected" | "pending";
  reason: string | null;
  at: string;
};

/** Applicant created/re-opened a pending CT application (moderator queue). */
export type ApplicationSubmittedEvent = {
  type: typeof EVENT_APPLICATION_SUBMITTED;
  userId: string;
  applicationId: string;
  examId: string;
  at: string;
};

export type ApplicationApprovedEvent = {
  type: typeof EVENT_APPLICATION_APPROVED;
  userId: string;
  applicationId: string;
  examId: string;
  passNumber: string | null;
  at: string;
};

export type ApplicationRejectedEvent = {
  type: typeof EVENT_APPLICATION_REJECTED;
  userId: string;
  applicationId: string;
  examId: string;
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
