import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dumbbell, RefreshCcw } from "lucide-react";
import { getTodayRecommendation, getWorkoutPreferences, updateWorkoutPreferences } from "@/services/workouts";
import type {
  ExperienceLevel,
  RecommendationStrategyName,
  WorkoutPreferences,
} from "@/types/health";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STRATEGY_OPTIONS: Array<{ value: RecommendationStrategyName; label: string }> = [
  { value: "strength", label: "Strength" },
  { value: "cardio_endurance", label: "Cardio Endurance" },
  { value: "weight_loss", label: "Weight Loss" },
];

const EXPERIENCE_OPTIONS: ExperienceLevel[] = ["Beginner", "Intermediate", "Advanced"];

function toCsv(values: string[]) {
  return values.join(", ");
}

function fromCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function PreferencesDialog({
  preferences,
}: {
  preferences?: WorkoutPreferences;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preferredStrategy, setPreferredStrategy] = useState<RecommendationStrategyName>("strength");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>("Beginner");
  const [dailyTimeBudgetMinutes, setDailyTimeBudgetMinutes] = useState("30");
  const [workoutDaysPerWeek, setWorkoutDaysPerWeek] = useState("3");
  const [availableEquipment, setAvailableEquipment] = useState("");
  const [injuries, setInjuries] = useState("");
  const [preferredWorkoutTypes, setPreferredWorkoutTypes] = useState("");
  const [preferLowImpact, setPreferLowImpact] = useState("false");

  useEffect(() => {
    if (!preferences) return;
    setPreferredStrategy(preferences.preferredStrategy ?? "strength");
    setExperienceLevel(preferences.experienceLevel);
    setDailyTimeBudgetMinutes(String(preferences.dailyTimeBudgetMinutes));
    setWorkoutDaysPerWeek(String(preferences.workoutDaysPerWeek));
    setAvailableEquipment(toCsv(preferences.availableEquipment));
    setInjuries(toCsv(preferences.injuries));
    setPreferredWorkoutTypes(toCsv(preferences.preferredWorkoutTypes));
    setPreferLowImpact(String(preferences.preferLowImpact));
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: updateWorkoutPreferences,
    onSuccess: async (bundle) => {
      queryClient.setQueryData(["workout-preferences"], bundle.preferences);
      queryClient.setQueryData(["today-recommendation"], bundle.recommendation);
      await queryClient.invalidateQueries({ queryKey: ["today-recommendation"] });
      await queryClient.invalidateQueries({ queryKey: ["weekly-recommendation"] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Tweak Preferences</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tweak Preferences</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recommendation Strategy</Label>
            <Select value={preferredStrategy} onValueChange={(value) => setPreferredStrategy(value as RecommendationStrategyName)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Experience Level</Label>
            <Select value={experienceLevel} onValueChange={(value) => setExperienceLevel(value as ExperienceLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time Budget (minutes)</Label>
            <Input
              type="number"
              min="10"
              max="180"
              value={dailyTimeBudgetMinutes}
              onChange={(event) => setDailyTimeBudgetMinutes(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Workout Days / Week</Label>
            <Input
              type="number"
              min="1"
              max="7"
              value={workoutDaysPerWeek}
              onChange={(event) => setWorkoutDaysPerWeek(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Available Equipment</Label>
            <Input
              placeholder="dumbbells, treadmill, bicycle"
              value={availableEquipment}
              onChange={(event) => setAvailableEquipment(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Injuries or Constraints</Label>
            <Input
              placeholder="knee, shoulder"
              value={injuries}
              onChange={(event) => setInjuries(event.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Preferred Workout Types</Label>
            <Input
              placeholder="running, cycling"
              value={preferredWorkoutTypes}
              onChange={(event) => setPreferredWorkoutTypes(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prefer Low Impact</Label>
            <Select value={preferLowImpact} onValueChange={setPreferLowImpact}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="false">No</SelectItem>
                <SelectItem value="true">Yes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              mutation.mutate({
                preferredStrategy,
                experienceLevel,
                dailyTimeBudgetMinutes: Number(dailyTimeBudgetMinutes),
                workoutDaysPerWeek: Number(workoutDaysPerWeek),
                availableEquipment: fromCsv(availableEquipment),
                injuries: fromCsv(injuries),
                preferredWorkoutTypes: fromCsv(preferredWorkoutTypes),
                preferLowImpact: preferLowImpact === "true",
              })
            }
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Updating..." : "Regenerate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RecommendationCard() {
  const recommendationQuery = useQuery({
    queryKey: ["today-recommendation"],
    queryFn: getTodayRecommendation,
  });
  const preferencesQuery = useQuery({
    queryKey: ["workout-preferences"],
    queryFn: getWorkoutPreferences,
  });

  const recommendation = recommendationQuery.data;
  const firstExercise = recommendation?.exercises[0];
  const params = recommendation
    ? new URLSearchParams({
        workoutType: firstExercise?.category === "Strength" ? "Strength" : "Cardio",
        durationMinutes: String(recommendation.estimatedTotalMinutes),
        intensity: firstExercise?.intensity ?? "Medium",
        strategy: recommendation.strategy,
        difficulty: recommendation.difficulty,
        generatedFor: recommendation.generatedFor,
        title: recommendation.title,
      }).toString()
    : "";

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base">Today's Recommendation</CardTitle>
          <p className="text-sm text-muted-foreground">
            Personalized daily guidance built from your profile, goals, and recent activity.
          </p>
        </div>
        <PreferencesDialog preferences={preferencesQuery.data} />
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendationQuery.isLoading && <p className="text-sm text-muted-foreground">Loading recommendation...</p>}
        {!recommendationQuery.isLoading && recommendation && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{recommendation.title}</Badge>
              <Badge variant="outline">{recommendation.difficulty}</Badge>
              <Badge variant="outline">{recommendation.estimatedTotalMinutes} min</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{recommendation.summary}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {recommendation.rationale[0] ?? "Generated from your current preferences."}
              </p>
            </div>
            <div className="space-y-3">
              {recommendation.exercises.map((exercise) => (
                <div key={exercise.name} className="rounded-lg border border-border/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{exercise.name}</p>
                      <p className="text-xs text-muted-foreground">{exercise.instructions}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{exercise.durationMinutes} min</p>
                      <p>{exercise.intensity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <Link to={`/log-workout?${params}`}>
                  <Dumbbell className="h-4 w-4" />
                  Start Workout
                </Link>
              </Button>
              <Button variant="ghost" onClick={() => recommendationQuery.refetch()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
