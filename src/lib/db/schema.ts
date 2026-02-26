export const SCHEMA_VERSION = 3;

export const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS protocols (
    id                  TEXT PRIMARY KEY,
    passphrase_hash     TEXT NOT NULL,
    passphrase_prefix   TEXT NOT NULL,

    age                 INTEGER NOT NULL CHECK(age BETWEEN 18 AND 55),
    age_months          INTEGER CHECK(age_months IS NULL OR age_months BETWEEN 0 AND 11),
    amh_range           TEXT CHECK(amh_range IN (
                            '<0.5', '0.5-1.0', '1.0-1.5', '1.5-2.0', '2.0-3.0',
                            '3.0-4.0', '4.0+', 'unknown', NULL
                        )),
    afc_range           TEXT CHECK(afc_range IN (
                            '<5', '5-10', '11-15', '16-20', '21-30', '30+', 'unknown', NULL
                        )),

    protocol_type       TEXT NOT NULL CHECK(protocol_type IN (
                            'antagonist', 'long_lupron', 'short_lupron', 'mini_ivf',
                            'natural', 'flare', 'estrogen_priming', 'other'
                        )),
    trigger_type        TEXT CHECK(trigger_type IN (
                            'hcg', 'lupron', 'dual', 'other', 'unknown', NULL
                        )),
    stim_days           INTEGER CHECK(stim_days IS NULL OR stim_days BETWEEN 1 AND 30),

    country             TEXT,
    state               TEXT,

    submitted_at        TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now')),
    is_active           INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS medications (
    id                  TEXT PRIMARY KEY,
    protocol_id         TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    dosage              TEXT,
    category            TEXT NOT NULL DEFAULT 'stim' CHECK(category IN ('stim', 'supplement', 'other')),
    UNIQUE(protocol_id, name)
);

CREATE TABLE IF NOT EXISTS outcomes (
    id                  TEXT PRIMARY KEY,
    protocol_id         TEXT NOT NULL UNIQUE REFERENCES protocols(id) ON DELETE CASCADE,

    eggs_retrieved      INTEGER CHECK(eggs_retrieved IS NULL OR eggs_retrieved BETWEEN 0 AND 80),
    eggs_mature         INTEGER CHECK(eggs_mature IS NULL OR eggs_mature BETWEEN 0 AND 80),
    eggs_fertilized     INTEGER CHECK(eggs_fertilized IS NULL OR eggs_fertilized BETWEEN 0 AND 80),
    blasts_day5         INTEGER CHECK(blasts_day5 IS NULL OR blasts_day5 BETWEEN 0 AND 40),
    blasts_day6         INTEGER CHECK(blasts_day6 IS NULL OR blasts_day6 BETWEEN 0 AND 40),
    blasts_day7         INTEGER CHECK(blasts_day7 IS NULL OR blasts_day7 BETWEEN 0 AND 20),

    pgt_tested          INTEGER CHECK(pgt_tested IS NULL OR pgt_tested BETWEEN 0 AND 40),
    pgt_euploid         INTEGER CHECK(pgt_euploid IS NULL OR pgt_euploid BETWEEN 0 AND 40),
    pgt_mosaic          INTEGER CHECK(pgt_mosaic IS NULL OR pgt_mosaic BETWEEN 0 AND 40),
    pgt_aneuploid       INTEGER CHECK(pgt_aneuploid IS NULL OR pgt_aneuploid BETWEEN 0 AND 40),

    transfer_count      INTEGER CHECK(transfer_count IS NULL OR transfer_count BETWEEN 0 AND 10),
    transfer_outcome    TEXT CHECK(transfer_outcome IN (
                            'positive_beta', 'negative_beta', 'chemical',
                            'clinical_pregnancy', 'miscarriage', 'live_birth',
                            'ongoing', 'not_yet', NULL
                        )),

    reported_at         TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_protocols_age ON protocols(age) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_protocols_protocol_type ON protocols(protocol_type) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_protocols_amh_range ON protocols(amh_range) WHERE is_active = 1;
CREATE INDEX IF NOT EXISTS idx_protocols_prefix ON protocols(passphrase_prefix);
CREATE INDEX IF NOT EXISTS idx_outcomes_protocol_id ON outcomes(protocol_id);

CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER PRIMARY KEY,
    applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/**
 * Incremental migrations keyed by target version.
 * Each migration runs only if the DB is at a lower version.
 */
export const MIGRATIONS: Record<number, string> = {
  2: `ALTER TABLE medications ADD COLUMN category TEXT NOT NULL DEFAULT 'stim' CHECK(category IN ('stim', 'supplement', 'other'));`,
  3: [
    `ALTER TABLE protocols ADD COLUMN age INTEGER CHECK(age BETWEEN 18 AND 55);`,
    `ALTER TABLE protocols ADD COLUMN age_months INTEGER CHECK(age_months IS NULL OR age_months BETWEEN 0 AND 11);`,
    `ALTER TABLE protocols ADD COLUMN country TEXT;`,
    `ALTER TABLE protocols ADD COLUMN state TEXT;`,
  ].join('\n'),
};
