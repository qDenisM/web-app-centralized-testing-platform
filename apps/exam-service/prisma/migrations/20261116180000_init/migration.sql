CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exams" (
    "id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "venue_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ(6) NOT NULL,
    "duration" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "seats_taken" INTEGER NOT NULL DEFAULT 0,
    "is_reserve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pass_number" TEXT,
    "reject_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "offer_expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "exams_subject_id_idx" ON "exams"("subject_id");

CREATE INDEX "exams_venue_id_idx" ON "exams"("venue_id");

CREATE INDEX "exams_starts_at_idx" ON "exams"("starts_at");

CREATE UNIQUE INDEX "applications_exam_id_user_id_key" ON "applications"("exam_id", "user_id");

CREATE INDEX "applications_user_id_idx" ON "applications"("user_id");

CREATE INDEX "applications_status_idx" ON "applications"("status");

CREATE UNIQUE INDEX "waitlist_entries_exam_id_user_id_key" ON "waitlist_entries"("exam_id", "user_id");

CREATE UNIQUE INDEX "waitlist_entries_exam_id_position_key" ON "waitlist_entries"("exam_id", "position");

CREATE INDEX "waitlist_entries_user_id_idx" ON "waitlist_entries"("user_id");

CREATE INDEX "waitlist_entries_status_idx" ON "waitlist_entries"("status");

ALTER TABLE "exams" ADD CONSTRAINT "exams_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "applications" ADD CONSTRAINT "applications_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
