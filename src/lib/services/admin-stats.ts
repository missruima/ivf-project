import { getDb } from '@/lib/db';
import type {
  AdminOverview,
  DailySubmission,
  RecentActivity,
  PopularField,
  AdminStatsResponse,
} from '@/types/admin';

export function getAdminStats(): AdminStatsResponse {
  const db = getDb();

  // 1. Overview counts
  const overview = db.prepare(`
    SELECT
      COUNT(*) as total_protocols,
      COALESCE(SUM(CASE WHEN passphrase_prefix != 'IMPORTED' THEN 1 ELSE 0 END), 0) as total_new,
      COALESCE(SUM(CASE WHEN passphrase_prefix = 'IMPORTED' THEN 1 ELSE 0 END), 0) as total_imported
    FROM protocols
    WHERE is_active = 1
  `).get() as { total_protocols: number; total_new: number; total_imported: number };

  const outcomeCount = db.prepare(
    `SELECT COUNT(*) as count FROM outcomes o JOIN protocols p ON p.id = o.protocol_id WHERE p.is_active = 1`
  ).get() as { count: number };

  // Count research chat queries (response_cache with source='live')
  let researchChats = 0;
  try {
    const row = db.prepare(
      `SELECT COUNT(*) as count FROM response_cache WHERE source = 'live'`
    ).get() as { count: number } | undefined;
    researchChats = row?.count ?? 0;
  } catch {
    // response_cache or source column may not exist yet
    researchChats = 0;
  }

  const adminOverview: AdminOverview = {
    totalProtocols: overview.total_protocols,
    totalNew: overview.total_new,
    totalImported: overview.total_imported,
    totalOutcomes: outcomeCount.count,
    totalResearchChats: researchChats,
    outcomeRate:
      overview.total_protocols > 0
        ? Math.round((outcomeCount.count / overview.total_protocols) * 1000) / 10
        : 0,
  };

  // 2. Daily submissions — new community submissions, last 90 days
  const dailyRows = db.prepare(`
    SELECT
      date(submitted_at) as date,
      COUNT(*) as count
    FROM protocols
    WHERE is_active = 1
      AND passphrase_prefix != 'IMPORTED'
      AND submitted_at >= datetime('now', '-90 days')
    GROUP BY date(submitted_at)
    ORDER BY date(submitted_at) ASC
  `).all() as Array<{ date: string; count: number }>;

  const dailySubmissions: DailySubmission[] = dailyRows.map((row) => ({
    date: row.date,
    count: row.count,
  }));

  // 3. Recent activity — last 20 submissions (no PII)
  const recentRows = db.prepare(`
    SELECT
      p.submitted_at,
      p.age,
      p.protocol_type,
      CASE WHEN o.id IS NOT NULL THEN 1 ELSE 0 END as has_outcome,
      CASE WHEN p.passphrase_prefix = 'IMPORTED' THEN 1 ELSE 0 END as is_imported
    FROM protocols p
    LEFT JOIN outcomes o ON o.protocol_id = p.id
    WHERE p.is_active = 1
    ORDER BY p.submitted_at DESC
    LIMIT 20
  `).all() as Array<{
    submitted_at: string;
    age: number;
    protocol_type: string | null;
    has_outcome: number;
    is_imported: number;
  }>;

  const recentActivity: RecentActivity[] = recentRows.map((row) => ({
    submittedAt: row.submitted_at,
    age: row.age,
    protocolType: row.protocol_type,
    hasOutcome: row.has_outcome === 1,
    isImported: row.is_imported === 1,
  }));

  // 4. Popular protocol types — new submissions only
  const protocolTypes = db.prepare(`
    SELECT
      protocol_type as label,
      COUNT(*) as count
    FROM protocols
    WHERE is_active = 1
      AND passphrase_prefix != 'IMPORTED'
      AND protocol_type IS NOT NULL
    GROUP BY protocol_type
    ORDER BY count DESC
  `).all() as PopularField[];

  // 5. Popular diagnoses — new submissions only
  const diagnoses = db.prepare(`
    SELECT
      d.diagnosis as label,
      COUNT(*) as count
    FROM diagnoses d
    JOIN protocols p ON p.id = d.protocol_id
    WHERE p.is_active = 1
      AND p.passphrase_prefix != 'IMPORTED'
    GROUP BY d.diagnosis
    ORDER BY count DESC
  `).all() as PopularField[];

  // 6. Age distribution — new submissions only
  const ageDistribution = db.prepare(`
    SELECT
      CASE
        WHEN age < 30 THEN 'Under 30'
        WHEN age < 35 THEN '30-34'
        WHEN age < 38 THEN '35-37'
        WHEN age < 41 THEN '38-40'
        WHEN age < 43 THEN '41-42'
        ELSE '43+'
      END as label,
      COUNT(*) as count
    FROM protocols
    WHERE is_active = 1
      AND passphrase_prefix != 'IMPORTED'
    GROUP BY label
    ORDER BY MIN(age) ASC
  `).all() as PopularField[];

  return {
    overview: adminOverview,
    dailySubmissions,
    recentActivity,
    popularProtocolTypes: protocolTypes,
    popularDiagnoses: diagnoses,
    ageDistribution,
  };
}
