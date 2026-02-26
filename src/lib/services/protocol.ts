import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { generatePassphrase, hashPassphrase, computePrefix, comparePassphrase } from './passphrase';
import type { ProtocolSubmitInput } from '@/lib/validators/protocol';
import type { OutcomeSubmitInput } from '@/lib/validators/outcome';
import type { Protocol, Outcome, Medication, ProtocolWithOutcome, Diagnosis } from '@/types/protocol';

interface SubmitResult {
  protocolId: string;
  passphrase: string;
}

/**
 * Save a new protocol and return the generated passphrase.
 */
export async function submitProtocol(data: ProtocolSubmitInput): Promise<SubmitResult> {
  const db = getDb();
  const protocolId = uuid();
  const passphrase = generatePassphrase();
  const passphraseHash = await hashPassphrase(passphrase);
  const prefix = computePrefix(passphrase);

  const insertProtocol = db.prepare(`
    INSERT INTO protocols (
      id, passphrase_hash, passphrase_prefix,
      age, age_months, amh_range, amh_value, afc_range, afc_count,
      protocol_type, trigger_type, stim_days,
      country, state,
      cycle_number, cycle_type, donor_sperm, donor_eggs,
      fertilization_method, partner_age, peak_e2, max_follicles
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedication = db.prepare(
    `INSERT INTO medications (id, protocol_id, name, dosage, category) VALUES (?, ?, ?, ?, ?)`
  );

  const insertDiagnosis = db.prepare(
    `INSERT INTO diagnoses (id, protocol_id, diagnosis) VALUES (?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    insertProtocol.run(
      protocolId, passphraseHash, prefix,
      data.age, data.ageMonths, data.amhRange, data.amhValue, data.afcRange, data.afcCount,
      data.protocolType, data.triggerType, data.stimDays,
      data.country, data.state,
      data.cycleNumber, data.cycleType,
      data.donorSperm == null ? null : data.donorSperm ? 1 : 0,
      data.donorEggs == null ? null : data.donorEggs ? 1 : 0,
      data.fertilizationMethod, data.partnerAge, data.peakE2, data.maxFollicles
    );

    for (const med of data.medications) {
      insertMedication.run(uuid(), protocolId, med.name, med.dosage, med.category || 'stim');
    }

    for (const dx of data.diagnoses ?? []) {
      insertDiagnosis.run(uuid(), protocolId, dx);
    }
  });

  transaction();

  return { protocolId, passphrase };
}

/**
 * Save a new protocol for a returning user (reuses their existing passphrase hash).
 * Auto-increments cycle_number based on existing cycles.
 */
export function submitProtocolForReturningUser(
  data: ProtocolSubmitInput,
  passphraseHash: string,
  passphrasePrefix: string
): { protocolId: string } {
  const db = getDb();
  const protocolId = uuid();

  // Auto-calculate cycle number: max of existing cycles + 1
  const maxCycleRow = db.prepare(`
    SELECT MAX(cycle_number) as max_cycle FROM protocols
    WHERE passphrase_hash = ? AND is_active = 1
  `).get(passphraseHash) as { max_cycle: number | null } | undefined;

  const nextCycleNumber = data.cycleNumber ?? ((maxCycleRow?.max_cycle ?? 0) + 1);

  const insertProtocol = db.prepare(`
    INSERT INTO protocols (
      id, passphrase_hash, passphrase_prefix,
      age, age_months, amh_range, amh_value, afc_range, afc_count,
      protocol_type, trigger_type, stim_days,
      country, state,
      cycle_number, cycle_type, donor_sperm, donor_eggs,
      fertilization_method, partner_age, peak_e2, max_follicles
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedication = db.prepare(
    `INSERT INTO medications (id, protocol_id, name, dosage, category) VALUES (?, ?, ?, ?, ?)`
  );

  const insertDiagnosis = db.prepare(
    `INSERT INTO diagnoses (id, protocol_id, diagnosis) VALUES (?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    insertProtocol.run(
      protocolId, passphraseHash, passphrasePrefix,
      data.age, data.ageMonths, data.amhRange, data.amhValue, data.afcRange, data.afcCount,
      data.protocolType, data.triggerType, data.stimDays,
      data.country, data.state,
      nextCycleNumber, data.cycleType,
      data.donorSperm == null ? null : data.donorSperm ? 1 : 0,
      data.donorEggs == null ? null : data.donorEggs ? 1 : 0,
      data.fertilizationMethod, data.partnerAge, data.peakE2, data.maxFollicles
    );

    for (const med of data.medications) {
      insertMedication.run(uuid(), protocolId, med.name, med.dosage, med.category || 'stim');
    }

    for (const dx of data.diagnoses ?? []) {
      insertDiagnosis.run(uuid(), protocolId, dx);
    }
  });

  transaction();

  return { protocolId };
}

/**
 * Look up a single protocol by passphrase.
 * Uses prefix-accelerated bcrypt comparison.
 * Returns the first matching protocol (for backwards compatibility).
 */
export async function lookupByPassphrase(passphrase: string): Promise<ProtocolWithOutcome | null> {
  const db = getDb();
  const prefix = computePrefix(passphrase);

  // Narrow search using prefix
  const candidates = db.prepare(`
    SELECT * FROM protocols WHERE passphrase_prefix = ? AND is_active = 1
  `).all(prefix) as Array<Record<string, unknown>>;

  for (const row of candidates) {
    const matches = await comparePassphrase(passphrase, row.passphrase_hash as string);
    if (matches) {
      return hydrateProtocol(db, row);
    }
  }

  return null;
}

/**
 * Look up ALL protocols for a passphrase (multi-cycle support).
 * Returns all protocols sharing the same passphrase, sorted newest-first.
 */
export async function lookupAllByPassphrase(passphrase: string): Promise<ProtocolWithOutcome[]> {
  const db = getDb();
  const prefix = computePrefix(passphrase);

  // Narrow search using prefix
  const candidates = db.prepare(`
    SELECT * FROM protocols WHERE passphrase_prefix = ? AND is_active = 1
  `).all(prefix) as Array<Record<string, unknown>>;

  // Find the first bcrypt match to get the hash
  let matchedHash: string | null = null;
  for (const row of candidates) {
    const matches = await comparePassphrase(passphrase, row.passphrase_hash as string);
    if (matches) {
      matchedHash = row.passphrase_hash as string;
      break;
    }
  }

  if (!matchedHash) return [];

  // Fetch ALL protocols with the same hash, sorted newest-first
  const allRows = db.prepare(`
    SELECT * FROM protocols
    WHERE passphrase_hash = ? AND is_active = 1
    ORDER BY submitted_at DESC
  `).all(matchedHash) as Array<Record<string, unknown>>;

  const results: ProtocolWithOutcome[] = [];
  for (const row of allRows) {
    results.push(hydrateProtocol(db, row));
  }

  return results;
}

/**
 * Hydrate a protocol row with its medications, diagnoses, and outcome.
 */
function hydrateProtocol(db: ReturnType<typeof getDb>, row: Record<string, unknown>): ProtocolWithOutcome {
  const protocol = rowToProtocol(row);

  // Fetch medications
  const meds = db.prepare(`SELECT name, dosage, category FROM medications WHERE protocol_id = ?`).all(row.id as string) as Medication[];
  protocol.medications = meds;

  // Fetch diagnoses
  const dxRows = db.prepare(`SELECT diagnosis FROM diagnoses WHERE protocol_id = ?`).all(row.id as string) as Array<{ diagnosis: string }>;
  protocol.diagnoses = dxRows.map(d => d.diagnosis as Diagnosis);

  // Fetch outcome
  const outcomeRow = db.prepare(`SELECT * FROM outcomes WHERE protocol_id = ?`).get(row.id as string) as Record<string, unknown> | undefined;
  const outcome = outcomeRow ? rowToOutcome(outcomeRow) : null;

  return { ...protocol, outcome };
}

/**
 * Update or insert outcomes for a protocol.
 */
export function upsertOutcome(protocolId: string, data: OutcomeSubmitInput): void {
  const db = getDb();

  const existing = db.prepare(`SELECT id FROM outcomes WHERE protocol_id = ?`).get(protocolId) as { id: string } | undefined;

  if (existing) {
    db.prepare(`
      UPDATE outcomes SET
        eggs_retrieved = ?, eggs_mature = ?, eggs_fertilized = ?,
        eggs_frozen = ?, eggs_thawed = ?, day3_embryos = ?,
        blasts_day5 = ?, blasts_day6 = ?, blasts_day7 = ?,
        embryo_grades_day5 = ?, embryo_grades_day6 = ?, embryo_grades_day7 = ?,
        pgt_tested = ?, pgt_euploid = ?, pgt_mosaic = ?, pgt_aneuploid = ?, pgt_inconclusive = ?,
        transfer_count = ?, transfer_outcome = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.eggsRetrieved, data.eggsMature, data.eggsFertilized,
      data.eggsFrozen, data.eggsThawed, data.day3Embryos,
      data.blastsDay5, data.blastsDay6, data.blastsDay7,
      data.embryoGradesDay5, data.embryoGradesDay6, data.embryoGradesDay7,
      data.pgtTested, data.pgtEuploid, data.pgtMosaic, data.pgtAneuploid, data.pgtInconclusive,
      data.transferCount, data.transferOutcome,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO outcomes (id, protocol_id,
        eggs_retrieved, eggs_mature, eggs_fertilized,
        eggs_frozen, eggs_thawed, day3_embryos,
        blasts_day5, blasts_day6, blasts_day7,
        embryo_grades_day5, embryo_grades_day6, embryo_grades_day7,
        pgt_tested, pgt_euploid, pgt_mosaic, pgt_aneuploid, pgt_inconclusive,
        transfer_count, transfer_outcome)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(), protocolId,
      data.eggsRetrieved, data.eggsMature, data.eggsFertilized,
      data.eggsFrozen, data.eggsThawed, data.day3Embryos,
      data.blastsDay5, data.blastsDay6, data.blastsDay7,
      data.embryoGradesDay5, data.embryoGradesDay6, data.embryoGradesDay7,
      data.pgtTested, data.pgtEuploid, data.pgtMosaic, data.pgtAneuploid, data.pgtInconclusive,
      data.transferCount, data.transferOutcome
    );
  }
}

/**
 * Hard-delete ALL protocols for a passphrase and all related data.
 * Uses prefix-accelerated bcrypt lookup.
 * Returns true if any records were found and deleted.
 */
export async function deleteByPassphrase(passphrase: string): Promise<boolean> {
  const db = getDb();
  const prefix = computePrefix(passphrase);

  const candidates = db.prepare(
    `SELECT id, passphrase_hash FROM protocols WHERE passphrase_prefix = ? AND is_active = 1`
  ).all(prefix) as Array<{ id: string; passphrase_hash: string }>;

  // Find the matching hash
  let matchedHash: string | null = null;
  for (const row of candidates) {
    const matches = await comparePassphrase(passphrase, row.passphrase_hash);
    if (matches) {
      matchedHash = row.passphrase_hash;
      break;
    }
  }

  if (!matchedHash) return false;

  // Delete ALL protocols with the same hash
  const allRows = db.prepare(
    `SELECT id FROM protocols WHERE passphrase_hash = ? AND is_active = 1`
  ).all(matchedHash) as Array<{ id: string }>;

  const deleteProtocol = db.prepare(`DELETE FROM protocols WHERE id = ?`);
  const transaction = db.transaction(() => {
    for (const row of allRows) {
      // CASCADE deletes medications + outcomes + diagnoses automatically
      deleteProtocol.run(row.id);
    }
  });
  transaction();

  return allRows.length > 0;
}

/**
 * Hard-delete a single protocol by ID, after verifying passphrase ownership.
 * Returns true if the protocol was found and deleted.
 */
export async function deleteProtocolById(protocolId: string, passphrase: string): Promise<boolean> {
  const db = getDb();

  // Fetch the protocol to verify ownership
  const row = db.prepare(
    `SELECT passphrase_hash FROM protocols WHERE id = ? AND is_active = 1`
  ).get(protocolId) as { passphrase_hash: string } | undefined;

  if (!row) return false;

  const matches = await comparePassphrase(passphrase, row.passphrase_hash);
  if (!matches) return false;

  // CASCADE deletes medications + outcomes + diagnoses automatically
  db.prepare(`DELETE FROM protocols WHERE id = ?`).run(protocolId);
  return true;
}

/**
 * Get the passphrase hash and prefix for a verified passphrase.
 * Used when a returning user submits a new cycle.
 */
export async function getPassphraseCredentials(passphrase: string): Promise<{ hash: string; prefix: string } | null> {
  const db = getDb();
  const prefix = computePrefix(passphrase);

  const candidates = db.prepare(
    `SELECT passphrase_hash, passphrase_prefix FROM protocols WHERE passphrase_prefix = ? AND is_active = 1`
  ).all(prefix) as Array<{ passphrase_hash: string; passphrase_prefix: string }>;

  for (const row of candidates) {
    const matches = await comparePassphrase(passphrase, row.passphrase_hash);
    if (matches) {
      return { hash: row.passphrase_hash, prefix: row.passphrase_prefix };
    }
  }

  return null;
}

function rowToProtocol(row: Record<string, unknown>): Protocol {
  return {
    id: row.id as string,
    age: row.age as number,
    ageMonths: (row.age_months as number) ?? null,
    amhRange: (row.amh_range as Protocol['amhRange']) || null,
    amhValue: (row.amh_value as number) ?? null,
    afcRange: (row.afc_range as Protocol['afcRange']) || null,
    afcCount: (row.afc_count as number) ?? null,
    protocolType: (row.protocol_type as Protocol['protocolType']) ?? null,
    triggerType: (row.trigger_type as Protocol['triggerType']) || null,
    stimDays: (row.stim_days as number) || null,
    country: (row.country as string) || null,
    state: (row.state as string) || null,
    cycleNumber: (row.cycle_number as number) ?? null,
    cycleType: (row.cycle_type as Protocol['cycleType']) || null,
    donorSperm: row.donor_sperm == null ? null : row.donor_sperm === 1,
    donorEggs: row.donor_eggs == null ? null : row.donor_eggs === 1,
    fertilizationMethod: (row.fertilization_method as Protocol['fertilizationMethod']) || null,
    partnerAge: (row.partner_age as number) ?? null,
    peakE2: (row.peak_e2 as number) ?? null,
    maxFollicles: (row.max_follicles as number) ?? null,
    diagnoses: [],
    medications: [],
    submittedAt: row.submitted_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToOutcome(row: Record<string, unknown>): Outcome {
  return {
    id: row.id as string,
    protocolId: row.protocol_id as string,
    eggsRetrieved: row.eggs_retrieved as number | null,
    eggsMature: row.eggs_mature as number | null,
    eggsFertilized: row.eggs_fertilized as number | null,
    eggsFrozen: row.eggs_frozen as number | null,
    eggsThawed: row.eggs_thawed as number | null,
    day3Embryos: row.day3_embryos as number | null,
    blastsDay5: row.blasts_day5 as number | null,
    blastsDay6: row.blasts_day6 as number | null,
    blastsDay7: row.blasts_day7 as number | null,
    embryoGradesDay5: row.embryo_grades_day5 as string | null,
    embryoGradesDay6: row.embryo_grades_day6 as string | null,
    embryoGradesDay7: row.embryo_grades_day7 as string | null,
    pgtTested: row.pgt_tested as number | null,
    pgtEuploid: row.pgt_euploid as number | null,
    pgtMosaic: row.pgt_mosaic as number | null,
    pgtAneuploid: row.pgt_aneuploid as number | null,
    pgtInconclusive: row.pgt_inconclusive as number | null,
    transferCount: row.transfer_count as number | null,
    transferOutcome: row.transfer_outcome as Outcome['transferOutcome'],
    reportedAt: row.reported_at as string,
    updatedAt: row.updated_at as string,
  };
}
