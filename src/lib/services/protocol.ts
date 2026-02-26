import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/db';
import { generatePassphrase, hashPassphrase, computePrefix, comparePassphrase } from './passphrase';
import type { ProtocolSubmitInput } from '@/lib/validators/protocol';
import type { OutcomeSubmitInput } from '@/lib/validators/outcome';
import type { Protocol, Outcome, Medication, ProtocolWithOutcome } from '@/types/protocol';

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
    INSERT INTO protocols (id, passphrase_hash, passphrase_prefix, age, age_months, amh_range, afc_range, protocol_type, trigger_type, stim_days, country, state)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMedication = db.prepare(`
    INSERT INTO medications (id, protocol_id, name, dosage, category) VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    insertProtocol.run(
      protocolId,
      passphraseHash,
      prefix,
      data.age,
      data.ageMonths,
      data.amhRange,
      data.afcRange,
      data.protocolType,
      data.triggerType,
      data.stimDays,
      data.country,
      data.state
    );

    for (const med of data.medications) {
      insertMedication.run(uuid(), protocolId, med.name, med.dosage, med.category || 'stim');
    }
  });

  transaction();

  return { protocolId, passphrase };
}

/**
 * Look up a protocol by passphrase.
 * Uses prefix-accelerated bcrypt comparison.
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
      const protocol = rowToProtocol(row);

      // Fetch medications
      const meds = db.prepare(`SELECT name, dosage, category FROM medications WHERE protocol_id = ?`).all(row.id as string) as Medication[];
      protocol.medications = meds;

      // Fetch outcome
      const outcomeRow = db.prepare(`SELECT * FROM outcomes WHERE protocol_id = ?`).get(row.id as string) as Record<string, unknown> | undefined;
      const outcome = outcomeRow ? rowToOutcome(outcomeRow) : null;

      return { ...protocol, outcome };
    }
  }

  return null;
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
        blasts_day5 = ?, blasts_day6 = ?, blasts_day7 = ?,
        pgt_tested = ?, pgt_euploid = ?, pgt_mosaic = ?, pgt_aneuploid = ?,
        transfer_count = ?, transfer_outcome = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      data.eggsRetrieved, data.eggsMature, data.eggsFertilized,
      data.blastsDay5, data.blastsDay6, data.blastsDay7,
      data.pgtTested, data.pgtEuploid, data.pgtMosaic, data.pgtAneuploid,
      data.transferCount, data.transferOutcome,
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO outcomes (id, protocol_id, eggs_retrieved, eggs_mature, eggs_fertilized,
        blasts_day5, blasts_day6, blasts_day7,
        pgt_tested, pgt_euploid, pgt_mosaic, pgt_aneuploid,
        transfer_count, transfer_outcome)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuid(), protocolId,
      data.eggsRetrieved, data.eggsMature, data.eggsFertilized,
      data.blastsDay5, data.blastsDay6, data.blastsDay7,
      data.pgtTested, data.pgtEuploid, data.pgtMosaic, data.pgtAneuploid,
      data.transferCount, data.transferOutcome
    );
  }
}

/**
 * Hard-delete a protocol and all related data (medications, outcomes).
 * Uses prefix-accelerated bcrypt lookup, same as lookupByPassphrase.
 * Returns true if a record was found and deleted.
 */
export async function deleteByPassphrase(passphrase: string): Promise<boolean> {
  const db = getDb();
  const prefix = computePrefix(passphrase);

  const candidates = db.prepare(
    `SELECT id, passphrase_hash FROM protocols WHERE passphrase_prefix = ? AND is_active = 1`
  ).all(prefix) as Array<{ id: string; passphrase_hash: string }>;

  for (const row of candidates) {
    const matches = await comparePassphrase(passphrase, row.passphrase_hash);
    if (matches) {
      // CASCADE deletes medications + outcomes automatically
      const deleteProtocol = db.prepare(`DELETE FROM protocols WHERE id = ?`);
      deleteProtocol.run(row.id);
      return true;
    }
  }

  return false;
}

function rowToProtocol(row: Record<string, unknown>): Protocol {
  return {
    id: row.id as string,
    age: row.age as number,
    ageMonths: (row.age_months as number) ?? null,
    amhRange: (row.amh_range as Protocol['amhRange']) || null,
    afcRange: (row.afc_range as Protocol['afcRange']) || null,
    protocolType: row.protocol_type as Protocol['protocolType'],
    triggerType: (row.trigger_type as Protocol['triggerType']) || null,
    stimDays: (row.stim_days as number) || null,
    country: (row.country as string) || null,
    state: (row.state as string) || null,
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
    blastsDay5: row.blasts_day5 as number | null,
    blastsDay6: row.blasts_day6 as number | null,
    blastsDay7: row.blasts_day7 as number | null,
    pgtTested: row.pgt_tested as number | null,
    pgtEuploid: row.pgt_euploid as number | null,
    pgtMosaic: row.pgt_mosaic as number | null,
    pgtAneuploid: row.pgt_aneuploid as number | null,
    transferCount: row.transfer_count as number | null,
    transferOutcome: row.transfer_outcome as Outcome['transferOutcome'],
    reportedAt: row.reported_at as string,
    updatedAt: row.updated_at as string,
  };
}
