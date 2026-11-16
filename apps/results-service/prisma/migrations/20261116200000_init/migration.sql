CREATE TABLE "ct_results" (
    "id" UUID NOT NULL,
    "exam_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "score" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "entered_by" UUID,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ct_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ct_results_exam_id_user_id_key" ON "ct_results"("exam_id", "user_id");

CREATE INDEX "ct_results_user_id_idx" ON "ct_results"("user_id");

CREATE INDEX "ct_results_exam_id_idx" ON "ct_results"("exam_id");

CREATE INDEX "ct_results_status_idx" ON "ct_results"("status");
