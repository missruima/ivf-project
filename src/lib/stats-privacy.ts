import { MIN_GROUP_SIZE } from './constants/disclaimers';
import type { StatsResponse } from '../types/stats';

export function applyStatsPrivacy(stats: StatsResponse, hasFilters: boolean): StatsResponse {
  const rounded = (value: number): number => Math.floor(value / MIN_GROUP_SIZE) * MIN_GROUP_SIZE;
  const publicStats: StatsResponse = {
    ...stats,
    groups: stats.groups.map((group) => ({ ...group, sampleSize: rounded(group.sampleSize) })),
    totalRecords: rounded(stats.totalRecords),
    totalWithOutcomes: rounded(stats.totalWithOutcomes),
    filteredRecords: stats.filteredRecords == null ? null : rounded(stats.filteredRecords),
    funnel: stats.funnel ? { ...stats.funnel, totalCycles: rounded(stats.funnel.totalCycles) } : null,
  };
  if (!hasFilters || stats.filteredRecords == null || stats.filteredRecords >= MIN_GROUP_SIZE) return publicStats;
  return {
    ...publicStats,
    groups: [],
    funnel: null,
    filteredRecords: null,
    insufficientData: true,
  };
}
