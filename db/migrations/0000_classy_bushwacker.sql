CREATE TYPE "public"."form_scope" AS ENUM('faculty', 'university');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('short_text', 'long_text', 'single_choice', 'multi_choice', 'rating', 'scale_5', 'scale_10', 'boolean', 'date', 'number');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'executive', 'teacher', 'staff', 'student');--> statement-breakpoint
CREATE TYPE "public"."round_scope" AS ENUM('faculty', 'university');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."template_scope" AS ENUM('faculty', 'global');--> statement-breakpoint
CREATE TYPE "public"."url_status" AS ENUM('unknown', 'ok', 'unreachable');