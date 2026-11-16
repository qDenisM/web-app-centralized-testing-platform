-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chance_results" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "specialty_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "probability" INTEGER,
    "score_gap" INTEGER,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chance_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_specialty_id_key" ON "favorites"("user_id", "specialty_id");

-- CreateIndex
CREATE INDEX "chance_results_user_id_idx" ON "chance_results"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chance_results_user_id_specialty_id_key" ON "chance_results"("user_id", "specialty_id");