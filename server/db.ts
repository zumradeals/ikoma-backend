import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";
import path from "path";

const dbPath = process.env.DB_PATH || path.join(process.cwd(), "ikoma.db");
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
