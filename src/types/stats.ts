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

export interface StatsResponse {
  groupBy: 'age_bracket' | 'protocol_type' | 'amh_range';
  groups: AggregateGroup[];
  totalRecords: number;
  totalWithOutcomes: number;
  filteredRecords: number;
  lastUpdated: string;
}
