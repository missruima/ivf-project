import Database from 'better-sqlite3';
import path from 'path';
import { CREATE_TABLES, SCHEMA_VERSION, MIGRATIONS } from './schema';

const DB_PATH = path.join(process.cwd(), 'data', 'ivfhelper.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Run schema creation
  db.exec(CREATE_TABLES);

  // Check/insert schema version and run migrations
  const versionRow = db.prepare(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  ).get() as { version: number } | undefined;

  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion === 0) {
    // Fresh install — tables were just created at the latest schema
    db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
  } else if (currentVersion < SCHEMA_VERSION) {
    // Run incremental migrations
    for (let v = currentVersion + 1; v <= SCHEMA_VERSION; v++) {
      const sql = MIGRATIONS[v];
      if (sql) {
        // Run each statement individually to handle partial migrations gracefully
        const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
        for (const stmt of statements) {
          try {
            db.exec(stmt);
          } catch (err) {
            const msg = (err as Error).message || '';
            if (!msg.includes('duplicate column')) throw err;
          }
        }
        db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(v);
      }
    }
  }

  return db;
}
