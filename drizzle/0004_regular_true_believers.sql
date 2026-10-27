ALTER TABLE "images" ADD COLUMN "format" text NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD COLUMN "size_bytes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "images" ADD CONSTRAINT "images_size_bytes" CHECK ("images"."size_bytes" > 0);