-- CreateTable
CREATE TABLE "notification_preferences" (
    "user_id" UUID NOT NULL,
    "all_enabled" BOOLEAN NOT NULL DEFAULT true,
    "verification_queue" BOOLEAN NOT NULL DEFAULT true,
    "ct_applications" BOOLEAN NOT NULL DEFAULT true,
    "decisions" BOOLEAN NOT NULL DEFAULT true,
    "default_queue_tab" TEXT NOT NULL DEFAULT 'overview',
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("user_id")
);
