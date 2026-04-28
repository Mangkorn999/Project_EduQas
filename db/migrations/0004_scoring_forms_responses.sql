CREATE TABLE "evaluation_criteria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"name" text NOT NULL,
	"dimension" text,
	"weight" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"criterion_id" uuid,
	"question_type" "question_type" NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"is_required" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"config" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"round_id" uuid NOT NULL,
	"website_target_id" uuid,
	"scope" "form_scope" NOT NULL,
	"status" "form_status" DEFAULT 'draft' NOT NULL,
	"owner_faculty_id" uuid,
	"created_by_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluator_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"round_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "response_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value_number" real,
	"value_text" text,
	"value_json" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid,
	"assignment_id" uuid,
	"respondent_id" uuid NOT NULL,
	"website_opened_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evaluation_criteria" ADD CONSTRAINT "evaluation_criteria_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_criterion_id_evaluation_criteria_id_fk" FOREIGN KEY ("criterion_id") REFERENCES "public"."evaluation_criteria"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_website_target_id_websites_id_fk" FOREIGN KEY ("website_target_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_owner_faculty_id_faculties_id_fk" FOREIGN KEY ("owner_faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluator_assignments" ADD CONSTRAINT "evaluator_assignments_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_answers" ADD CONSTRAINT "response_answers_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "response_answers" ADD CONSTRAINT "response_answers_question_id_form_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."form_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_assignment_id_evaluator_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."evaluator_assignments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_respondent_id_users_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "eval_criteria_form_id_idx" ON "evaluation_criteria" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_questions_form_id_idx" ON "form_questions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "form_versions_form_id_idx" ON "form_versions" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "forms_round_id_idx" ON "forms" USING btree ("round_id");--> statement-breakpoint
CREATE INDEX "forms_status_idx" ON "forms" USING btree ("status") WHERE "forms"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "forms_owner_faculty_idx" ON "forms" USING btree ("owner_faculty_id") WHERE "forms"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "eval_assignments_user_idx" ON "evaluator_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "eval_assignments_round_website_idx" ON "evaluator_assignments" USING btree ("round_id","website_id");--> statement-breakpoint
CREATE INDEX "response_answers_response_id_idx" ON "response_answers" USING btree ("response_id");--> statement-breakpoint
CREATE INDEX "response_answers_question_idx" ON "response_answers" USING btree ("response_id","question_id");--> statement-breakpoint
CREATE INDEX "responses_form_id_idx" ON "responses" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "responses_respondent_id_idx" ON "responses" USING btree ("respondent_id");--> statement-breakpoint
CREATE INDEX "responses_submitted_idx" ON "responses" USING btree ("form_id","submitted_at") WHERE "responses"."submitted_at" IS NOT NULL AND "responses"."deleted_at" IS NULL;