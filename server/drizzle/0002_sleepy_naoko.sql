ALTER TABLE "document_upload" ADD COLUMN "storage_provider" text;--> statement-breakpoint
ALTER TABLE "document_upload" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "document_upload" ADD COLUMN "mime_type" text;--> statement-breakpoint
UPDATE "document_upload"
SET
  "storage_provider" = CASE
    WHEN "stored_as" LIKE 'users/%' THEN 's3'
    ELSE 'local'
  END,
  "storage_key" = "stored_as"
WHERE "storage_provider" IS NULL
   OR "storage_key" IS NULL;--> statement-breakpoint
ALTER TABLE "document_upload" ALTER COLUMN "storage_provider" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_upload" ALTER COLUMN "storage_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "document_upload" ADD CONSTRAINT "document_upload_storage_provider_check" CHECK ("document_upload"."storage_provider" in ('s3', 'local'));
