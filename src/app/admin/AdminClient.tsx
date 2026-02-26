'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PROTOCOL_TYPE_LABELS, DIAGNOSIS_LABELS } from '@/lib/constants/ranges';
import type { AdminStatsResponse, DailySubmission } from '@/types/admin';

/** Fill in zero-count days so the chart line is continuous */
function fillDailyGaps(data: DailySubmission[]): DailySubmission[] {
  if (data.length === 0) return [];

  const filled: DailySubmission[] = [];
  const map = new Map(data.map((d) => [d.date, d.count]));

  // Build a range from first data point to today
  const start = new Date(data[0].date);
  const end = new Date();

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    filled.push({ date: key, count: map.get(key) ?? 0 });
  }
  return filled;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminClient() {
  const [secret, setSecret] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('admin_secret');
    if (stored) {
      setSecret(stored);
      setIsAuthed(true);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (res.status === 401) {
        setIsAuthed(false);
        sessionStorage.removeItem('admin_secret');
        setError('Invalid password.');
        return;
      }
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load admin statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [secret]);

  // Fetch when authed
  useEffect(() => {
    if (!isAuthed) return;
    fetchStats();
  }, [isAuthed, fetchStats]);

  const handleLogin = () => {
    if (!secret.trim()) return;
    sessionStorage.setItem('admin_secret', secret);
    setIsAuthed(true);
  };

  // ---- Login screen ----
  if (!isAuthed) {
    return (
      <div className="max-w-sm mx-auto px-4 py-24">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button className="w-full" onClick={handleLogin}>
              Sign In
            </Button>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- Dashboard ----
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('admin_secret');
              setIsAuthed(false);
              setStats(null);
            }}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {isLoading && !stats && (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Loading statistics...</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-6">
          <CardContent className="py-8 text-center">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {stats && (
        <>
          {/* Overview cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Total Protocols" value={stats.overview.totalProtocols} />
            <StatCard
              label="New Submissions"
              value={stats.overview.totalNew}
              highlight
            />
            <StatCard label="Imported" value={stats.overview.totalImported} />
            <StatCard label="Outcomes" value={stats.overview.totalOutcomes} />
            <StatCard
              label="Research Chats"
              value={stats.overview.totalResearchChats}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              label="Outcome Rate"
              value={`${stats.overview.outcomeRate}%`}
            />
            <StatCard
              label="Imported (Original)"
              value={stats.overview.totalImported}
              subtitle="From community spreadsheet"
            />
          </div>

          {/* Daily submissions chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">
                New Submissions Over Time
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Last 90 days (community only)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.dailySubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No new community submissions yet.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart
                    data={fillDailyGaps(stats.dailySubmissions)}
                    margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      stroke="var(--muted-foreground)"
                      tickFormatter={formatDate}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="var(--muted-foreground)"
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label) => formatDate(String(label))}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="var(--chart-1)"
                      fill="var(--chart-1)"
                      fillOpacity={0.15}
                      name="Submissions"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b">
                      <th className="text-left py-2 pr-4">Date</th>
                      <th className="text-left px-2">Age</th>
                      <th className="text-left px-2">Protocol</th>
                      <th className="text-center px-2">Outcome</th>
                      <th className="text-center px-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentActivity.map((row, i) => (
                      <tr key={i} className="border-b border-border/30">
                        <td className="py-2 pr-4 text-muted-foreground">
                          {formatDateTime(row.submittedAt)}
                        </td>
                        <td className="px-2 font-medium">{row.age}</td>
                        <td className="px-2">
                          {row.protocolType
                            ? PROTOCOL_TYPE_LABELS[row.protocolType] || row.protocolType
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="text-center px-2">
                          {row.hasOutcome ? '✓' : '—'}
                        </td>
                        <td className="text-center px-2">
                          {row.isImported ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Imported
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">
                              New
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Popular fields — 3 charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <SmallBarChart
              title="Protocol Types"
              subtitle="New submissions"
              data={stats.popularProtocolTypes.map((d) => ({
                ...d,
                label: PROTOCOL_TYPE_LABELS[d.label] || d.label,
              }))}
            />
            <SmallBarChart
              title="Diagnoses"
              subtitle="New submissions"
              data={stats.popularDiagnoses.map((d) => ({
                ...d,
                label: DIAGNOSIS_LABELS[d.label] || d.label,
              }))}
            />
            <SmallBarChart
              title="Age Distribution"
              subtitle="New submissions"
              data={stats.ageDistribution}
            />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Stat card ---------- */

function StatCard({
  label,
  value,
  highlight,
  subtitle,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  subtitle?: string;
}) {
  return (
    <Card className={highlight ? 'border-primary/40' : undefined}>
      <CardContent className="pt-4 pb-3 text-center">
        <p className={`text-2xl font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Small bar chart ---------- */

function SmallBarChart({
  title,
  subtitle,
  data,
}: {
  title: string;
  subtitle: string;
  data: Array<{ label: string; count: number }>;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-8">
            No data yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {title}
          <span className="text-xs font-normal text-muted-foreground ml-2">
            {subtitle}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fontSize: 10 }}
              stroke="var(--muted-foreground)"
              width={90}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} name="Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
