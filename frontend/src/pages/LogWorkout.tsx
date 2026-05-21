import { useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { logWorkout, updateWorkout } from "@/services/workouts";
import type { RecommendationStrategyName, Workout, WorkoutType } from "@/types/health";
import { DateInput } from "@/components/shared/DateInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getLocalDateString } from "@/lib/datetime";

const WORKOUT_TYPES: WorkoutType[] = [
  "Strength",
  "Cardio",
  "Yoga",
  "HIIT",
  "Swimming",
  "Cycling",
  "Running",
  "Other",
];

type ExerciseRow = {
  workoutType: WorkoutType;
  name: string;
  durationMinutes: string;
  caloriesBurned: string;
  notes: string;
  distance: string;
  distanceUnit: "km" | "mi";
  sets: string;
  repsPerSet: string;
  weight: string;
  weightUnit: "kg" | "lb";
};

type ParsedExercise = {
  workoutType: WorkoutType;
  name: string;
  caloriesBurned: number;
  notes?: string | null;
  durationMinutes?: number;
  distance?: number;
  distanceUnit?: "km" | "mi";
  sets?: number;
  repsPerSet?: number;
  weight?: number;
  weightUnit?: "kg" | "lb";
};

export type WorkoutPlanExerciseState = Partial<ExerciseRow> & {
  workoutType: WorkoutType;
  name: string;
};

type WorkoutPlanLocationState = {
  plan?: {
    title?: string;
    strategy?: RecommendationStrategyName;
    difficulty?: string;
    generatedFor?: string;
    exercises?: WorkoutPlanExerciseState[];
  };
};

type LogWorkoutLocationState = WorkoutPlanLocationState & {
  editWorkout?: Workout;
};

const MAX_DURATION_MINUTES = 1440;
const MAX_CALORIES = 10000;
const MAX_DISTANCE = 100000;
const MAX_SETS = 1000;
const MAX_REPS = 1000;
const MAX_WEIGHT = 10000;

const MILES_TO_KM = 1.60934;
const LB_TO_KG = 0.45359237;

const emptyExercise = (overrides?: Partial<ExerciseRow>): ExerciseRow => ({
  workoutType: "Cardio",
  name: "",
  durationMinutes: "",
  caloriesBurned: "",
  notes: "",
  distance: "",
  distanceUnit: "km",
  sets: "",
  repsPerSet: "",
  weight: "",
  weightUnit: "kg",
  ...overrides,
});

function parseBoundedNumber(value: string, max: number) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value);
}

function isRowEmpty(row: ExerciseRow) {
  return (
    !row.name.trim() &&
    !row.durationMinutes.trim() &&
    !row.distance.trim() &&
    !row.sets.trim() &&
    !row.repsPerSet.trim() &&
    !row.weight.trim() &&
    !row.caloriesBurned.trim() &&
    !row.notes.trim()
  );
}

function validateExercise(row: ExerciseRow, idx: number): { exercise?: ParsedExercise; error?: string } {
  if (isRowEmpty(row)) return {};

  const rowLabel = `Exercise ${idx + 1}`;
  const name = row.name.trim();
  if (!name) return { error: `${rowLabel}: enter an exercise name.` };

  const requiresStrength = row.workoutType === "Strength" || row.workoutType === "HIIT";
  const requiresDistance =
    row.workoutType === "Cardio" ||
    row.workoutType === "Swimming" ||
    row.workoutType === "Cycling" ||
    row.workoutType === "Running";
  const requiresDuration =
    row.workoutType === "Cardio" ||
    row.workoutType === "Yoga" ||
    row.workoutType === "HIIT" ||
    row.workoutType === "Swimming" ||
    row.workoutType === "Cycling" ||
    row.workoutType === "Running";

  const duration = row.durationMinutes.trim() ? parseBoundedNumber(row.durationMinutes, MAX_DURATION_MINUTES) : null;
  if (requiresDuration) {
    if (duration == null || duration < 1) {
      return { error: `${rowLabel}: duration is required and must be between 1 and ${formatNumber(MAX_DURATION_MINUTES)} minutes.` };
    }
  } else if (duration != null && duration < 1) {
    return { error: `${rowLabel}: duration must be between 1 and ${formatNumber(MAX_DURATION_MINUTES)} minutes.` };
  }

  const distance = row.distance.trim() ? parseBoundedNumber(row.distance, 100000) : null;
  if (requiresDistance) {
    if (distance == null || distance <= 0) {
      return { error: `${rowLabel}: distance is required and must be greater than 0.` };
    }
  } else if (distance != null && distance <= 0) {
    return { error: `${rowLabel}: distance must be greater than 0.` };
  }

  const sets = row.sets.trim() ? parseBoundedNumber(row.sets, 1000) : null;
  const repsPerSet = row.repsPerSet.trim() ? parseBoundedNumber(row.repsPerSet, 1000) : null;
  const weight = row.weight.trim() ? parseBoundedNumber(row.weight, 10000) : null;

  if (requiresStrength) {
    if (sets == null || sets < 1) return { error: `${rowLabel}: sets is required and must be at least 1.` };
    if (repsPerSet == null || repsPerSet < 1) return { error: `${rowLabel}: reps per set is required and must be at least 1.` };
    if (weight == null || weight <= 0) return { error: `${rowLabel}: weight is required and must be greater than 0.` };
  } else {
    if (sets != null && sets < 1) return { error: `${rowLabel}: sets must be at least 1.` };
    if (repsPerSet != null && repsPerSet < 1) return { error: `${rowLabel}: reps per set must be at least 1.` };
    if ((sets != null && repsPerSet == null) || (sets == null && repsPerSet != null)) {
      return { error: `${rowLabel}: provide both sets and reps per set.` };
    }
    if (weight != null && weight < 0) return { error: `${rowLabel}: weight must be 0 or more.` };
  }

  const calories = row.caloriesBurned.trim() ? parseBoundedNumber(row.caloriesBurned, MAX_CALORIES) : 0;
  if (calories == null) {
    return { error: `${rowLabel}: calories must be between 0 and ${formatNumber(MAX_CALORIES)}.` };
  }

  if (
    row.workoutType === "Other" &&
    duration == null &&
    distance == null &&
    sets == null &&
    repsPerSet == null &&
    weight == null
  ) {
    return { error: `${rowLabel}: add at least one measurement (duration, distance, or sets/reps/weight).` };
  }

  return {
    exercise: {
      workoutType: row.workoutType,
      name,
      caloriesBurned: calories,
      notes: row.notes.trim() ? row.notes.trim() : null,
      ...(duration != null ? { durationMinutes: Math.round(duration) } : {}),
      ...(distance != null ? { distance, distanceUnit: row.distanceUnit } : {}),
      ...(sets != null ? { sets: Math.round(sets), repsPerSet: Math.round(repsPerSet ?? 0) } : {}),
      ...(weight != null ? { weight, weightUnit: row.weightUnit } : {}),
    },
  };
}

export default function LogWorkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const today = getLocalDateString();
  const editWorkout = (location.state as LogWorkoutLocationState | null)?.editWorkout;
  const isEditing = Boolean(editWorkout);
  const planState = (location.state as WorkoutPlanLocationState | null)?.plan;

  const initialWorkoutType = (searchParams.get("workoutType") as WorkoutType | null) ?? "Cardio";
  const initialDuration = searchParams.get("durationMinutes") ?? "";
  const recommendationStrategy = searchParams.get("strategy") as RecommendationStrategyName | null;
  const recommendationDifficulty = searchParams.get("difficulty");
  const recommendationGeneratedFor = searchParams.get("generatedFor");
  const recommendationTitle = searchParams.get("title");
  const initialExercises = editWorkout?.exercises?.length
    ? editWorkout.exercises.map((exercise) =>
        emptyExercise({
          workoutType: exercise.workoutType,
          name: exercise.name ?? "",
          durationMinutes: exercise.durationMinutes != null ? String(exercise.durationMinutes) : "",
          caloriesBurned: exercise.caloriesBurned != null ? String(exercise.caloriesBurned) : "",
          notes: exercise.notes ?? "",
          distance: exercise.distance != null ? String(exercise.distance) : "",
          distanceUnit: exercise.distanceUnit ?? "km",
          sets: exercise.sets != null ? String(exercise.sets) : "",
          repsPerSet: exercise.repsPerSet != null ? String(exercise.repsPerSet) : "",
          weight: exercise.weight != null ? String(exercise.weight) : "",
          weightUnit: exercise.weightUnit ?? "kg",
        }),
      )
    : planState?.exercises && planState.exercises.length > 0
      ? planState.exercises.map((exercise) =>
          emptyExercise({
            ...exercise,
            caloriesBurned: "",
            notes: "",
          }),
        )
      : [
          emptyExercise({
            workoutType: initialWorkoutType,
            name: recommendationTitle ?? "",
            durationMinutes: initialDuration,
            notes: recommendationTitle ? `Following recommendation: ${recommendationTitle}` : "",
          }),
        ];

  const [date, setDate] = useState(editWorkout?.date ?? searchParams.get("date") ?? today);
  const [exercises, setExercises] = useState<ExerciseRow[]>(initialExercises);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    let durationMinutes = 0;
    let caloriesBurned = 0;
    let distanceKm = 0;
    let totalSets = 0;
    let totalReps = 0;
    let totalVolumeKg = 0;
    let exerciseCount = 0;

    let hasDistance = false;
    let hasStrength = false;

    for (const ex of exercises) {
      if (isRowEmpty(ex)) continue;
      exerciseCount += 1;

      durationMinutes += parseBoundedNumber(ex.durationMinutes, MAX_DURATION_MINUTES) ?? 0;
      caloriesBurned += parseBoundedNumber(ex.caloriesBurned, MAX_CALORIES) ?? 0;

      const dist = parseBoundedNumber(ex.distance, MAX_DISTANCE);
      if (dist != null && dist > 0) {
        hasDistance = true;
        distanceKm += ex.distanceUnit === "mi" ? dist * MILES_TO_KM : dist;
      }

      const sets = parseBoundedNumber(ex.sets, MAX_SETS);
      const reps = parseBoundedNumber(ex.repsPerSet, MAX_REPS);
      const weight = parseBoundedNumber(ex.weight, MAX_WEIGHT);
      const weightKg = weight != null ? (ex.weightUnit === "lb" ? weight * LB_TO_KG : weight) : null;

      if (ex.sets.trim() || ex.repsPerSet.trim() || ex.weight.trim()) {
        hasStrength = true;
      }

      if (sets != null) totalSets += sets;
      if (sets != null && reps != null) totalReps += sets * reps;
      if (sets != null && reps != null && weightKg != null) totalVolumeKg += sets * reps * weightKg;
    }

    return {
      durationMinutes,
      caloriesBurned,
      distanceKm,
      totalSets,
      totalReps,
      totalVolumeKg,
      exerciseCount,
      hasDistance,
      hasStrength,
    };
  }, [exercises]);

  const summaryItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];

    const duration = `${formatNumber(totals.durationMinutes)} min`;
    const burned = `${formatNumber(totals.caloriesBurned)} kcal`;
    const distance = `${formatNumber(totals.distanceKm)} km`;
    const sets = `${formatNumber(totals.totalSets)} sets`;
    const reps = `${formatNumber(totals.totalReps)} reps`;
    const volume = `${formatNumber(totals.totalVolumeKg)} kg`;
    const exercisesLabel = `${totals.exerciseCount} exercises`;

    if (totals.hasDistance && totals.hasStrength) {
      items.push({ label: "Total Duration", value: duration });
      items.push({ label: "Total Burned", value: burned });
      items.push({ label: "Total Distance", value: distance });
      items.push({ label: "Total Volume", value: volume });
      return items;
    }

    if (totals.hasStrength) {
      if (totals.durationMinutes > 0) {
        items.push({ label: "Total Duration", value: duration });
        items.push({ label: "Total Burned", value: burned });
        items.push({ label: "Total Sets", value: sets });
        items.push({ label: "Total Volume", value: volume });
      } else {
        items.push({ label: "Total Burned", value: burned });
        items.push({ label: "Total Sets", value: sets });
        items.push({ label: "Total Reps", value: reps });
        items.push({ label: "Total Volume", value: volume });
      }
      return items;
    }

    if (totals.hasDistance) {
      items.push({ label: "Total Duration", value: duration });
      items.push({ label: "Total Burned", value: burned });
      items.push({ label: "Total Distance", value: distance });
      items.push({ label: "Exercises", value: exercisesLabel });
      return items;
    }

    items.push({ label: "Total Duration", value: duration });
    items.push({ label: "Total Burned", value: burned });
    items.push({ label: "Exercises", value: exercisesLabel });
    return items;
  }, [totals]);

  const mutation = useMutation({
    mutationFn: (payload) => (editWorkout ? updateWorkout(editWorkout.id, payload) : logWorkout(payload)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["workouts"] });
      queryClient.invalidateQueries({ queryKey: ["today-recommendation"] });
      toast({
        title: isEditing ? "Workout updated" : "Workout logged",
        description: isEditing
          ? "Your changes were saved and synced with the dashboard."
          : "Your workout was saved and synced with the dashboard.",
      });
      navigate("/dashboard");
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Failed to log workout";
      setError(message);
      toast({
        variant: "destructive",
        title: "Could not save workout",
        description: message,
      });
    },
  });

  const updateExercise = (idx: number, field: keyof ExerciseRow, value: string) => {
    setExercises((prev) => prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)));
  };

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);

  const removeExercise = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    setError(null);
    if (!date) {
      setError("Choose a valid date.");
      return;
    }
    if (date > today) {
      setError("Workout date cannot be in the future.");
      return;
    }

    const validExercises: ParsedExercise[] = [];
    for (let idx = 0; idx < exercises.length; idx += 1) {
      const result = validateExercise(exercises[idx], idx);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.exercise) validExercises.push(result.exercise);
    }

    if (validExercises.length === 0) {
      setError("Add at least one exercise with a name.");
      return;
    }

    const uniqueTypes = new Set(validExercises.map((ex) => ex.workoutType));
    const derivedWorkoutType: WorkoutType = uniqueTypes.size === 1 ? validExercises[0].workoutType : "Other";

    mutation.mutate({
      workoutType: derivedWorkoutType,
      date,
      exercises: validExercises,
      recommendationContext: editWorkout?.recommendationContext
        ? editWorkout.recommendationContext
        : planState?.strategy
        ? {
            strategy: planState.strategy,
            difficulty:
              planState.difficulty === "Beginner" ||
              planState.difficulty === "Intermediate" ||
              planState.difficulty === "Advanced"
                ? planState.difficulty
                : null,
            generatedFor: planState.generatedFor ?? date,
            title: planState.title ?? "Workout plan",
            followedAsRecommended: true,
          }
        : recommendationStrategy
        ? {
            strategy: recommendationStrategy,
            difficulty:
              recommendationDifficulty === "Beginner" ||
              recommendationDifficulty === "Intermediate" ||
              recommendationDifficulty === "Advanced"
                ? recommendationDifficulty
                : null,
            generatedFor: recommendationGeneratedFor,
            title: recommendationTitle,
            followedAsRecommended: true,
          }
        : null,
    });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{isEditing ? "Edit Workout" : "Log Workout"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add one or more exercises and HealthSync will total the workout for your dashboard.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Exercises</CardTitle>
          <Button variant="outline" size="sm" onClick={addExercise} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Exercise
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="workout-date">Date</Label>
              <DateInput id="workout-date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {exercises.map((row, idx) => (
            <div key={idx} className="border border-border/50 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Exercise {idx + 1}</span>
                {exercises.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeExercise(idx)}
                    aria-label={`Remove exercise ${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {(() => {
                const showStrength = row.workoutType === "Strength" || row.workoutType === "HIIT" || row.workoutType === "Other";
                const showDistance =
                  row.workoutType === "Cardio" ||
                  row.workoutType === "Swimming" ||
                  row.workoutType === "Cycling" ||
                  row.workoutType === "Running" ||
                  row.workoutType === "Other";
                const showDuration =
                  row.workoutType === "Cardio" ||
                  row.workoutType === "Yoga" ||
                  row.workoutType === "HIIT" ||
                  row.workoutType === "Swimming" ||
                  row.workoutType === "Cycling" ||
                  row.workoutType === "Running" ||
                  row.workoutType === "Other";

                return (
                  <>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor={`workout-exercise-type-${idx}`}>
                          Type
                        </Label>
                        <Select
                          value={row.workoutType}
                          onValueChange={(v) => updateExercise(idx, "workoutType", v as WorkoutType)}
                        >
                          <SelectTrigger id={`workout-exercise-type-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {WORKOUT_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {t}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs" htmlFor={`workout-exercise-name-${idx}`}>
                          Exercise Name
                        </Label>
                        <Input
                          id={`workout-exercise-name-${idx}`}
                          placeholder="e.g. Bench Press"
                          value={row.name}
                          onChange={(e) => updateExercise(idx, "name", e.target.value)}
                        />
                      </div>
                    </div>

                    {(showDuration || showDistance) && (
                      <div className="grid gap-2 sm:grid-cols-4">
                        {showDuration && (
                          <div className="space-y-1.5">
                            <Label className="text-xs" htmlFor={`workout-exercise-duration-${idx}`}>
                              Duration (min)
                            </Label>
                            <Input
                              id={`workout-exercise-duration-${idx}`}
                              type="number"
                              min={row.workoutType === "Other" ? "0" : "1"}
                              max={MAX_DURATION_MINUTES}
                              placeholder="e.g. 30"
                              value={row.durationMinutes}
                              onChange={(e) => updateExercise(idx, "durationMinutes", e.target.value)}
                            />
                          </div>
                        )}
                        {showDistance && (
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs" htmlFor={`workout-exercise-distance-${idx}`}>
                              Distance
                            </Label>
                            <div className="flex gap-2">
                              <Input
                                id={`workout-exercise-distance-${idx}`}
                                type="number"
                                min="0"
                                placeholder="e.g. 5"
                                value={row.distance}
                                onChange={(e) => updateExercise(idx, "distance", e.target.value)}
                              />
                              <Select
                                value={row.distanceUnit}
                                onValueChange={(v) => updateExercise(idx, "distanceUnit", v as "km" | "mi")}
                              >
                                <SelectTrigger className="w-[88px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="km">km</SelectItem>
                                  <SelectItem value="mi">mi</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {showStrength && (
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs" htmlFor={`workout-exercise-sets-${idx}`}>
                            Sets
                          </Label>
                          <Input
                            id={`workout-exercise-sets-${idx}`}
                            type="number"
                            min="1"
                            placeholder="e.g. 3"
                            value={row.sets}
                            onChange={(e) => updateExercise(idx, "sets", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs" htmlFor={`workout-exercise-reps-${idx}`}>
                            Reps
                          </Label>
                          <Input
                            id={`workout-exercise-reps-${idx}`}
                            type="number"
                            min="1"
                            placeholder="e.g. 10"
                            value={row.repsPerSet}
                            onChange={(e) => updateExercise(idx, "repsPerSet", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label className="text-xs" htmlFor={`workout-exercise-weight-${idx}`}>
                            Weight
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id={`workout-exercise-weight-${idx}`}
                              type="number"
                              min="0"
                              placeholder="e.g. 40"
                              value={row.weight}
                              onChange={(e) => updateExercise(idx, "weight", e.target.value)}
                            />
                            <Select
                              value={row.weightUnit}
                              onValueChange={(v) => updateExercise(idx, "weightUnit", v as "kg" | "lb")}
                            >
                              <SelectTrigger className="w-[88px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="lb">lb</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs" htmlFor={`workout-exercise-calories-${idx}`}>
                          Calories (kcal)
                        </Label>
                        <Input
                          id={`workout-exercise-calories-${idx}`}
                          type="number"
                          min="0"
                          max={MAX_CALORIES}
                          placeholder="0"
                          value={row.caloriesBurned}
                          onChange={(e) => updateExercise(idx, "caloriesBurned", e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs" htmlFor={`workout-exercise-notes-${idx}`}>
                          Notes (optional)
                        </Label>
                        <Input
                          id={`workout-exercise-notes-${idx}`}
                          placeholder="optional"
                          value={row.notes}
                          onChange={(e) => updateExercise(idx, "notes", e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-primary/5">
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          {summaryItems.map((item) => (
            <div key={item.label}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Save Workout"}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
