import { z } from "zod";

const EnvSchema = z.object({
    DATABASE_URL: z.string().min(1),
    STORAGE_DIR: z.string().min(1),
});

export const config = EnvSchema.parse(process.env);