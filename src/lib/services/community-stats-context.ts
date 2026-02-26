import { getAggregateStats } from '@/lib/services/stats';
import type { AggregateGroup, FunnelStats } from '@/types/stats';

/**
 * Build a concise community-data context string for the research chat system prompt.
 * Stays under ~400 tokens while providing the most useful breakdowns.
 */
export function getCommunityDataContext(): string {
  try {
    const byAge = getAggregateStats('age_bracket');
    const byProtocol = getAggregateStats('protocol_type');
    const byAmh = getAggregateStats('amh_range');

    const sections: string[] = [];

    sections.push(
      `Community Data Summary (${byAge.totalRecords} self-reported IVF cycles, ${byAge.totalWithOutcomes} with outcomes)`
    );

    sections.push(formatFunnel(byAge.funnel));

    if (byAge.groups.length > 0) {
      sections.push('BY AGE BRACKET:');
      sections.push(formatGroups(byAge.groups));
    }

    if (byProtocol.groups.length > 0) {
      sections.push('BY PROTOCOL TYPE:');
      sections.push(formatGroups(byProtocol.groups));
    }

    if (byAmh.groups.length > 0) {
      sections.push('BY AMH RANGE:');
      sections.push(formatGroups(byAmh.groups));
    }

    return sections.join('\n');
  } catch (error) {
    console.error('Failed to build community data context:', error);
    return '';
  }
}

function formatFunnel(f: FunnelStats): string {
  const parts = [
    `OVERALL AVERAGES (${f.totalCycles} cycles)`,
    `Eggs retrieved: ${f.avgRetrieved ?? '?'}`,
    `Mature: ${f.avgMature ?? '?'} (${f.pctMature ?? '?'}% of retrieved)`,
    `Fertilized: ${f.avgFertilized ?? '?'} (${f.pctFertilized ?? '?'}% of mature)`,
    `Blasts total: ${f.avgBlastsTotal ?? '?'} (${f.pctFertToBlast ?? '?'}% fert-to-blast)`,
    `Euploid (PGT): ${f.avgEuploid ?? '?'}`,
  ];
  return parts.join(', ');
}

function formatGroups(groups: AggregateGroup[]): string {
  return groups
    .map((g) => {
      const parts = [
        `${g.label} (n=${g.sampleSize})`,
        `eggs=${g.avgEggsRetrieved ?? '?'}`,
        `blasts=${g.avgBlastsTotal ?? '?'}`,
        `euploid=${g.avgPgtEuploid ?? '?'}`,
      ];
      const lb = g.outcomeCounts.liveBirth;
      const total =
        g.outcomeCounts.positiveBeta +
        g.outcomeCounts.negativeBeta +
        g.outcomeCounts.chemical +
        g.outcomeCounts.clinicalPregnancy +
        g.outcomeCounts.miscarriage +
        g.outcomeCounts.liveBirth +
        g.outcomeCounts.ongoing;
      if (total > 0) {
        parts.push(`live_birth=${lb}/${total}`);
      }
      return parts.join(', ');
    })
    .join('\n');
}
