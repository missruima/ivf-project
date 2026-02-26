import { getDb } from '@/lib/db';
import { MIN_GROUP_SIZE } from '@/lib/constants/disclaimers';
import type { AggregateGroup, FunnelStats, StatsResponse } from '@/types/stats';

type GroupByColumn = 'age' | 'age_bracket' | 'protocol_type' | 'amh_range';

const VALID_GROUP_BY: GroupByColumn[] = ['age', 'age_bracket', 'protocol_type', 'amh_range'];

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

function pct(numerator: number | null, denominator: number | null, cap?: number): number | null {
  if (numerator == null || denominator == null || denominator === 0) return null;
  const value = Math.round((numerator / denominator) * 1000) / 10; // one decimal
  return cap != null ? Math.min(value, cap) : value;
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
  const groupByExprMap: Record<GroupByColumn, string> = {
    age: 'CAST(p.age AS TEXT)',
    age_bracket: AGE_BRACKET_EXPR,
    protocol_type: 'p.protocol_type',
    amh_range: 'p.amh_range',
  };
  const groupByExpr = groupByExprMap[groupByCol];

  // Determine ORDER BY — numeric for age, custom for age_bracket, alpha for rest
  const orderByMap: Record<GroupByColumn, string> = {
    age: 'CAST(label AS INTEGER)',
    age_bracket: `CASE label
      WHEN 'Under 30' THEN 1 WHEN '30–34' THEN 2 WHEN '35–37' THEN 3
      WHEN '38–40' THEN 4 WHEN '41–42' THEN 5 WHEN '43+' THEN 6 ELSE 7 END`,
    protocol_type: 'label',
    amh_range: `CASE label
      WHEN '<0.5' THEN 1 WHEN '0.5-1.0' THEN 2 WHEN '1.0-1.5' THEN 3
      WHEN '1.5-2.0' THEN 4 WHEN '2.0-3.0' THEN 5 WHEN '3.0-4.0' THEN 6
      WHEN '4.0+' THEN 7 ELSE 8 END`,
  };
  const orderByExpr = orderByMap[groupByCol];

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
    ORDER BY ${orderByExpr}
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

  // ── Funnel stats (population-wide or filtered) ──
  const funnelRow = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_cycles,
      ROUND(AVG(o.eggs_retrieved), 1) as avg_retrieved,
      ROUND(AVG(o.eggs_mature), 1) as avg_mature,
      ROUND(AVG(o.eggs_fertilized), 1) as avg_fertilized,
      ROUND(AVG(o.day3_embryos), 1) as avg_day3,
      ROUND(AVG(o.blasts_day5), 1) as avg_day5,
      ROUND(AVG(o.blasts_day6), 1) as avg_day6,
      ROUND(AVG(o.blasts_day7), 1) as avg_day7,
      ROUND(AVG(COALESCE(o.blasts_day5, 0) + COALESCE(o.blasts_day6, 0) + COALESCE(o.blasts_day7, 0)), 1) as avg_blasts_total,
      ROUND(AVG(o.pgt_euploid), 1) as avg_euploid,
      -- Paired sums: only include a cycle when both values exist AND numerator <= denominator
      SUM(CASE WHEN o.eggs_mature IS NOT NULL AND o.eggs_retrieved IS NOT NULL AND o.eggs_mature <= o.eggs_retrieved THEN o.eggs_mature END) as sum_mature_valid,
      SUM(CASE WHEN o.eggs_mature IS NOT NULL AND o.eggs_retrieved IS NOT NULL AND o.eggs_mature <= o.eggs_retrieved THEN o.eggs_retrieved END) as sum_retrieved_valid,
      SUM(CASE WHEN o.eggs_fertilized IS NOT NULL AND o.eggs_mature IS NOT NULL AND o.eggs_fertilized <= o.eggs_mature THEN o.eggs_fertilized END) as sum_fert_valid,
      SUM(CASE WHEN o.eggs_fertilized IS NOT NULL AND o.eggs_mature IS NOT NULL AND o.eggs_fertilized <= o.eggs_mature THEN o.eggs_mature END) as sum_mature_for_fert_valid,
      SUM(CASE WHEN o.eggs_fertilized IS NOT NULL AND (COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0)) <= o.eggs_fertilized THEN COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0) END) as sum_blasts_for_fert_valid,
      SUM(CASE WHEN o.eggs_fertilized IS NOT NULL AND (COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0)) <= o.eggs_fertilized THEN o.eggs_fertilized END) as sum_fert_for_blast_valid,
      SUM(CASE WHEN o.eggs_mature IS NOT NULL AND (COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0)) <= o.eggs_mature THEN COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0) END) as sum_blasts_for_mature_valid,
      SUM(CASE WHEN o.eggs_mature IS NOT NULL AND (COALESCE(o.blasts_day5,0)+COALESCE(o.blasts_day6,0)+COALESCE(o.blasts_day7,0)) <= o.eggs_mature THEN o.eggs_mature END) as sum_mature_for_blast_valid
    FROM protocols p
    JOIN outcomes o ON o.protocol_id = p.id
    WHERE ${whereClause} AND o.eggs_retrieved IS NOT NULL
  `).get(...params) as Record<string, number | null>;

  const funnel: FunnelStats = {
    totalCycles: (funnelRow.total_cycles as number) || 0,
    avgRetrieved: funnelRow.avg_retrieved,
    avgMature: funnelRow.avg_mature,
    avgFertilized: funnelRow.avg_fertilized,
    avgDay3: funnelRow.avg_day3,
    avgBlastsDay5: funnelRow.avg_day5,
    avgBlastsDay6: funnelRow.avg_day6,
    avgBlastsDay7: funnelRow.avg_day7,
    avgBlastsTotal: funnelRow.avg_blasts_total,
    avgEuploid: funnelRow.avg_euploid,
    pctMature: pct(funnelRow.sum_mature_valid, funnelRow.sum_retrieved_valid),
    pctFertilized: pct(funnelRow.sum_fert_valid, funnelRow.sum_mature_for_fert_valid),
    pctDay3: null, // not enough clean data for day3 ratios
    pctBlastDay5: pct(funnelRow.sum_blasts_for_fert_valid, funnelRow.sum_fert_for_blast_valid),
    pctBlastTotal: pct(funnelRow.sum_blasts_for_fert_valid, funnelRow.sum_fert_for_blast_valid),
    pctFertToBlast: pct(funnelRow.sum_blasts_for_fert_valid, funnelRow.sum_fert_for_blast_valid),
    pctMatureToBlast: pct(funnelRow.sum_blasts_for_mature_valid, funnelRow.sum_mature_for_blast_valid),
  };

  return {
    groupBy: groupByCol,
    groups,
    funnel,
    totalRecords: totals.total,
    totalWithOutcomes: totals.with_outcomes,
    filteredRecords: filtered.total,
    lastUpdated: new Date().toISOString(),
  };
}
