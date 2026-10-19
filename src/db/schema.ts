import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, timestamp, check } from "drizzle-orm/pg-core";

export const images = pgTable(
    "images",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        name: text("name").notNull(),
        width: integer("width").notNull(),
        height: integer("height").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check("images_width_range", sql`${t.width} > 0 AND ${t.width} <= 20000`),
        check("images_height_range", sql`${t.height} > 0 AND ${t.height} <= 20000`),
        check("images_name_length", sql`length(${t.name}) BETWEEN 1 AND 255`),
        ],
);