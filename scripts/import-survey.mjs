/**
 * Import script to populate the IVF Project database with survey data
 * from the "IVF Cycle Survey Data.xlsx" spreadsheet.
 *
 * Usage: node scripts/import-survey.mjs /path/to/IVF\ Cycle\ Survey\ Data.xlsx
 *
 * This script:
 * - Reads both sheets ("Retrieval  Data" and "40+ data")
 * - Maps survey columns to our schema
 * - Creates protocol + medication + diagnosis + outcome records
 * - Uses a special passphrase prefix "IMPORTED:" so these records can never be
 *   looked up or modified (no real passphrase exists)
 * - Skips clinic name, doctor name (legal risk)
 * - Skips lifestyle data (diet, toxin avoidance, etc.)
 */

import XLSX from 'xlsx';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'ivfhelper.db');

// ── Column indices for "Retrieval  Data" sheet (headers at row index 4) ──
// Row index 4 has the short headers, row 5 has the long descriptions
const COLS = {
  timestamp: 0,
  cycleNumber: 1,
  date: 2,
  age: 3,
  amh: 4,
  afc: 5,
  maxFollicles: 6,
  cycleType: 7,
  donorSperm: 8,
  donorEggs: 9,
  eggsRetrieved: 10,
  eggsMature: 11,
  eggsFrozen: 12,
  eggsThawed: 13,
  partnerAge: 14,
  fertilization: 15,
  fertilized: 16,
  day3: 17,
  day5: 18,
  day6: 19,
  day7: 20,
  totalBlasts: 21,
  gradesDay5: 22,
  gradesDay6: 23,
  gradesDay7: 24,
  stimDays: 25,
  peakE2: 26,
  pgsTest: 27,
  normals: 28,
  mosaics: 29,
  inconclusives: 30,
  clinic: 31,     // SKIP
  doctor: 32,     // SKIP
  cost: 33,       // SKIP
  currency: 34,   // SKIP
  pharmacy: 35,   // SKIP
  diagnosis: 36,
  protocol: 37,
  hgh: 38,
  trigger: 39,
  menopur: 40,
  gonalF: 41,
  clomid: 42,
  letrozole: 43,
  dex: 44,
  lupron: 45,
  otherMeds: 46,
  supplements: 47,
  partnerSupplements: 48,
  // 49+ are lifestyle fields — SKIP
};

// ── Mapping functions ──

function mapProtocolType(raw) {
  if (!raw) return 'other';
  const s = String(raw).toLowerCase().trim();
  if (s.includes('antagonist') && s.includes('estrogen')) return 'estrogen_priming';
  if (s.includes('antagonist') || s.includes('ganirelix') || s.includes('cetrotide')) return 'antagonist';
  if (s.includes('luteal lupron') || s.includes('long lupron') || s.includes('down regulation') || s.includes('agonist')) return 'long_lupron';
  if (s.includes('flair') || s.includes('flare') || s.includes('micro-flare') || s.includes('short lupron') || s.includes('short protocol')) return 'flare';
  if (s.includes('mini') || s.includes('micro-ivf') || s.includes('micro ivf')) return 'mini_ivf';
  if (s.includes('natural')) return 'natural';
  return 'other';
}

function mapCycleType(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('converted to frozen') || s.includes('fresh converted')) return 'fresh_to_frozen';
  if (s.includes('freeze') || s.includes('frozen (freeze')) return 'freeze_all';
  if (s.includes('fresh')) return 'fresh_transfer';
  return null;
}

function mapTrigger(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'dual') return 'dual';
  if (s === 'hcg') return 'hcg';
  if (s === 'lupron') return 'lupron';
  return 'other';
}

function mapFertilization(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'icsi') return 'icsi';
  if (s === 'imsi') return 'imsi';
  if (s === 'picsi') return 'picsi';
  if (s === 'macs') return 'macs';
  if (s === 'standard' || s === 'conventional') return 'standard';
  if (s === 'other') return 'other';
  return null;
}

function mapDiagnoses(raw) {
  if (!raw) return [];
  const parts = String(raw).split(',').map(s => s.trim().toLowerCase());
  const result = [];
  for (const p of parts) {
    if (p.includes('diminished') || p.includes('dor')) result.push('dor');
    else if (p.includes('pcos') || p.includes('ovulation disorders') || p.includes('ovulation disorder')) result.push('pcos');
    else if (p.includes('endometriosis')) result.push('endometriosis');
    else if (p.includes('male factor')) result.push('male_factor');
    else if (p.includes('tubal')) result.push('tubal');
    else if (p.includes('unexplained')) result.push('unexplained');
    else if (p.includes('recurrent') || p.includes('pregnancy loss')) result.push('recurrent_loss');
    else if (p.includes('premature ovarian')) result.push('pof');
    else if (p.includes('genetic') || p.includes('carrier')) result.push('genetic_carrier');
    else if (p.includes('cancer')) result.push('cancer_other');
    else if (p.includes('not infertile') || p.includes('not infertile')) result.push('not_infertile');
    else if (p.includes("don't know") || p.includes('i don')) result.push('unknown');
  }
  return [...new Set(result)]; // dedupe
}

function mapAmhRange(value) {
  if (value == null || isNaN(value)) return null;
  if (value < 0.5) return '<0.5';
  if (value < 1.0) return '0.5-1.0';
  if (value < 1.5) return '1.0-1.5';
  if (value < 2.0) return '1.5-2.0';
  if (value < 3.0) return '2.0-3.0';
  if (value < 4.0) return '3.0-4.0';
  return '4.0+';
}

function mapAfcRange(value) {
  if (value == null || isNaN(value)) return null;
  if (value < 5) return '<5';
  if (value <= 10) return '5-10';
  if (value <= 15) return '11-15';
  if (value <= 20) return '16-20';
  if (value <= 30) return '21-30';
  return '30+';
}

function parseBool(raw) {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().trim();
  if (s === 'yes' || s === 'true' || s === '1') return 1;
  if (s === 'no' || s === 'false' || s === '0') return 0;
  return null;
}

function safeInt(val, min = 0, max = 999) {
  if (val == null || val === '' || val === 'N/A' || val === 'n/a') return null;
  const n = parseInt(String(val), 10);
  if (isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function safeFloat(val, min = 0, max = 99999) {
  if (val == null || val === '' || val === 'N/A' || val === 'n/a') return null;
  const n = parseFloat(String(val));
  if (isNaN(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

function parseMedications(row) {
  const meds = [];

  // Menopur
  const menopur = String(row[COLS.menopur] || '').trim();
  if (menopur && menopur !== 'N/A' && menopur !== 'NONE' && menopur !== 'None') {
    meds.push({ name: 'Menopur', dosage: menopur.replace('ml', ' IU'), category: 'stim' });
  }

  // Gonal-F / Follistim
  const gonalF = String(row[COLS.gonalF] || '').trim();
  if (gonalF && gonalF !== 'N/A' && gonalF !== 'NONE' && gonalF !== 'None' && gonalF !== 'Other') {
    const dosage = gonalF.match(/\d+/) ? `${gonalF.match(/\d+/)[0]} IU` : gonalF;
    meds.push({ name: 'Gonal-F', dosage, category: 'stim' });
  }

  // Clomid
  const clomid = String(row[COLS.clomid] || '').trim();
  if (clomid && clomid !== 'NONE' && clomid !== 'None' && clomid !== 'N/A') {
    meds.push({ name: 'Clomid', dosage: clomid, category: 'stim' });
  }

  // Letrozole
  const letrozole = String(row[COLS.letrozole] || '').trim();
  if (letrozole && letrozole !== 'NONE' && letrozole !== 'None' && letrozole !== 'N/A' && letrozole !== 'Other') {
    meds.push({ name: 'Letrozole', dosage: letrozole, category: 'stim' });
  }

  // Dexamethasone
  if (parseBool(row[COLS.dex]) === 1) {
    meds.push({ name: 'Dexamethasone', dosage: '', category: 'stim' });
  }

  // Lupron (as stim, not trigger)
  if (parseBool(row[COLS.lupron]) === 1) {
    meds.push({ name: 'Lupron', dosage: '', category: 'stim' });
  }

  // HGH / Omnitrope
  if (parseBool(row[COLS.hgh]) === 1) {
    meds.push({ name: 'Omnitrope', dosage: '', category: 'stim' });
  }

  // Other meds
  const otherMeds = String(row[COLS.otherMeds] || '').trim();
  if (otherMeds && otherMeds !== 'None' && otherMeds !== 'NONE') {
    // Parse comma-separated or known meds
    const parts = otherMeds.split(',').map(s => s.trim()).filter(s => s && s !== 'None');
    for (const part of parts) {
      if (part.toLowerCase().includes('omnitrope') && !meds.some(m => m.name === 'Omnitrope')) {
        meds.push({ name: 'Omnitrope', dosage: '', category: 'stim' });
      } else if (part.toLowerCase().includes('ganirelix')) {
        meds.push({ name: 'Ganirelix', dosage: '', category: 'stim' });
      } else if (part.toLowerCase().includes('cetrotide')) {
        meds.push({ name: 'Cetrotide', dosage: '', category: 'stim' });
      } else if (!meds.some(m => m.name.toLowerCase() === part.toLowerCase())) {
        meds.push({ name: part.slice(0, 100), dosage: '', category: 'stim' });
      }
    }
  }

  return meds;
}

function importRow(row, stmts) {
  // Skip rows with no age or clearly invalid data
  const age = safeInt(row[COLS.age], 13, 55);
  if (!age) return false;

  const protocolId = randomUUID();

  // Generate a fake passphrase hash — these records are not editable
  const fakeHash = createHash('sha256').update(randomUUID()).digest('hex');
  const fakePrefix = 'IMPORTED';

  const protocolType = mapProtocolType(row[COLS.protocol]);
  const cycleType = mapCycleType(row[COLS.cycleType]);
  const triggerType = mapTrigger(row[COLS.trigger]);
  const fertilizationMethod = mapFertilization(row[COLS.fertilization]);

  const amhValue = safeFloat(row[COLS.amh], 0, 30);
  const amhRange = mapAmhRange(amhValue);
  const afcCount = safeInt(row[COLS.afc], 0, 80);
  const afcRange = mapAfcRange(afcCount);

  const cycleNumber = safeInt(row[COLS.cycleNumber], 1, 20);
  const donorSperm = parseBool(row[COLS.donorSperm]);
  const donorEggs = parseBool(row[COLS.donorEggs]);
  const partnerAge = safeInt(row[COLS.partnerAge], 18, 80);
  const peakE2 = safeFloat(row[COLS.peakE2], 0, 20000);
  const maxFollicles = safeInt(row[COLS.maxFollicles], 0, 80);
  const stimDays = safeInt(row[COLS.stimDays], 1, 30);

  // Insert protocol
  stmts.insertProtocol.run(
    protocolId, fakeHash, fakePrefix,
    age, null, // ageMonths
    amhRange, amhValue, afcRange, afcCount,
    protocolType, triggerType, stimDays,
    null, null, // country, state (not in survey)
    cycleNumber, cycleType, donorSperm, donorEggs,
    fertilizationMethod, partnerAge, peakE2, maxFollicles
  );

  // Insert diagnoses
  const diagnoses = mapDiagnoses(row[COLS.diagnosis]);
  for (const dx of diagnoses) {
    stmts.insertDiagnosis.run(randomUUID(), protocolId, dx);
  }

  // Insert medications
  const meds = parseMedications(row);
  for (const med of meds) {
    try {
      stmts.insertMedication.run(randomUUID(), protocolId, med.name, med.dosage, med.category);
    } catch {
      // Skip duplicate medication names
    }
  }

  // Insert outcomes (if we have retrieval data)
  const eggsRetrieved = safeInt(row[COLS.eggsRetrieved], 0, 80);
  if (eggsRetrieved != null || cycleType === 'cancelled') {
    const pgsTest = String(row[COLS.pgsTest] || '').toLowerCase();
    const didPgt = pgsTest === 'yes';

    stmts.insertOutcome.run(
      randomUUID(), protocolId,
      eggsRetrieved,
      safeInt(row[COLS.eggsMature], 0, 80),
      safeInt(row[COLS.fertilized], 0, 80),
      safeInt(row[COLS.eggsFrozen], 0, 80),
      safeInt(row[COLS.eggsThawed], 0, 80),
      safeInt(row[COLS.day3], 0, 60),
      safeInt(row[COLS.day5], 0, 40),
      safeInt(row[COLS.day6], 0, 40),
      safeInt(row[COLS.day7], 0, 20),
      row[COLS.gradesDay5] ? String(row[COLS.gradesDay5]).slice(0, 200) : null,
      row[COLS.gradesDay6] ? String(row[COLS.gradesDay6]).slice(0, 200) : null,
      row[COLS.gradesDay7] ? String(row[COLS.gradesDay7]).slice(0, 200) : null,
      didPgt ? safeInt(row[COLS.normals], 0, 40) : null, // pgt_tested approximated from normals + mosaics + inconclusives
      didPgt ? safeInt(row[COLS.normals], 0, 40) : null,
      didPgt ? safeInt(row[COLS.mosaics], 0, 40) : null,
      null, // pgt_aneuploid not in survey
      didPgt ? safeInt(row[COLS.inconclusives], 0, 40) : null,
      null, null // transfer_count, transfer_outcome (not in survey)
    );
  }

  return true;
}

// ── Main ──

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Usage: node scripts/import-survey.mjs /path/to/survey.xlsx');
  process.exit(1);
}

console.log(`Reading ${xlsxPath}...`);
const wb = XLSX.readFile(xlsxPath);

// Open DB
console.log(`Opening database at ${DB_PATH}...`);
const db = new Database(DB_PATH, { verbose: undefined });
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Prepare statements
const stmts = {
  insertProtocol: db.prepare(`
    INSERT INTO protocols (
      id, passphrase_hash, passphrase_prefix,
      age, age_months, amh_range, amh_value, afc_range, afc_count,
      protocol_type, trigger_type, stim_days,
      country, state,
      cycle_number, cycle_type, donor_sperm, donor_eggs,
      fertilization_method, partner_age, peak_e2, max_follicles
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  insertMedication: db.prepare(
    `INSERT OR IGNORE INTO medications (id, protocol_id, name, dosage, category) VALUES (?, ?, ?, ?, ?)`
  ),
  insertDiagnosis: db.prepare(
    `INSERT OR IGNORE INTO diagnoses (id, protocol_id, diagnosis) VALUES (?, ?, ?)`
  ),
  insertOutcome: db.prepare(`
    INSERT INTO outcomes (
      id, protocol_id,
      eggs_retrieved, eggs_mature, eggs_fertilized,
      eggs_frozen, eggs_thawed, day3_embryos,
      blasts_day5, blasts_day6, blasts_day7,
      embryo_grades_day5, embryo_grades_day6, embryo_grades_day7,
      pgt_tested, pgt_euploid, pgt_mosaic, pgt_aneuploid, pgt_inconclusive,
      transfer_count, transfer_outcome
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
};

let totalImported = 0;
let totalSkipped = 0;

// Process "Retrieval  Data" sheet (main data, rows start at index 6)
const sheet1 = wb.Sheets['Retrieval  Data'];
if (sheet1) {
  const data = XLSX.utils.sheet_to_json(sheet1, { header: 1 });
  console.log(`\nSheet "Retrieval Data": ${data.length} total rows`);

  const transaction = db.transaction(() => {
    for (let i = 6; i < data.length; i++) {
      const row = data[i];
      if (!row || !row.some(c => c != null && c !== undefined)) continue;

      // Skip header-like rows that snuck in
      if (typeof row[COLS.age] === 'string' && row[COLS.age].toLowerCase().includes('age')) continue;
      if (typeof row[COLS.cycleType] === 'string' && row[COLS.cycleType].includes('SURVEY')) continue;

      try {
        if (importRow(row, stmts)) {
          totalImported++;
        } else {
          totalSkipped++;
        }
      } catch (err) {
        totalSkipped++;
        if (totalSkipped <= 5) console.warn(`  Row ${i}: ${err.message}`);
      }
    }
  });
  transaction();
}

// Process "40+ data" sheet (same column layout, rows start at index 1)
const sheet2 = wb.Sheets['40+ data'];
if (sheet2) {
  const data = XLSX.utils.sheet_to_json(sheet2, { header: 1 });
  console.log(`\nSheet "40+ data": ${data.length} total rows`);

  // Column indices for this sheet are the SAME as the header row
  // (columns match the 40+ data headers which are identical)
  const transaction = db.transaction(() => {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || !row.some(c => c != null && c !== undefined)) continue;

      // For this sheet, column indices start at 0 (no timestamp column offset)
      // But looking at the data, the headers match the same structure.
      // Let me remap:
      const mappedRow = [];
      mappedRow[COLS.timestamp] = null;
      mappedRow[COLS.cycleNumber] = row[0];   // Cycle #
      mappedRow[COLS.date] = row[1];           // Date
      mappedRow[COLS.age] = row[2];            // Egg Age
      mappedRow[COLS.amh] = row[3];            // AMH
      mappedRow[COLS.afc] = row[4];            // AFC
      mappedRow[COLS.maxFollicles] = row[5];   // Follicles
      mappedRow[COLS.cycleType] = row[6];      // Cycle Type
      mappedRow[COLS.donorSperm] = row[7];     // Donor Sperm
      mappedRow[COLS.donorEggs] = row[8];      // Donor Eggs
      mappedRow[COLS.eggsRetrieved] = row[9];  // Eggs Retrieved
      mappedRow[COLS.eggsMature] = row[10];    // Mature Eggs
      mappedRow[COLS.eggsFrozen] = row[11];    // Eggs Frozen
      mappedRow[COLS.eggsThawed] = row[12];    // Eggs Thawed
      mappedRow[COLS.partnerAge] = row[13];    // Sperm Age
      mappedRow[COLS.fertilization] = row[14]; // Fertilization
      mappedRow[COLS.fertilized] = row[15];    // Fertilized
      mappedRow[COLS.day3] = row[16];          // Day 3
      mappedRow[COLS.day5] = row[17];          // Day 5
      mappedRow[COLS.day6] = row[18];          // Day 6
      mappedRow[COLS.day7] = row[19];          // Day 7
      mappedRow[COLS.totalBlasts] = row[20];   // Total Blasts
      mappedRow[COLS.gradesDay5] = row[21];    // Day 5 Grades
      mappedRow[COLS.gradesDay6] = row[22];    // Day 6 Grades
      mappedRow[COLS.gradesDay7] = row[23];    // Day 7 Grades
      mappedRow[COLS.stimDays] = row[24];      // Stim Days
      mappedRow[COLS.peakE2] = row[25];        // Peak E2
      mappedRow[COLS.pgsTest] = row[26];       // PGS Test?
      mappedRow[COLS.normals] = row[27];       // Normals
      mappedRow[COLS.mosaics] = row[28];       // Mosaics
      mappedRow[COLS.inconclusives] = row[29]; // Inconclusives
      mappedRow[COLS.clinic] = row[30];        // Clinic (SKIP)
      mappedRow[COLS.doctor] = row[31];        // Doctor (SKIP)
      mappedRow[COLS.cost] = row[32];          // Cost (SKIP)
      mappedRow[COLS.currency] = row[33];      // Currency (SKIP)
      mappedRow[COLS.pharmacy] = row[34];      // Pharmacy (SKIP)
      mappedRow[COLS.diagnosis] = row[35];     // Diagnosis
      mappedRow[COLS.protocol] = row[36];      // Protocol
      mappedRow[COLS.hgh] = row[37];           // HGH
      mappedRow[COLS.trigger] = row[38];       // Trigger
      mappedRow[COLS.menopur] = row[39];       // Menopur
      mappedRow[COLS.gonalF] = row[40];        // Gonal-F
      mappedRow[COLS.clomid] = row[41];        // Clomid
      mappedRow[COLS.letrozole] = row[42];     // Letrozole
      mappedRow[COLS.dex] = row[43];           // DEX
      mappedRow[COLS.lupron] = row[44];        // Lupron
      mappedRow[COLS.otherMeds] = row[45];     // Other Meds
      mappedRow[COLS.supplements] = row[46];   // Supplements

      try {
        if (importRow(mappedRow, stmts)) {
          totalImported++;
        } else {
          totalSkipped++;
        }
      } catch (err) {
        totalSkipped++;
        if (totalSkipped <= 10) console.warn(`  Row ${i}: ${err.message}`);
      }
    }
  });
  transaction();
}

console.log(`\n✅ Import complete!`);
console.log(`   Imported: ${totalImported} protocols`);
console.log(`   Skipped:  ${totalSkipped} rows (invalid/empty)`);

// Quick summary
const counts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM protocols) as protocols,
    (SELECT COUNT(*) FROM outcomes) as outcomes,
    (SELECT COUNT(*) FROM medications) as medications,
    (SELECT COUNT(*) FROM diagnoses) as diagnoses
`).get();
console.log(`\n📊 Database totals:`);
console.log(`   Protocols:   ${counts.protocols}`);
console.log(`   Outcomes:    ${counts.outcomes}`);
console.log(`   Medications: ${counts.medications}`);
console.log(`   Diagnoses:   ${counts.diagnoses}`);

db.close();
