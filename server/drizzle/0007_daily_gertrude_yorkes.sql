ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DEFAULT 'member'::text;--> statement-breakpoint
DROP TYPE "public"."invite_role";--> statement-breakpoint
CREATE TYPE "public"."invite_role" AS ENUM('owner', 'member');--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."invite_role";--> statement-breakpoint
ALTER TABLE "organization_invites" ALTER COLUMN "role" SET DATA TYPE "public"."invite_role" USING "role"::"public"."invite_role";--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_hash" text;