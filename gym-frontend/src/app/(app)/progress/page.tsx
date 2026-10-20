'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Workout } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, Flame, Dumbbell, Wind, Trophy, Calendar, BarChart2, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function todayStr() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}
function subDays(date: string, n: number) {
  const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - n);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/60 bg-card/95 backdrop-blur px-3 py-2 shadow-xl text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">{p.value.toLocaleString()} pts</p>
      ))}
    </div>
  );
}

const COLORS: Record<string, string> = { strength: '#f97316', bodyweight: '#8b5cf6', cardio: '#06b6d4' };
const ICONS: Record<string, React.ElementType> = { strength: Dumbbell, bodyweight: Flame, cardio: Wind };

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-2xl font-extrabold text-foreground tracking-tight">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Skel() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0,1,2,3].map(i => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-5 flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <div className="space-y-2 flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-16" /></div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { data, isLoading, isError } = useQuery<{ workouts: Workout[] }>({
    queryKey: ['workouts-all'],
    queryFn: () => apiRequest<{ workouts: Workout[] }>('/api/workouts'),
    staleTime: 60_000,
  });
  const { data: streakData } = useQuery<{ streak: number }>({
    queryKey: ['streak'],
    queryFn: () => apiRequest<{ streak: number }>('/api/workouts/streak'),
    staleTime: 60_000,
  });

  const calc = useMemo(() => {
    if (!data?.workouts) return null;
    const ws = data.workouts;
    const today = todayStr();
    const start = subDays(today, 29);
    const l30 = ws.filter(w => w.logged_on >= start);
    const byDay: Record<string, number> = {};
    l30.forEach(w => { byDay[w.logged_on] = (byDay[w.logged_on] ?? 0) + Number(w.points); });
    const dayPts = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(today, 29 - i);
      return { date: fmtShort(d), points: Math.round(byDay[d] ?? 0) };
    });
    const byType: Record<string, { count: number; points: number }> = {};
    ws.forEach(w => {
      if (!byType[w.type]) byType[w.type] = { count: 0, points: 0 };
      byType[w.type].count++; byType[w.type].points += Number(w.points);
    });
    const typeDist = Object.entries(byType).map(([type, v]) => ({
      name: type[0].toUpperCase() + type.slice(1), type, value: v.count, points: Math.round(v.points),
    }));
    const totalW = ws.length;
    const totalP = ws.reduce((a, w) => a + Number(w.points), 0);
    const l30P = l30.reduce((a, w) => a + Number(w.points), 0);
    const bests: Record<string, Workout | null> = { strength: null, bodyweight: null, cardio: null };
    ws.forEach(w => { const p = bests[w.type]; if (!p || Number(w.points) > Number(p.points)) bests[w.type] = w; });
    return { dayPts, typeDist, totalW, totalP, l30P, bests, recent: ws.slice(0, 10) };
  }, [data]);

  const header = (
    <div className="flex items-center gap-4">
      <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
        <TrendingUp className="h-6 w-6" />
      </div>
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Analytics &amp; Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">30-day point trends, workout breakdown, and personal bests.</p>
      </div>
    </div>
  );

  if (isLoading) return <div className="space-y-8">{header}<Skel /></div>;
  if (isError || !calc) return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">Failed to load analytics. Please try again.</p>
    </div>
  );

  const { dayPts, typeDist, totalW, totalP, l30P, bests, recent } = calc;

  return (
    <div className="space-y-8">
      {header}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Workouts" value={totalW.toLocaleString()} sub="all time" color="#f97316" />
        <StatCard icon={Trophy} label="Lifetime Points" value={Math.round(totalP).toLocaleString()} sub="all time" color="#8b5cf6" />
        <StatCard icon={BarChart2} label="Last 30 Days" value={Math.round(l30P).toLocaleString()} sub="points earned" color="#06b6d4" />
        <StatCard icon={Flame} label="Streak" value={`${streakData?.streak ?? 0}d`} sub="consecutive days" color="#ef4444" />
      </div>

      {/* Area chart */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" /> Daily Points — Last 30 Days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dayPts} margin={{ top: 10, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="points" stroke="#f97316" strokeWidth={2.5} fill="url(#ptGrad)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Donut + bests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Workout Type Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeDist.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No workouts yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={typeDist} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                    {typeDist.map(e => <Cell key={e.type} fill={COLORS[e.type] ?? '#6b7280'} stroke="transparent" />)}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [`${v} workouts`, n]}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '0.75rem', fontSize: '0.8125rem' }} />
                  <Legend iconType="circle" iconSize={10}
                    formatter={v => <span style={{ color: 'hsl(var(--foreground))', fontSize: '0.8125rem' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="space-y-2 mt-3">
              {typeDist.map(t => {
                const Icon = ICONS[t.type] ?? Activity;
                const total = typeDist.reduce((a, x) => a + x.value, 0);
                const pct = total > 0 ? Math.round((t.value / total) * 100) : 0;
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0" style={{ color: COLORS[t.type] }} />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-foreground">{t.name}</span>
                        <span className="text-muted-foreground">{t.value} workouts &middot; {t.points.toLocaleString()} pts</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[t.type] }} />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" /> Personal Bests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['strength', 'bodyweight', 'cardio'] as const).map(type => {
              const best = bests[type];
              const Icon = ICONS[type];
              return (
                <div key={type} className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/20">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${COLORS[type]}18`, border: `1px solid ${COLORS[type]}30` }}>
                    <Icon className="h-5 w-5" style={{ color: COLORS[type] }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground capitalize mb-0.5">{type}</p>
                    {best ? (
                      <>
                        <p className="text-sm font-bold text-foreground truncate">{best.exercise}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                          {best.sets && best.reps && <span>{best.sets}&times;{best.reps}</span>}
                          {best.weight_kg != null && <span>{best.weight_kg}kg</span>}
                          {best.duration_min != null && <span>{best.duration_min}min</span>}
                          {best.distance_km != null && Number(best.distance_km) > 0 && <span>{best.distance_km}km</span>}
                          <span className="text-primary font-semibold">{Number(best.points).toFixed(1)} pts</span>
                        </div>
                      </>
                    ) : <p className="text-sm text-muted-foreground/60 italic">No {type} workouts yet</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent table */}
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" /> Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No workouts yet. Start logging!</div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {['Date', 'Exercise', 'Type', 'Details', 'Points'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map(w => {
                    const Icon = ICONS[w.type] ?? Activity;
                    const parts: string[] = [];
                    if (w.sets && w.reps) parts.push(`${w.sets}\u00d7${w.reps}`);
                    if (w.weight_kg != null) parts.push(`${w.weight_kg}kg`);
                    if (w.duration_min != null) parts.push(`${w.duration_min}min`);
                    if (w.distance_km != null && Number(w.distance_km) > 0) parts.push(`${w.distance_km}km`);
                    return (
                      <tr key={w.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{fmtShort(w.logged_on)}</td>
                        <td className="px-3 py-3 font-medium text-foreground max-w-[160px] truncate">{w.exercise}</td>
                        <td className="px-3 py-3">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: `${COLORS[w.type]}18`, color: COLORS[w.type] }}>
                            <Icon className="h-3 w-3" /> {w.type}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{parts.join(' \u00b7 ') || '\u2014'}</td>
                        <td className="px-3 py-3 font-bold text-primary whitespace-nowrap">{Number(w.points).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
