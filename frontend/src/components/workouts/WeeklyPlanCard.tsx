import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Dumbbell, PauseCircle } from "lucide-react";
import { getWeeklyRecommendation } from "@/services/workouts";
import type { WorkoutRecommendation } from "@/types/health";
import { PreferencesDialog } from "@/components/workouts/RecommendationCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function buildWorkoutLink(dayDate: string, recommendationTitle: string, recommendation?: WorkoutRecommendation) {
  if (!recommendation) return "/log-workout";
  const firstExercise = recommendation.exercises[0];
  return `/log-workout?${new URLSearchParams({
    workoutType: firstExercise?.category === "Strength" ? "Strength" : "Cardio",
    date: dayDate,
    durationMinutes: String(recommendation.estimatedTotalMinutes),
    intensity: firstExercise?.intensity ?? "Medium",
    strategy: recommendation.strategy,
    difficulty: recommendation.difficulty,
    generatedFor: dayDate,
    title: recommendationTitle,
  }).toString()}`;
}

function formatExercisePreview(recommendation?: WorkoutRecommendation | null) {
  if (!recommendation || recommendation.exercises.length === 0) return "Exercises will appear here once your plan is ready.";
  return recommendation.exercises.map((exercise) => exercise.name).join(", ");
}

export function WeeklyPlanCard() {
  const weeklyPlanQuery = useQuery({
    queryKey: ["weekly-recommendation"],
    queryFn: getWeeklyRecommendation,
  });

  const weeklyPlan = weeklyPlanQuery.data;

  return (
    <Card className="border-border/50">
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">This Week&apos;s Program</CardTitle>
            <p className="text-sm text-muted-foreground">
              A seven-day split generated from your goals, profile, training history, and preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{weeklyPlan?.difficulty ?? "Loading"}</Badge>
            <Badge variant="outline">{weeklyPlan?.scheduledDays ?? 0} training days</Badge>
            <Badge variant="outline">{weeklyPlan?.recoveryDays ?? 0} recovery days</Badge>
            <PreferencesDialog />
          </div>
        </div>
        {weeklyPlan && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            {weeklyPlan.weeklySummary}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {weeklyPlanQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Loading weekly program...</p>
        )}
        {!weeklyPlanQuery.isLoading && weeklyPlan && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {weeklyPlan.days.map((day) => (
              <div
                key={day.date}
                className="flex h-full flex-col justify-between rounded-xl border border-border/60 p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{day.label}</p>
                      <p className="text-xs text-muted-foreground">{day.date}</p>
                    </div>
                    <Badge variant={day.isRestDay ? "outline" : "secondary"}>{day.focus}</Badge>
                  </div>
                  {day.isRestDay ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <PauseCircle className="h-4 w-4 text-muted-foreground" />
                        Recovery Day
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {day.rationale[0] ?? "Use this day for rest, light walking, or mobility."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <CalendarRange className="h-4 w-4 text-muted-foreground" />
                        {day.recommendation?.title}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {day.recommendation?.summary}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{day.recommendation?.estimatedTotalMinutes ?? 0} min</span>
                        <span>{day.recommendation?.exercises.length ?? 0} exercises</span>
                      </div>
                      <p className="text-sm text-foreground/90">
                        {formatExercisePreview(day.recommendation)}
                      </p>
                    </div>
                  )}
                </div>
                {!day.isRestDay && day.recommendation && (
                  <Button asChild variant="outline" className="mt-4 gap-2">
                    <Link to={buildWorkoutLink(day.date, day.recommendation.title, day.recommendation)}>
                      <Dumbbell className="h-4 w-4" />
                      Start This Workout
                    </Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
