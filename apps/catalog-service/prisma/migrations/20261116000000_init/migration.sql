CREATE TABLE "institutions" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subjects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "specialties" (
    "id" UUID NOT NULL,
    "institution_id" UUID NOT NULL,
    "okrb_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "study_form" TEXT NOT NULL,
    "funding" TEXT NOT NULL,
    "places_plan" INTEGER NOT NULL,
    "content_mode" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "specialties_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "specialty_subjects" (
    "id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "slot" INTEGER NOT NULL,
    "min_score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "specialty_subjects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passing_scores" (
    "id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "competition" DOUBLE PRECISION,

    CONSTRAINT "passing_scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaigns" (
    "id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "campaign_stages" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE NOT NULL,

    CONSTRAINT "campaign_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "campaigns_year_key" ON "campaigns"("year");

CREATE INDEX "specialties_institution_id_idx" ON "specialties"("institution_id");

CREATE INDEX "specialty_subjects_specialty_id_idx" ON "specialty_subjects"("specialty_id");

CREATE INDEX "specialty_subjects_subject_id_idx" ON "specialty_subjects"("subject_id");

CREATE UNIQUE INDEX "specialty_subjects_specialty_id_slot_key" ON "specialty_subjects"("specialty_id", "slot");

CREATE INDEX "passing_scores_specialty_id_idx" ON "passing_scores"("specialty_id");

CREATE UNIQUE INDEX "passing_scores_specialty_id_year_key" ON "passing_scores"("specialty_id", "year");

CREATE INDEX "campaign_stages_campaign_id_idx" ON "campaign_stages"("campaign_id");

ALTER TABLE "specialties" ADD CONSTRAINT "specialties_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialty_subjects" ADD CONSTRAINT "specialty_subjects_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "specialty_subjects" ADD CONSTRAINT "specialty_subjects_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "passing_scores" ADD CONSTRAINT "passing_scores_specialty_id_fkey" FOREIGN KEY ("specialty_id") REFERENCES "specialties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_stages" ADD CONSTRAINT "campaign_stages_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
