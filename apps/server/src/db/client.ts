import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

const DB_PATH = process.env.DB_PATH || './data/board-games.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

const migrationsFolder = process.env.MIGRATIONS_FOLDER || resolve(import.meta.dirname, 'migrations');

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  )
`);

const journalPath = resolve(migrationsFolder, 'meta/_journal.json');
const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));

const applied = new Set(
  sqlite.prepare("SELECT hash FROM __drizzle_migrations").all().map((r: any) => r.hash)
);

if (applied.size === 0) {
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__%'").all();
  if (tables.length > 0) {
    for (const entry of journal.entries) {
      sqlite.prepare("INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(entry.tag, Date.now());
    }
  }
} else {
  for (const entry of journal.entries) {
    if (applied.has(entry.tag)) continue;
    const sqlFile = resolve(migrationsFolder, `${entry.tag}.sql`);
    const sql = readFileSync(sqlFile, 'utf-8').replace(/--> statement-breakpoint\s*\n/g, '\n');
    sqlite.exec(sql);
    sqlite.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(entry.tag, Date.now());
  }
}
