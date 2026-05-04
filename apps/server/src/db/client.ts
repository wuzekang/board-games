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

const { count } = sqlite.prepare("SELECT COUNT(*) as count FROM __drizzle_migrations").get() as any;

if (count === 0) {
  const userTables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__%' AND name NOT LIKE 'sqlite_%'").all();
  if (userTables.length > 0) {
    const journalPath = resolve(migrationsFolder, 'meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    for (const entry of journal.entries) {
      sqlite.prepare("INSERT OR IGNORE INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(entry.tag, Date.now());
    }
  } else {
    const journalPath = resolve(migrationsFolder, 'meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    for (const entry of journal.entries) {
      const sqlFile = resolve(migrationsFolder, `${entry.tag}.sql`);
      const sql = readFileSync(sqlFile, 'utf-8').replace(/--> statement-breakpoint\s*\n/g, '\n');
      sqlite.exec(sql);
      sqlite.prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)").run(entry.tag, Date.now());
    }
  }
}
