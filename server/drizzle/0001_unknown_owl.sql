CREATE TABLE "document_upload" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"original_name" text NOT NULL,
	"stored_as" text NOT NULL,
	"size" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_upload" ADD CONSTRAINT "document_upload_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;