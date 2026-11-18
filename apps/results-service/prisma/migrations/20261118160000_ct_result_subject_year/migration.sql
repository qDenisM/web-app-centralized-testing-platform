-- Denormalize subject + campaign year for uniqueness checks.
ALTER TABLE "ct_results" ADD COLUMN "subject_id" UUID;
ALTER TABLE "ct_results" ADD COLUMN "campaign_year" INTEGER;

CREATE INDEX "ct_results_user_id_subject_id_campaign_year_idx"
  ON "ct_results"("user_id", "subject_id", "campaign_year");

-- At most one published result per applicant / subject / campaign year.
CREATE UNIQUE INDEX "ct_results_one_published_per_subject_year"
  ON "ct_results"("user_id", "subject_id", "campaign_year")
  WHERE "status" = 'published'
    AND "subject_id" IS NOT NULL
    AND "campaign_year" IS NOT NULL;
