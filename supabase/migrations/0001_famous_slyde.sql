ALTER TABLE "accounts" ALTER COLUMN "balance" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "date" SET DATA TYPE text;