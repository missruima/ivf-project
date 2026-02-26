'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Disclaimer } from '@/components/shared/Disclaimer';
import { DISCLAIMERS } from '@/lib/constants/disclaimers';
import {
  AGE_BRACKET_ORDER,
  AMH_RANGE_LABELS,
  PROTOCOL_TYPE_LABELS,
} from '@/lib/constants/ranges';
import type { StatsResponse, AggregateGroup, FunnelStats } from '@/types/stats';

const GROUP_OPTIONS = [
  { value: 'age', label: 'Age (by year)' },
  { value: 'age_bracket', label: 'Age (groups)' },
  { value: 'protocol_type', label: 'Protocol Type' },
  { value: 'amh_range', label: 'AMH Range' },
];

const GROUP_X_LABELS: Record<string, string> = {
  age: 'Age (years)',
  age_bracket: 'Age Group',
  protocol_type: 'Protocol Type',
  amh_range: 'AMH (ng/mL)',
};

// Filter options — "all" means no filter
const AGE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Ages' },
  ...AGE_BRACKET_ORDER.map((b) => ({ value: b, label: b })),
];

const AMH_FILTER_OPTIONS = [
  { value: 'all', label: 'All AMH' },
  ...Object.entries(AMH_RANGE_LABELS)
    .filter(([k]) => k !== 'unknown')
    .map(([k, v]) => ({ value: k, label: v })),
];

const PROTOCOL_FILTER_OPTIONS = [
  { value: 'all', label: 'All Protocols' },
  ...Object.entries(PROTOCOL_TYPE_LABELS)
    .filter(([k]) => k !== 'other')
    .map(([k, v]) => ({ value: k, label: v })),
  { value: 'other', label: 'Other' },
];

interface Filters {
  ageBracket: string;
  amhRange: string;
  protocolType: string;
}

const DEFAULT_FILTERS: Filters = {
  ageBracket: 'all',
  amhRange: 'all',
  protocolType: 'all',
};

export default function DashboardClient() {
  const [groupBy, setGroupBy] = useState('age');
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasActiveFilters =
    filters.ageBracket !== 'all' ||
    filters.amhRange !== 'all' ||
    filters.protocolType !== 'all';

  const activeFilterCount = [
    filters.ageBracket !== 'all',
    filters.amhRange !== 'all',
    filters.protocolType !== 'all',
  ].filter(Boolean).length;

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  useEffect(() => {
    async function fetchStats() {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ groupBy });
        if (filters.ageBracket !== 'all') params.set('ageBracket', filters.ageBracket);
        if (filters.amhRange !== 'all') params.set('amhRange', filters.amhRange);
        if (filters.protocolType !== 'all') params.set('protocolType', filters.protocolType);

        const res = await fetch(`/api/stats?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setStats(data);
      } catch {
        setError('Failed to load statistics. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [groupBy, filters]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-semibold">Community Data</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Anonymized, aggregate outcomes reported by the community
        </p>
      </div>

      <Disclaimer text={DISCLAIMERS.dashboard} variant="warning" className="mb-6" />

      {/* Filter bar — "People like me" */}
      <Card className="mb-6">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-foreground">Filter cohort</span>
            {hasActiveFilters && (
              <>
                <Badge variant="secondary" className="text-[10px]">
                  {activeFilterCount} active
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
                  onClick={resetFilters}
                >
                  Reset
                </Button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Age"
              value={filters.ageBracket}
              options={AGE_FILTER_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, ageBracket: v }))}
            />
            <FilterSelect
              label="AMH"
              value={filters.amhRange}
              options={AMH_FILTER_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, amhRange: v }))}
            />
            <FilterSelect
              label="Protocol"
              value={filters.protocolType}
              options={PROTOCOL_FILTER_OPTIONS}
              onChange={(v) => setFilters((f) => ({ ...f, protocolType: v }))}
            />
          </div>
          {/* Cohort indicator */}
          {stats && hasActiveFilters && (
            <p className="text-xs text-muted-foreground mt-3">
              {stats.filteredRecords === 0 ? (
                'No protocols match these filters yet.'
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{stats.filteredRecords}</span>
                  {' '}of {stats.totalRecords} protocols
                  {stats.filteredRecords > 0 && stats.groups.length === 0 && (
                    <span className="text-amber-600 dark:text-amber-400">
                      {' '}&mdash; not enough in any single group to display (minimum 5 per group for privacy)
                    </span>
                  )}
                </>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Group by selector */}
      <div className="flex gap-2 mb-6 justify-center">
        {GROUP_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={groupBy === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGroupBy(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Summary cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Protocols Shared"
            value={stats.totalRecords}
          />
          <StatCard
            label={hasActiveFilters ? 'Matching Filters' : 'With Outcomes'}
            value={hasActiveFilters ? stats.filteredRecords : stats.totalWithOutcomes}
          />
          <StatCard
            label="Groups Shown"
            value={stats.groups.length}
          />
          <StatCard
            label="Min Group Size"
            value="5"
          />
        </div>
      )}

      {isLoading && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Population funnel */}
      {stats && !isLoading && stats.funnel.totalCycles > 0 && (
        <FunnelCard funnel={stats.funnel} filtered={hasActiveFilters} />
      )}

      {stats && !isLoading && stats.groups.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-3xl mb-3">{hasActiveFilters ? '🔍' : '🌸'}</p>
            <p className="text-sm font-medium text-foreground mb-1">
              {hasActiveFilters ? 'No groups large enough to display' : 'Not enough data yet'}
            </p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try broadening your filters. Groups need at least 5 protocols to be shown for privacy.'
                : DISCLAIMERS.notEnoughData}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={resetFilters}
              >
                Reset filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {stats && !isLoading && stats.groups.length > 0 && (
        <div className="space-y-6">
          {/* Eggs Retrieved Chart */}
          <ChartCard
            title="Average Eggs Retrieved"
            xLabel={GROUP_X_LABELS[groupBy] || groupBy}
            data={stats.groups.filter((g) => g.avgEggsRetrieved != null)}
            dataKey="avgEggsRetrieved"
            fill="var(--chart-1)"
          />

          {/* Blastocysts Chart */}
          <ChartCard
            title="Average Total Blastocysts"
            xLabel={GROUP_X_LABELS[groupBy] || groupBy}
            data={stats.groups.filter((g) => g.avgBlastsTotal != null)}
            dataKey="avgBlastsTotal"
            fill="var(--chart-2)"
          />

          {/* Euploid Chart */}
          <ChartCard
            title="Average PGT-Normal Embryos"
            xLabel={GROUP_X_LABELS[groupBy] || groupBy}
            data={stats.groups.filter((g) => g.avgPgtEuploid != null)}
            dataKey="avgPgtEuploid"
            fill="var(--chart-3)"
          />

          {/* Outcomes breakdown */}
          {stats.groups.some(
            (g) =>
              g.outcomeCounts.positiveBeta +
                g.outcomeCounts.negativeBeta +
                g.outcomeCounts.liveBirth >
              0
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  Transfer Outcomes
                  <span className="text-xs font-normal text-muted-foreground">
                    Community-reported
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b">
                        <th className="text-left py-2 pr-4">Group</th>
                        <th className="text-right px-2">n</th>
                        <th className="text-right px-2">+Beta</th>
                        <th className="text-right px-2">-Beta</th>
                        <th className="text-right px-2">Clinical</th>
                        <th className="text-right px-2">Live Birth</th>
                        <th className="text-right px-2">Ongoing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.groups.map((g) => (
                        <tr key={g.label} className="border-b border-border/30">
                          <td className="py-2 pr-4 font-medium">{g.label}</td>
                          <td className="text-right px-2 text-muted-foreground">{g.sampleSize}</td>
                          <td className="text-right px-2">{g.outcomeCounts.positiveBeta || '-'}</td>
                          <td className="text-right px-2">{g.outcomeCounts.negativeBeta || '-'}</td>
                          <td className="text-right px-2">{g.outcomeCounts.clinicalPregnancy || '-'}</td>
                          <td className="text-right px-2">{g.outcomeCounts.liveBirth || '-'}</td>
                          <td className="text-right px-2">{g.outcomeCounts.ongoing || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  All numbers are community-reported and may not be representative.
                  Groups with fewer than 5 protocols are hidden.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Filter select ---------- */

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="min-w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/* ---------- Stat card ---------- */

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 text-center">
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

/* ---------- Funnel card ---------- */

const FUNNEL_STEPS: {
  key: keyof FunnelStats;
  pctKey: keyof FunnelStats;
  label: string;
  desc: string;
}[] = [
  { key: 'avgRetrieved', pctKey: 'avgRetrieved', label: 'Retrieved', desc: 'Avg eggs retrieved' },
  { key: 'avgMature', pctKey: 'pctMature', label: 'Mature', desc: '% of retrieved' },
  { key: 'avgFertilized', pctKey: 'pctFertilized', label: 'Fertilized', desc: '% of mature' },
  { key: 'avgDay3', pctKey: 'pctDay3', label: 'Day 3', desc: '% of fertilized' },
  { key: 'avgBlastsDay5', pctKey: 'pctBlastDay5', label: 'Day 5 Blasts', desc: '% of fertilized' },
  { key: 'avgBlastsTotal', pctKey: 'pctBlastTotal', label: 'Total Blasts', desc: '% of fertilized' },
];

const CONVERSION_RATES: {
  key: keyof FunnelStats;
  label: string;
}[] = [
  { key: 'pctMature', label: 'Mature / Retrieved' },
  { key: 'pctFertilized', label: 'Fertilized / Mature' },
  { key: 'pctFertToBlast', label: 'Blast / Fertilized' },
  { key: 'pctMatureToBlast', label: 'Blast / Mature' },
];

function FunnelCard({ funnel, filtered }: { funnel: FunnelStats; filtered: boolean }) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {filtered ? 'Cohort Averages' : 'Population Averages'}
          <span className="text-xs font-normal text-muted-foreground">
            {funnel.totalCycles} cycles with outcome data
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Average counts row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-5">
          {FUNNEL_STEPS.map((step) => {
            const avg = funnel[step.key] as number | null;
            if (avg == null) return null;
            return (
              <div key={step.key} className="text-center">
                <p className="text-lg font-semibold text-foreground">{avg}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
              </div>
            );
          })}
        </div>

        {/* Conversion rates */}
        <div className="border-t pt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
            Conversion Rates
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {CONVERSION_RATES.map((rate) => {
              const val = funnel[rate.key] as number | null;
              if (val == null) return null;
              return (
                <div key={rate.key} className="text-center">
                  <p className="text-lg font-semibold text-foreground">{val}%</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{rate.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-4">
          Percentages are computed from aggregate sums across all {filtered ? 'matching' : ''} cycles, not averages of averages.
        </p>
      </CardContent>
    </Card>
  );
}

/* ---------- Chart card ---------- */

function ChartCard({
  title,
  xLabel,
  data,
  dataKey,
  fill,
}: {
  title: string;
  xLabel: string;
  data: AggregateGroup[];
  dataKey: string;
  fill: string;
}) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          {title}
          <span className="text-xs font-normal text-muted-foreground">
            Community-reported
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              stroke="var(--muted-foreground)"
            >
              <Label value={xLabel} position="insideBottom" offset={-18} style={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
            </XAxis>
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="var(--muted-foreground)"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey={dataKey}
              fill={fill}
              radius={[4, 4, 0, 0]}
              name={title}
            />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Based on community-reported data. Sample sizes shown in tooltips.
        </p>
      </CardContent>
    </Card>
  );
}
