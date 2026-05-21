import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { getDailyProgress } from "@/services/analytics";
import { getGoal } from "@/services/goals";
import type { DailyProgressPoint } from "@/types/health";
import { StatCard } from "@/components/shared/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const CHART_COLORS = {
  caloriesConsumed: "#22c55e", // green-500
  caloriesBurned: "#f59e0b", // amber-500
  netCalories: "#a855f7", // purple-500
  goal: "#94a3b8", // slate-400
  protein: "#3b82f6", // blue-500
  carbs: "#f97316", // orange-500
  fat: "#ec4899", // pink-500
  workoutMinutes: "#06b6d4", // cyan-500
  barsMeals: "#14b8a6", // teal-500
  barsWorkouts: "#8b5cf6", // violet-500
};

function toDateInput(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function formatKcal(v: unknown): string {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

export default function Progress() {
  const [dateFrom, setDateFrom] = useState(() => toDateInput(subDays(new Date(), 6)));
  const [dateTo, setDateTo] = useState(() => toDateInput(new Date()));

  const analyticsQuery = useQuery({
    queryKey: ["analytics", "daily", dateFrom, dateTo],
    queryFn: () => getDailyProgress({ dateFrom, dateTo }),
  });

  const goalQuery = useQuery({
    queryKey: ["goal"],
    queryFn: getGoal,
  });

  const chartData = useMemo(() => {
    const points = analyticsQuery.data?.points ?? [];
    const goal = goalQuery.data;
    return points.map((p) => ({
      label: p.date.slice(5), // MM-DD for compact x-axis
      date: p.date,
      caloriesConsumed: p.caloriesConsumed,
      caloriesBurned: p.caloriesBurned,
      netCalories: p.netCalories,
      goalCalories: goal?.dailyCalories ?? null,
      protein: p.macros.protein,
      carbs: p.macros.carbs,
      fat: p.macros.fat,
      goalProtein: goal?.protein ?? null,
      goalCarbs: goal?.carbs ?? null,
      goalFat: goal?.fat ?? null,
      workoutMinutes: p.workoutMinutes,
      workoutCount: p.workoutCount,
      mealCount: p.mealCount,
    }));
  }, [analyticsQuery.data, goalQuery.data]);

  const summary = analyticsQuery.data?.summary;

  const goalAdherence = useMemo(() => {
    const goal = goalQuery.data;
    if (!goal || !goal.dailyCalories || goal.dailyCalories <= 0) return null;
    const points: DailyProgressPoint[] = analyticsQuery.data?.points ?? [];
    if (points.length === 0) return { within: 0, total: 0, percent: 0 };
    const within = points.filter((p) => p.caloriesConsumed <= goal.dailyCalories).length;
    const total = points.length;
    return { within, total, percent: Math.round((within / total) * 100) };
  }, [analyticsQuery.data, goalQuery.data]);

  const breakdown = useMemo(() => {
    const s = analyticsQuery.data?.summary;
    const mealsByType = s?.mealsByType ?? {};
    const workoutsByType = s?.workoutsByType ?? {};
    return {
      mealsByType: Object.entries(mealsByType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
      workoutsByType: Object.entries(workoutsByType)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value),
    };
  }, [analyticsQuery.data]);

  const setRangeDays = (days: number) => {
    setDateTo(toDateInput(new Date()));
    setDateFrom(toDateInput(subDays(new Date(), days - 1)));
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Progress</h1>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Date Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRangeDays(7)}>7d</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRangeDays(14)}>14d</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRangeDays(30)}>30d</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setRangeDays(90)}>90d</Button>
          </div>
        </CardContent>
      </Card>

      {analyticsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {analyticsQuery.isError && (
        <p className="text-sm text-destructive">
          {analyticsQuery.error instanceof Error ? analyticsQuery.error.message : "Failed to load analytics"}
        </p>
      )}

      {!analyticsQuery.isLoading && !analyticsQuery.isError && chartData.length === 0 && (
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">No data in this range. Log meals/workouts to see trends.</p>
          </CardContent>
        </Card>
      )}

      {summary && chartData.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Avg Calories In" value={summary.averagesPerDay.caloriesConsumed} unit="kcal" highlight />
          <StatCard label="Avg Burned" value={summary.averagesPerDay.caloriesBurned} unit="kcal" />
          <StatCard label="Avg Net" value={summary.averagesPerDay.netCalories} unit="kcal" sub="consumed − burned" />
          <StatCard label="Workout Minutes" value={summary.totals.workoutMinutes} unit="min" sub={`${summary.totals.workoutCount} workouts`} />
          <StatCard label="Meals Logged" value={summary.totals.mealCount} sub={`${summary.totals.mealItems} items`} />
          <StatCard label="Days With Meals" value={summary.daysWithMeals} sub={`${summary.days} days selected`} />
          <StatCard label="Days With Workouts" value={summary.daysWithWorkouts} sub={`${summary.days} days selected`} />
          <StatCard
            label="On-Calorie Days"
            value={goalAdherence ? `${goalAdherence.within}/${goalAdherence.total}` : "—"}
            sub={goalAdherence ? `${goalAdherence.percent}% ≤ goal` : "Set a goal to track adherence"}
          />
        </div>
      )}

      {chartData.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Trends</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="calories">
              <TabsList>
                <TabsTrigger value="calories">Calories</TabsTrigger>
                <TabsTrigger value="macros">Macros</TabsTrigger>
                <TabsTrigger value="workouts">Workouts</TabsTrigger>
                <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              </TabsList>

              <TabsContent value="calories" className="mt-4">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="label" tickMargin={8} />
                      <YAxis tickFormatter={(v) => String(Math.round(Number(v)))} width={44} />
                      <Tooltip
                        labelFormatter={(v, payload) => {
                          const full = payload?.[0]?.payload?.date as string | undefined;
                          return full ? full : String(v);
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="caloriesConsumed"
                        name="Consumed"
                        stroke={CHART_COLORS.caloriesConsumed}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="caloriesBurned"
                        name="Burned"
                        stroke={CHART_COLORS.caloriesBurned}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="netCalories"
                        name="Net"
                        stroke={CHART_COLORS.netCalories}
                        strokeWidth={2}
                        dot={false}
                      />
                      {goalQuery.data?.dailyCalories ? (
                        <Line
                          type="monotone"
                          dataKey="goalCalories"
                          name="Goal"
                          stroke={CHART_COLORS.goal}
                          strokeDasharray="6 4"
                          strokeWidth={2}
                          dot={false}
                        />
                      ) : null}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="macros" className="mt-4">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="label" tickMargin={8} />
                      <YAxis tickFormatter={(v) => String(Math.round(Number(v)))} width={44} />
                      <Tooltip
                        labelFormatter={(v, payload) => {
                          const full = payload?.[0]?.payload?.date as string | undefined;
                          return full ? full : String(v);
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="protein"
                        name="Protein (g)"
                        stroke={CHART_COLORS.protein}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="carbs"
                        name="Carbs (g)"
                        stroke={CHART_COLORS.carbs}
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="fat"
                        name="Fat (g)"
                        stroke={CHART_COLORS.fat}
                        strokeWidth={2}
                        dot={false}
                      />
                      {goalQuery.data?.protein ? (
                        <Line
                          type="monotone"
                          dataKey="goalProtein"
                          name="Protein goal"
                          stroke={CHART_COLORS.protein}
                          strokeDasharray="6 4"
                          dot={false}
                        />
                      ) : null}
                      {goalQuery.data?.carbs ? (
                        <Line
                          type="monotone"
                          dataKey="goalCarbs"
                          name="Carbs goal"
                          stroke={CHART_COLORS.carbs}
                          strokeDasharray="6 4"
                          dot={false}
                        />
                      ) : null}
                      {goalQuery.data?.fat ? (
                        <Line
                          type="monotone"
                          dataKey="goalFat"
                          name="Fat goal"
                          stroke={CHART_COLORS.fat}
                          strokeDasharray="6 4"
                          dot={false}
                        />
                      ) : null}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="workouts" className="mt-4 space-y-4">
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                      <XAxis dataKey="label" tickMargin={8} />
                      <YAxis tickFormatter={(v) => String(Math.round(Number(v)))} width={44} />
                      <Tooltip
                        labelFormatter={(v, payload) => {
                          const full = payload?.[0]?.payload?.date as string | undefined;
                          return full ? full : String(v);
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="workoutMinutes"
                        name="Workout minutes"
                        fill={CHART_COLORS.workoutMinutes}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="caloriesBurned"
                        name="Calories burned"
                        fill={CHART_COLORS.caloriesBurned}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>

              <TabsContent value="breakdown" className="mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Meals by type</div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={breakdown.mealsByType} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip />
                          <Bar dataKey="value" name="Meals" fill={CHART_COLORS.barsMeals} radius={[4, 4, 4, 4]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">Workouts by type</div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={breakdown.workoutsByType} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="name" width={80} />
                          <Tooltip />
                          <Bar
                            dataKey="value"
                            name="Workouts"
                            fill={CHART_COLORS.barsWorkouts}
                            radius={[4, 4, 4, 4]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
