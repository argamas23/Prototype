import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listMeals, deleteMeal } from "@/services/meals";
import { listWorkouts, deleteWorkout } from "@/services/workouts";
import type { Meal, Workout } from "@/types/health";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, UtensilsCrossed, Dumbbell } from "lucide-react";

function MealRow({ meal, onDelete }: { meal: Meal; onDelete: () => void }) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{meal.mealType}</span>
            <span className="text-xs text-muted-foreground">{meal.date} {meal.time}</span>
          </div>
          <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
            <span>{Math.round(meal.totals.calories)} kcal</span>
            <span>{Math.round(meal.totals.protein)}g protein</span>
            <span>{Math.round(meal.totals.carbs)}g carbs</span>
            <span>{Math.round(meal.totals.fat)}g fat</span>
          </div>
          {meal.items.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {meal.items.map((i) => i.name).join(", ")}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function WorkoutRow({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  const exerciseNames = workout.exercises?.map((e) => e.name).filter(Boolean) ?? [];
  const recommendationTitle = workout.recommendationContext?.title;
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-foreground">{workout.workoutType}</span>
            <span className="text-xs text-muted-foreground">{workout.date}</span>
            {workout.intensity && (
              <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                {workout.intensity}
              </span>
            )}
          </div>
          <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
            <span>{workout.durationMinutes} min</span>
            {workout.caloriesBurned > 0 && <span>{workout.caloriesBurned} kcal burned</span>}
          </div>
          {exerciseNames.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {exerciseNames.join(", ")}
            </p>
          )}
          {recommendationTitle && (
            <p className="mt-1 text-xs text-muted-foreground truncate">
              Recommendation: {recommendationTitle}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function History() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("meals");

  const mealsQuery = useQuery({
    queryKey: ["meals"],
    queryFn: () => listMeals({ pageSize: 50 }),
    enabled: tab === "meals",
  });

  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => listWorkouts({ pageSize: 50 }),
    enabled: tab === "workouts",
  });

  const deleteMealMut = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meals"] }),
  });

  const deleteWorkoutMut = useMutation({
    mutationFn: deleteWorkout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workouts"] }),
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">History</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="meals" className="gap-1.5">
            <UtensilsCrossed className="h-4 w-4" />
            Meals
          </TabsTrigger>
          <TabsTrigger value="workouts" className="gap-1.5">
            <Dumbbell className="h-4 w-4" />
            Workouts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals" className="space-y-3 mt-4">
          {mealsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!mealsQuery.isLoading && (mealsQuery.data?.items ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No meals logged yet.</p>
          )}
          {(mealsQuery.data?.items ?? []).map((meal) => (
            <MealRow
              key={meal.id}
              meal={meal}
              onDelete={() => deleteMealMut.mutate(meal.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="workouts" className="space-y-3 mt-4">
          {workoutsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!workoutsQuery.isLoading && (workoutsQuery.data?.items ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
          )}
          {(workoutsQuery.data?.items ?? []).map((workout) => (
            <WorkoutRow
              key={workout.id}
              workout={workout}
              onDelete={() => deleteWorkoutMut.mutate(workout.id)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
