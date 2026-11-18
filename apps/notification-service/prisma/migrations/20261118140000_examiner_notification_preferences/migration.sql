-- AlterTable: examiner-specific notification preference toggles
ALTER TABLE "notification_preferences" ADD COLUMN "results_publish" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "notification_preferences" ADD COLUMN "results_import" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "notification_preferences" ADD COLUMN "exam_assignments" BOOLEAN NOT NULL DEFAULT true;
