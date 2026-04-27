CREATE TYPE "public"."field_type" AS ENUM('text', 'textarea', 'radio', 'checkbox', 'rating', 'scale', 'date', 'file', 'number', 'select');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('draft', 'open', 'closed');--> statement-breakpoint
CREATE TYPE "public"."notif_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('super_admin', 'admin', 'executive', 'teacher', 'staff', 'student');--> statement-breakpoint
CREATE TYPE "public"."round_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."website_status" AS ENUM('active', 'inactive', 'unreachable');