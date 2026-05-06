CREATE TABLE "form_target_faculties" (
	"form_id" uuid NOT NULL,
	"faculty_id" uuid NOT NULL,
	CONSTRAINT "form_target_faculties_form_id_faculty_id_pk" PRIMARY KEY("form_id","faculty_id")
);
--> statement-breakpoint
DROP INDEX "response_answers_question_idx";--> statement-breakpoint
ALTER TABLE "form_target_faculties" ADD CONSTRAINT "form_target_faculties_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_target_faculties" ADD CONSTRAINT "form_target_faculties_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "eval_assignments_round_website_user_uniq" ON "evaluator_assignments" USING btree ("round_id","website_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "response_answers_response_question_uniq" ON "response_answers" USING btree ("response_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "responses_form_respondent_active_uniq" ON "responses" USING btree ("form_id","respondent_id") WHERE "responses"."deleted_at" IS NULL;