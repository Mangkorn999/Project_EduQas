ALTER TABLE "users" ADD COLUMN "faculty_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "faculty_name_th" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "faculty_name_en" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "faculty_source" text;--> statement-breakpoint
CREATE INDEX "users_faculty_code_idx" ON "users" USING btree ("faculty_code") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_active_idx" ON "refresh_tokens" USING btree ("user_id","revoked_at") WHERE "refresh_tokens"."revoked_at" IS NULL;