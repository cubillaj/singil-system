CREATE TYPE "public"."status" AS ENUM('active', 'inActive');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "status" "status" DEFAULT 'active';