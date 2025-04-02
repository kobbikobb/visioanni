CREATE TABLE "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"date" char(8) NOT NULL,
	"completed" boolean NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "goals" USING btree ("user_id");