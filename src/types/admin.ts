export interface AdminOverview {
  totalProtocols: number;
  totalNew: number;
  totalImported: number;
  totalOutcomes: number;
  totalResearchChats: number;
  outcomeRate: number;
}

export interface DailySubmission {
  date: string;
  count: number;
}

export interface RecentActivity {
  submittedAt: string;
  age: number;
  protocolType: string | null;
  hasOutcome: boolean;
  isImported: boolean;
}

export interface PopularField {
  label: string;
  count: number;
}

export interface AdminStatsResponse {
  overview: AdminOverview;
  dailySubmissions: DailySubmission[];
  recentActivity: RecentActivity[];
  popularProtocolTypes: PopularField[];
  popularDiagnoses: PopularField[];
  ageDistribution: PopularField[];
}
