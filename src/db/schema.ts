import { sql } from "drizzle-orm";
import { pgTable, uuid, text, integer, timestamp, check, jsonb } from "drizzle-orm/pg-core";

export const OPS = ["grayscale", "blur", "edges"] as const;
export const STATUS = ["queued", "running", "done", "failed"] as const;

export const jobs = pgTable(
    "jobs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        ownerId: uuid("owner_id").notNull().references( () => users.id),
        imageId: uuid("image_id").notNull().references( () => images.id),
        op: text("op", {enum: OPS}).notNull(),
        params: jsonb("params").$type<Record<string,unknown>>().notNull().default({}),
        status: text("status", {enum: STATUS}).notNull().default("queued"),
        attempts: integer("attempts").notNull().default(0),
        error: text("error"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        startedAt: timestamp("started_at", { withTimezone: true }),
        heartbeatAt: timestamp("heartbeat_at", { withTimezone: true }),
        finishedAt: timestamp("finished_at", { withTimezone: true })
    },
    (t) => [
        // check("available_operations", sql`${t.op} IN ('grayscale', 'blur', 'edges')`),
        check("jobs_op",sql`${t.op} IN (${sql.raw(OPS.map(o => `'${o}'`).join(", "))})`),
        // check("available_status", sql`${t.status} IN ('queued', 'running', 'done', 'failed')`),
        check("jobs_status", sql`${t.status} IN (${sql.raw(STATUS.map(s => `'${s}'`).join(", "))})`),
        check("jobs_attempts",sql`${t.attempts} >= 0`)
        ],
);

export const sessions = pgTable(
    "sessions",
    {
        id: text("id").primaryKey(),
        userId: uuid("user_id").notNull().references( () => users.id),
        expiresAt: timestamp("expires_at", {withTimezone: true}).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    }
)

export const users = pgTable(
    "users",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        email: text("email").notNull().unique(),
        passwordHash: text("password_hash").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
    }
);

export const images = pgTable(
    "images",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        ownerId: uuid("owner_id").notNull().references( () => users.id),
        name: text("name").notNull(),
        width: integer("width").notNull(),
        height: integer("height").notNull(),
        format: text("format", {enum: ["png", "jpg"]}).notNull(),
        sizeBytes: integer("size_bytes").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        check("images_width_range", sql`${t.width} > 0 AND ${t.width} <= 20000`),
        check("images_height_range", sql`${t.height} > 0 AND ${t.height} <= 20000`),
        check("images_name_length", sql`length(${t.name}) BETWEEN 1 AND 255`),
        check("images_size_bytes", sql`${t.sizeBytes} > 0`),
        check("images_format", sql`${t.format} IN ('png', 'jpg')`)
        ],
);

