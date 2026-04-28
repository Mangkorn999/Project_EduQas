CREATE TABLE "websites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"category" text,
	"owner_faculty_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"url_status" "url_status" DEFAULT 'unknown' NOT NULL,
	"last_validated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "round_websites" (
	"round_id" uuid NOT NULL,
	"website_id" uuid NOT NULL,
	CONSTRAINT "round_websites_round_id_website_id_pk" PRIMARY KEY("round_id","website_id")
);
--> statement-breakpoint
CREATE TABLE "rounds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"academic_year" integer NOT NULL,
	"semester" integer NOT NULL,
	"open_date" timestamp with time zone,
	"close_date" timestamp with time zone,
	"scope" "round_scope" NOT NULL,
	"faculty_id" uuid,
	"status" "round_status" DEFAULT 'draft' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "websites" ADD CONSTRAINT "websites_owner_faculty_id_faculties_id_fk" FOREIGN KEY ("owner_faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_websites" ADD CONSTRAINT "round_websites_round_id_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "round_websites" ADD CONSTRAINT "round_websites_website_id_websites_id_fk" FOREIGN KEY ("website_id") REFERENCES "public"."websites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;