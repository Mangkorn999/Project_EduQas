CREATE UNIQUE INDEX IF NOT EXISTS "eval_assignments_round_website_user_uniq" ON "evaluator_assignments" USING btree ("round_id","website_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "responses_form_respondent_active_uniq" ON "responses" USING btree ("form_id","respondent_id") WHERE "responses"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "response_answers_response_question_uniq" ON "response_answers" USING btree ("response_id","question_id");
