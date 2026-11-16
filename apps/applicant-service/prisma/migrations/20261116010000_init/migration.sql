CREATE TABLE "applicant_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "birth_date" DATE,
    "passport_series" TEXT,
    "passport_number" TEXT,
    "storage_key" TEXT,
    "attestat_average" DOUBLE PRECISION,
    "school_name" TEXT,
    "graduate_name" TEXT,
    "attestat_issued_on" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applicant_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "reject_reason" TEXT,
    "locked_by" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "decided_at" TIMESTAMPTZ(6),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "applicant_profiles_user_id_key" ON "applicant_profiles"("user_id");

CREATE INDEX "verifications_profile_id_idx" ON "verifications"("profile_id");

CREATE INDEX "verifications_status_idx" ON "verifications"("status");

CREATE UNIQUE INDEX "verifications_profile_id_version_key" ON "verifications"("profile_id", "version");

ALTER TABLE "verifications" ADD CONSTRAINT "verifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "applicant_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
