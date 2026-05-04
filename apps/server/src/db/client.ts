import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';

const DB_PATH = process.env.DB_PATH || './data/board-games.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

const migrationsFolder = process.env.MIGRATIONS_FOLDER || resolve(import.meta.dirname, 'migrations');
migrate(db, { migrationsFolder });
