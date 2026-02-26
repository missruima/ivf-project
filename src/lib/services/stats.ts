import { getDb } from '@/lib/db';
import { MIN_GROUP_SIZE } from '@/lib/constants/disclaimers';
import type { AggregateGroup, StatsResponse } from '@/types/stats';

type GroupByColumn = 'age_bracket' | 'protocol_type' | 'amh_range';

const VALID_GROUP_BY: GroupByColumn[] = ['age_bracket', 'protocol_type', 'amh_range'];

/**
 * SQL expression that buckets exact ages into display brackets.
 */
const AGE_BRACKET_EXPR = `
  CASE
    WHEN p.age < 30 THEN 'Under 30'
    WHEN p.age < 35 THEN '30–34'
    WHEN p.age < 38 THEN '35–37'
    WHEN p.age < 41 THEN '38–40'
    WHEN p.age < 43 THEN '41–42'
    ELSE '43+'
  END
`;

interface FilterParams {
  ageBracket?: string;
  protocolType?: string;
  amhRange?: string;
}

export function getAggregateStats(
  groupBy: string,
  filters: FilterParams = {}
): StatsResponse {
  const db = getDb();

  if (!VALID_GROUP_BY.includes(groupBy as GroupByColumn)) {
    throw new Error('Invalid groupBy parameter');
  }

  const groupByCol = groupBy as GroupByColumn;

  // Determine the actual SQL expression for the group-by
  const groupByExpr = groupByCol === 'age_bracket'
    ? AGE_BRACKET_EXPR
    : `p.${groupByCol === 'protocol_type' ? 'protocol_type' : 'amh_range'}`;

  // Build WHERE clause
  const conditions: string[] = ['p.is_active = 1'];
  const params: unknown[] = [];

  if (filters.ageBracket) {
    conditions.push(`(${AGE_BRACKET_EXPR}) = ?`);
    params.push(filters.ageBracket);
  }
  if (filters.protocolType) {
    conditions.push('p.protocol_type = ?');
    params.push(filters.protocolType);
  }
  if (filters.amhRange) {
    conditions.push('p.amh_range = ?');
    params.push(filters.amhRange);
  }

  const whereClause = conditions.join(' AND ');

  // Aggregate query
  const rows = db.prepare(`
    SELECT
      (${groupByExpr}) as label,
      COUNT(DISTINCT p.id) as sample_size,
      ROUND(AVG(o.eggs_retrieved), 1) as avg_eggs_retrieved,
      ROUND(AVG(o.eggs_mature), 1) as avg_eggs_mature,
      ROUND(AVG(o.eggs_fertilized), 1) as avg_eggs_fertilized,
      ROUND(AVG(o.blasts_day5), 1) as avg_blasts_day5,
      ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as avg_blasts_total,
      ROUND(AVG(o.pgt_euploid), 1) as avg_pgt_euploid,
      SUM(CASE WHEN o.transfer_outcome = 'positive_beta' THEN 1 ELSE 0 END) as positive_beta,
      SUM(CASE WHEN o.transfer_outcome = 'negative_beta' THEN 1 ELSE 0 END) as negative_beta,
      SUM(CASE WHEN o.transfer_outcome = 'chemical' THEN 1 ELSE 0 END) as chemical,
      SUM(CASE WHEN o.transfer_outcome = 'clinical_pregnancy' THEN 1 ELSE 0 END) as clinical_pregnancy,
      SUM(CASE WHEN o.transfer_outcome = 'miscarriage' THEN 1 ELSE 0 END) as miscarriage,
      SUM(CASE WHEN o.transfer_outcome = 'live_birth' THEN 1 ELSE 0 END) as live_birth,
      SUM(CASE WHEN o.transfer_outcome = 'ongoing' THEN 1 ELSE 0 END) as ongoing,
      SUM(CASE WHEN o.transfer_outcome = 'not_yet' THEN 1 ELSE 0 END) as not_yet
    FROM protocols p
    LEFT JOIN outcomes o ON o.protocol_id = p.id
    WHERE ${whereClause}
    GROUP BY label
    HAVING COUNT(DISTINCT p.id) >= ?
    ORDER BY label
  `).all(...params, MIN_GROUP_SIZE) as Array<Record<string, unknown>>;

  const groups: AggregateGroup[] = rows.map((row) => ({
    label: row.label as string,
    sampleSize: row.sample_size as number,
    avgEggsRetrieved: row.avg_eggs_retrieved as number | null,
    avgEggsMature: row.avg_eggs_mature as number | null,
    avgEggsFertilized: row.avg_eggs_fertilized as number | null,
    avgBlastsDay5: row.avg_blasts_day5 as number | null,
    avgBlastsTotal: row.avg_blasts_total as number | null,
    avgPgtEuploid: row.avg_pgt_euploid as number | null,
    medianEggsRetrieved: null,
    outcomeCounts: {
      positiveBeta: row.positive_beta as number,
      negativeBeta: row.negative_beta as number,
      chemical: row.chemical as number,
      clinicalPregnancy: row.clinical_pregnancy as number,
      miscarriage: row.miscarriage as number,
      liveBirth: row.live_birth as number,
      ongoing: row.ongoing as number,
      notYet: row.not_yet as number,
    },
  }));

  // Total counts (unfiltered)
  const totals = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total,
      COUNT(DISTINCT o.id) as with_outcomes
    FROM protocols p
    LEFT JOIN outcomes o ON o.protocol_id = p.id
    WHERE p.is_active = 1
  `).get() as { total: number; with_outcomes: number };

  // Filtered count (how many protocols match current filters, ignoring k-anonymity)
  const filtered = db.prepare(`
    SELECT COUNT(DISTINCT p.id) as total
    FROM protocols p
    WHERE ${whereClause}
  `).get(...params) as { total: number };

  return {
    groupBy: groupByCol,
    groups,
    totalRecords: totals.total,
    totalWithOutcomes: totals.with_outcomes,
    filteredRecords: filtered.total,
    lastUpdated: new Date().toISOString(),
  };
}
