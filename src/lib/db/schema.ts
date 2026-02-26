export const SCHEMA_VERSION = 4;

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

    cycle_number        INTEGER CHECK(cycle_number IS NULL OR cycle_number BETWEEN 1 AND 20),
    cycle_type          TEXT CHECK(cycle_type IN (
                            'fresh_transfer', 'freeze_all', 'fresh_to_frozen', 'cancelled', NULL
                        )),
    donor_sperm         INTEGER CHECK(donor_sperm IN (0, 1, NULL)),
    donor_eggs          INTEGER CHECK(donor_eggs IN (0, 1, NULL)),
    fertilization_method TEXT CHECK(fertilization_method IN (
                            'standard', 'icsi', 'imsi', 'picsi', 'macs', 'other', NULL
                        )),
    partner_age         INTEGER CHECK(partner_age IS NULL OR partner_age BETWEEN 18 AND 80),
    peak_e2             REAL CHECK(peak_e2 IS NULL OR peak_e2 BETWEEN 0 AND 20000),
    max_follicles       INTEGER CHECK(max_follicles IS NULL OR max_follicles BETWEEN 0 AND 80),
    amh_value           REAL CHECK(amh_value IS NULL OR amh_value BETWEEN 0 AND 30),
    afc_count           INTEGER CHECK(afc_count IS NULL OR afc_count BETWEEN 0 AND 80),

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

CREATE TABLE IF NOT EXISTS diagnoses (
    id                  TEXT PRIMARY KEY,
    protocol_id         TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
    diagnosis           TEXT NOT NULL,
    UNIQUE(protocol_id, diagnosis)
);

CREATE TABLE IF NOT EXISTS outcomes (
    id                  TEXT PRIMARY KEY,
    protocol_id         TEXT NOT NULL UNIQUE REFERENCES protocols(id) ON DELETE CASCADE,

    eggs_retrieved      INTEGER CHECK(eggs_retrieved IS NULL OR eggs_retrieved BETWEEN 0 AND 80),
    eggs_mature         INTEGER CHECK(eggs_mature IS NULL OR eggs_mature BETWEEN 0 AND 80),
    eggs_fertilized     INTEGER CHECK(eggs_fertilized IS NULL OR eggs_fertilized BETWEEN 0 AND 80),
    eggs_frozen         INTEGER CHECK(eggs_frozen IS NULL OR eggs_frozen BETWEEN 0 AND 80),
    eggs_thawed         INTEGER CHECK(eggs_thawed IS NULL OR eggs_thawed BETWEEN 0 AND 80),
    day3_embryos        INTEGER CHECK(day3_embryos IS NULL OR day3_embryos BETWEEN 0 AND 60),
    blasts_day5         INTEGER CHECK(blasts_day5 IS NULL OR blasts_day5 BETWEEN 0 AND 40),
    blasts_day6         INTEGER CHECK(blasts_day6 IS NULL OR blasts_day6 BETWEEN 0 AND 40),
    blasts_day7         INTEGER CHECK(blasts_day7 IS NULL OR blasts_day7 BETWEEN 0 AND 20),
    embryo_grades_day5  TEXT,
    embryo_grades_day6  TEXT,
    embryo_grades_day7  TEXT,

    pgt_tested          INTEGER CHECK(pgt_tested IS NULL OR pgt_tested BETWEEN 0 AND 40),
    pgt_euploid         INTEGER CHECK(pgt_euploid IS NULL OR pgt_euploid BETWEEN 0 AND 40),
    pgt_mosaic          INTEGER CHECK(pgt_mosaic IS NULL OR pgt_mosaic BETWEEN 0 AND 40),
    pgt_aneuploid       INTEGER CHECK(pgt_aneuploid IS NULL OR pgt_aneuploid BETWEEN 0 AND 40),
    pgt_inconclusive    INTEGER CHECK(pgt_inconclusive IS NULL OR pgt_inconclusive BETWEEN 0 AND 40),

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
CREATE INDEX IF NOT EXISTS idx_diagnoses_protocol_id ON diagnoses(protocol_id);
CREATE INDEX IF NOT EXISTS idx_diagnoses_diagnosis ON diagnoses(diagnosis);

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
  4: [
    // Protocol table additions
    `ALTER TABLE protocols ADD COLUMN cycle_number INTEGER CHECK(cycle_number IS NULL OR cycle_number BETWEEN 1 AND 20);`,
    `ALTER TABLE protocols ADD COLUMN cycle_type TEXT CHECK(cycle_type IN ('fresh_transfer', 'freeze_all', 'fresh_to_frozen', 'cancelled', NULL));`,
    `ALTER TABLE protocols ADD COLUMN donor_sperm INTEGER CHECK(donor_sperm IN (0, 1, NULL));`,
    `ALTER TABLE protocols ADD COLUMN donor_eggs INTEGER CHECK(donor_eggs IN (0, 1, NULL));`,
    `ALTER TABLE protocols ADD COLUMN fertilization_method TEXT CHECK(fertilization_method IN ('standard', 'icsi', 'imsi', 'picsi', 'macs', 'other', NULL));`,
    `ALTER TABLE protocols ADD COLUMN partner_age INTEGER CHECK(partner_age IS NULL OR partner_age BETWEEN 18 AND 80);`,
    `ALTER TABLE protocols ADD COLUMN peak_e2 REAL CHECK(peak_e2 IS NULL OR peak_e2 BETWEEN 0 AND 20000);`,
    `ALTER TABLE protocols ADD COLUMN max_follicles INTEGER CHECK(max_follicles IS NULL OR max_follicles BETWEEN 0 AND 80);`,
    `ALTER TABLE protocols ADD COLUMN amh_value REAL CHECK(amh_value IS NULL OR amh_value BETWEEN 0 AND 30);`,
    `ALTER TABLE protocols ADD COLUMN afc_count INTEGER CHECK(afc_count IS NULL OR afc_count BETWEEN 0 AND 80);`,
    // Diagnoses table
    `CREATE TABLE IF NOT EXISTS diagnoses (
      id TEXT PRIMARY KEY,
      protocol_id TEXT NOT NULL REFERENCES protocols(id) ON DELETE CASCADE,
      diagnosis TEXT NOT NULL,
      UNIQUE(protocol_id, diagnosis)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_diagnoses_protocol_id ON diagnoses(protocol_id);`,
    `CREATE INDEX IF NOT EXISTS idx_diagnoses_diagnosis ON diagnoses(diagnosis);`,
    // Outcome table additions
    `ALTER TABLE outcomes ADD COLUMN eggs_frozen INTEGER CHECK(eggs_frozen IS NULL OR eggs_frozen BETWEEN 0 AND 80);`,
    `ALTER TABLE outcomes ADD COLUMN eggs_thawed INTEGER CHECK(eggs_thawed IS NULL OR eggs_thawed BETWEEN 0 AND 80);`,
    `ALTER TABLE outcomes ADD COLUMN day3_embryos INTEGER CHECK(day3_embryos IS NULL OR day3_embryos BETWEEN 0 AND 60);`,
    `ALTER TABLE outcomes ADD COLUMN embryo_grades_day5 TEXT;`,
    `ALTER TABLE outcomes ADD COLUMN embryo_grades_day6 TEXT;`,
    `ALTER TABLE outcomes ADD COLUMN embryo_grades_day7 TEXT;`,
    `ALTER TABLE outcomes ADD COLUMN pgt_inconclusive INTEGER CHECK(pgt_inconclusive IS NULL OR pgt_inconclusive BETWEEN 0 AND 40);`,
  ].join('\n'),
};
