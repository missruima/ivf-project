import { describe, expect, it } from 'vitest';
import { applyStatsPrivacy } from './stats-privacy';
import type { StatsResponse } from '../types/stats';

const base: StatsResponse = {
  groupBy: 'age_bracket', groups: [], funnel: { totalCycles: 0, avgRetrieved: null, avgMature: null, avgFertilized: null, avgDay3: null, avgBlastsDay5: null, avgBlastsDay6: null, avgBlastsDay7: null, avgBlastsTotal: null, avgEuploid: null, pctMature: null, pctFertilized: null, pctDay3: null, pctBlastDay5: null, pctBlastTotal: null, pctFertToBlast: null, pctMatureToBlast: null },
  totalRecords: 404, totalWithOutcomes: 0, filteredRecords: 4, insufficientData: false, lastUpdated: 'test',
};

describe('aggregate privacy threshold', () => {
  it('suppresses a sparse filtered cohort', () => {
    const result = applyStatsPrivacy(base, true);
    expect(result.filteredRecords).toBeNull();
    expect(result.funnel).toBeNull();
    expect(result.insufficientData).toBe(true);
  });

  it('does not suppress the unfiltered total', () => {
    const result = applyStatsPrivacy({ ...base, totalRecords: 404 }, false);
    expect(result.filteredRecords).toBe(0);
    expect(result.totalRecords).toBe(400);
  });
});
