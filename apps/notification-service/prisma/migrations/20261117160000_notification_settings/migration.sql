-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "all_enabled" BOOLEAN NOT NULL DEFAULT true,
    "verification_enabled" BOOLEAN NOT NULL DEFAULT true,
    "application_enabled" BOOLEAN NOT NULL DEFAULT true,
    "result_enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton
INSERT INTO "notification_settings" ("id", "all_enabled", "verification_enabled", "application_enabled", "result_enabled", "updated_at")
VALUES ('default', true, true, true, true, CURRENT_TIMESTAMP);
