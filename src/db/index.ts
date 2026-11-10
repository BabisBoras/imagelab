import * as schema from "./schema.js"
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "../config.js"

export const db = drizzle(config.DATABASE_URL, { schema });