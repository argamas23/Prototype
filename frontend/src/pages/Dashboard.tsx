import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { getDashboard } from "@/services/dashboard";
import { deleteMeal, listMeals } from "@/services/meals";
import { deleteWorkout, listWorkouts } from "@/services/workouts";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Meal, Workout } from "@/types/health";
import { toast } from "@/components/ui/use-toast";
import { UtensilsCrossed, Dumbbell, Flame, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { getLocalDateString } from "@/lib/datetime";

export default function Dashboard() {
  const today = getLocalDateString();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => getDashboard(today),
  });

  const mealsQuery = useQuery({
    queryKey: ["meals", "date", today],
    queryFn: () => listMeals({ dateFrom: today, dateTo: today, pageSize: 25 }),
  });

  const workoutsQuery = useQuery({
    queryKey: ["workouts", "date", today],
    queryFn: () => listWorkouts({ dateFrom: today, dateTo: today, pageSize: 25 }),
  });

  const deleteMealMut = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      toast({ title: "Meal deleted" });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete meal";
      toast({ variant: "destructive", title: "Could not delete meal", description: message });
    },
  });

  const deleteWorkoutMut = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      toast({ title: "Workout deleted" });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to delete workout";
      toast({ variant: "destructive", title: "Could not delete workout", description: message });
    },
  });

  const macros = data?.macros;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Today's Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Calories In"
          value={isLoading ? "—" : data?.caloriesConsumed ?? 0}
          unit="kcal"
          highlight
        />
        <StatCard
          label="Calories Burned"
          value={isLoading ? "—" : data?.caloriesBurned ?? 0}
          unit="kcal"
        />
        <StatCard
          label="Net Calories"
          value={isLoading ? "—" : data?.netCalories ?? 0}
          unit="kcal"
          sub="consumed − burned"
        />
        <StatCard
          label="Workouts"
          value={isLoading ? "—" : data?.workoutCount ?? 0}
          sub={`${data?.mealCount ?? 0} meals logged`}
        />
      </div>

      {/* Macros */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Macro Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Protein", value: macros?.protein ?? 0, color: "bg-blue-500" },
              { label: "Carbs", value: macros?.carbs ?? 0, color: "bg-amber-500" },
              { label: "Fat", value: macros?.fat ?? 0, color: "bg-rose-500" },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className={`h-1.5 rounded-full ${m.color} mb-2`} />
                <p className="text-lg font-bold text-foreground">{isLoading ? "—" : m.value}g</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Today&apos;s Meals
              </CardTitle>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/log-meal">
                  <UtensilsCrossed className="h-4 w-4" />
                  Log
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {mealsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!mealsQuery.isLoading && (mealsQuery.data?.items ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No meals logged today.</p>
            )}
            {(mealsQuery.data?.items ?? []).map((meal) => (
              <div
                key={meal.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{meal.mealType}</span>
                    <span className="text-xs text-muted-foreground">{meal.time}</span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>{Math.round(meal.totals.calories)} kcal</span>
                    <span>{Math.round(meal.totals.protein)}g protein</span>
                    <span>{Math.round(meal.totals.carbs)}g carbs</span>
                    <span>{Math.round(meal.totals.fat)}g fat</span>
                  </div>
                  {meal.items.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {meal.items.map((i) => i.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate("/log-meal", { state: { editMeal: meal satisfies Meal } })}
                    title="Edit meal"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteMealMut.mutate(meal.id)}
                    title="Delete meal"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Today&apos;s Workouts
              </CardTitle>
              <Button asChild variant="outline" size="sm" className="gap-2">
                <Link to="/log-workout">
                  <Dumbbell className="h-4 w-4" />
                  Log
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {workoutsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!workoutsQuery.isLoading && (workoutsQuery.data?.items ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">No workouts logged today.</p>
            )}
            {(workoutsQuery.data?.items ?? []).map((workout) => {
              const exerciseNames = workout.exercises?.map((e) => e.name).filter(Boolean) ?? [];
              return (
                <div
                  key={workout.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-border/60 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{workout.workoutType}</span>
                      {workout.intensity && (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-xs text-secondary-foreground">
                          {workout.intensity}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                      <span>{workout.durationMinutes} min</span>
                      {workout.caloriesBurned > 0 && <span>{workout.caloriesBurned} kcal burned</span>}
                    </div>
                    {exerciseNames.length > 0 && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {exerciseNames.join(", ")}
                      </p>
                    )}
                    {workout.recommendationContext?.title && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        Recommendation: {workout.recommendationContext.title}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate("/log-workout", { state: { editWorkout: workout satisfies Workout } })}
                      title="Edit workout"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteWorkoutMut.mutate(workout.id)}
                      title="Delete workout"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/log-meal">
              <UtensilsCrossed className="h-4 w-4" />
              Log Meal
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/log-workout">
              <Dumbbell className="h-4 w-4" />
              Log Workout
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/goals">
              <Flame className="h-4 w-4" />
              Set Goals
            </Link>
          </Button>
          <Button asChild variant="outline" className="gap-2">
            <Link to="/history">
              <TrendingDown className="h-4 w-4" />
              View History
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
