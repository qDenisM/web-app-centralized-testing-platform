-- Applicant preference: which published CT results count toward competitive score (max 3).
ALTER TABLE "applicant_profiles"
  ADD COLUMN "selected_ct_result_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
