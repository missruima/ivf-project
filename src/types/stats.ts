export interface AggregateGroup {
  label: string;
  sampleSize: number;
  avgEggsRetrieved: number | null;
  avgEggsMature: number | null;
  avgEggsFertilized: number | null;
  avgBlastsDay5: number | null;
  avgBlastsTotal: number | null;
  avgPgtEuploid: number | null;
  medianEggsRetrieved: number | null;
  outcomeCounts: {
    positiveBeta: number;
    negativeBeta: number;
    chemical: number;
    clinicalPregnancy: number;
    miscarriage: number;
    liveBirth: number;
    ongoing: number;
    notYet: number;
  };
}

export interface FunnelStats {
  totalCycles: number;
  avgRetrieved: number | null;
  avgMature: number | null;
  avgFertilized: number | null;
  avgDay3: number | null;
  avgBlastsDay5: number | null;
  avgBlastsDay6: number | null;
  avgBlastsDay7: number | null;
  avgBlastsTotal: number | null;
  avgEuploid: number | null;
  pctMature: number | null;       // mature / retrieved
  pctFertilized: number | null;   // fertilized / mature
  pctDay3: number | null;         // day3 / fertilized
  pctBlastDay5: number | null;    // day5 / fertilized
  pctBlastTotal: number | null;   // total blasts / fertilized
  pctFertToBlast: number | null;  // total blasts / fertilized (same as above, for clarity)
  pctMatureToBlast: number | null; // total blasts / mature
}

export interface StatsResponse {
  groupBy: 'age' | 'age_bracket' | 'protocol_type' | 'amh_range';
  groups: AggregateGroup[];
  funnel: FunnelStats;
  totalRecords: number;
  totalWithOutcomes: number;
  filteredRecords: number;
  lastUpdated: string;
}
