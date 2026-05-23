ALTER TABLE "clients" RENAME COLUMN "phone" TO "contact_person";--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "barangay" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "province" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "region" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "contact_phone" varchar(50);