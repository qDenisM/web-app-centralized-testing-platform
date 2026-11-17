-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "data_mode" TEXT NOT NULL DEFAULT 'production',
    "registration_open" BOOLEAN NOT NULL DEFAULT true,
    "ct_applications_open" BOOLEAN NOT NULL DEFAULT true,
    "ocr_enabled" BOOLEAN NOT NULL DEFAULT true,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "system_settings" (
  "id",
  "data_mode",
  "registration_open",
  "ct_applications_open",
  "ocr_enabled",
  "maintenance_mode",
  "updated_at"
) VALUES (
  'default',
  'production',
  true,
  true,
  true,
  false,
  CURRENT_TIMESTAMP
);
