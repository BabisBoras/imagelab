CREATE TABLE "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "images_width_range" CHECK ("images"."width" > 0 AND "images"."width" <= 20000),
	CONSTRAINT "images_height_range" CHECK ("images"."height" > 0 AND "images"."height" <= 20000),
	CONSTRAINT "images_name_length" CHECK (length("images"."name") BETWEEN 1 AND 255)
);
