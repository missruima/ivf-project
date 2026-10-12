import { afterEach, describe, expect, it, vi } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { CREATE_TABLES } from './db/schema';

let directory: string | null = null;

afterEach(() => {
  delete process.env.IVF_DB_PATH;
  vi.resetModules();
  if (directory) rmSync(directory, { recursive: true, force: true });
  directory = null;
});

describe('schema migration 8', () => {
  it('purges cached user questions without changing protocol records', async () => {
    directory = mkdtempSync(path.join(tmpdir(), 'ivf-migration-'));
    const databasePath = path.join(directory, 'fixture.db');
    const seed = new Database(databasePath);
    seed.exec(CREATE_TABLES);
    seed.prepare('INSERT INTO schema_version(version) VALUES (7)').run();
    seed.prepare(`INSERT INTO protocols(id, passphrase_hash, passphrase_prefix, age) VALUES ('record', 'hash', 'abcd', 35)`).run();
    seed.prepare(`INSERT INTO response_cache(id, question_hash, question_text, question_normalized, keywords, response_text, source, expires_at) VALUES ('cache', 'hash', 'sensitive question', 'sensitive question', '[]', 'answer', 'live', datetime('now', '+1 day'))`).run();
    seed.close();

    process.env.IVF_DB_PATH = databasePath;
    const { getDb } = await import('./db');
    const migrated = getDb();
    expect(migrated.prepare('SELECT COUNT(*) count FROM protocols').get()).toEqual({ count: 1 });
    expect(migrated.prepare('SELECT COUNT(*) count FROM response_cache').get()).toEqual({ count: 0 });
    expect(migrated.prepare('SELECT MAX(version) version FROM schema_version').get()).toEqual({ version: 8 });
    expect(migrated.pragma('secure_delete', { simple: true })).toBe(1);
    expect(migrated.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
    migrated.close();
  });
});
