import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Dumbbell, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { getProfile } from "@/services/profile";
import { createAdminPlan, listAdminPlans, listPublicPlans, updateAdminPlan, type WorkoutPlanPayload } from "@/services/plans";
import type {
  ExperienceLevel,
  Gender,
  PlanStrategy,
  RecommendationStrategyName,
  WorkoutPlan,
  WorkoutPlanExercise,
  WorkoutType,
} from "@/types/health";
import type { WorkoutPlanExerciseState } from "./LogWorkout";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { getLocalDateString } from "@/lib/datetime";
import { cn } from "@/lib/utils";

type EditableExercise = {
  workoutType: WorkoutType;
  name: string;
  durationMinutes: string;
  distance: string;
  distanceUnit: "km" | "mi";
  sets: string;
  repsPerSet: string;
  weight: string;
  weightUnit: "kg" | "lb";
};

type EditablePlan = {
  id?: string;
  title: string;
  strategy: PlanStrategy;
  experience: ExperienceLevel[];
  ageMin: string;
  ageMax: string;
  daysPerWeek: string;
  totalMinutes: string;
  equipment: string;
  workoutTypes: string;
  constraintsToAvoid: string;
  summary: string;
  exercises: EditableExercise[];
};

const STRATEGIES: PlanStrategy[] = ["Strength", "Cardio Endurance", "Weight Loss", "Flexibility"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["Beginner", "Intermediate", "Advanced"];
const WORKOUT_TYPES: WorkoutType[] = ["Strength", "Cardio", "Yoga", "HIIT", "Swimming", "Cycling", "Running", "Other"];
const GENDER_LABELS: Record<Gender, string> = {
  Male: "Male",
  Female: "Female",
  Other: "Other",
  PreferNotToSay: "Prefer not to say",
};

const BUILT_IN_PLANS: WorkoutPlan[] = [
  {
    id: "adult-yoga-foundation",
    title: "Yoga for Adults",
    strategy: "Flexibility",
    experience: ["Beginner", "Intermediate"],
    ageMin: 19,
    ageMax: 64,
    daysPerWeek: 3,
    totalMinutes: 30,
    equipment: ["mat"],
    workoutTypes: ["yoga", "mobility", "stretching"],
    constraintsToAvoid: [],
    summary: "A calm mobility routine for posture, breathing, and daily flexibility.",
    exercises: [
      { workoutType: "Yoga", name: "Sun Salutation Flow", durationMinutes: 10 },
      { workoutType: "Yoga", name: "Warrior Balance Sequence", durationMinutes: 8 },
      { workoutType: "Yoga", name: "Hip and Hamstring Stretch", durationMinutes: 7 },
      { workoutType: "Yoga", name: "Box Breathing Cooldown", durationMinutes: 5 },
    ],
  },
  {
    id: "teen-yoga-basics",
    title: "Yoga for Kids (12-18 years)",
    strategy: "Flexibility",
    experience: ["Beginner"],
    ageMin: 12,
    ageMax: 18,
    daysPerWeek: 2,
    totalMinutes: 25,
    equipment: ["mat"],
    workoutTypes: ["yoga", "stretching"],
    constraintsToAvoid: [],
    summary: "Short, low-pressure yoga sessions focused on movement quality and balance.",
    exercises: [
      { workoutType: "Yoga", name: "Cat-Cow Mobility", durationMinutes: 5 },
      { workoutType: "Yoga", name: "Tree Pose Practice", durationMinutes: 6 },
      { workoutType: "Yoga", name: "Downward Dog to Cobra Flow", durationMinutes: 8 },
      { workoutType: "Yoga", name: "Guided Relaxation", durationMinutes: 6 },
    ],
  },
  {
    id: "adult-weight-training",
    title: "Weight Training for Adults",
    strategy: "Strength",
    experience: ["Intermediate", "Advanced"],
    ageMin: 19,
    ageMax: 59,
    daysPerWeek: 4,
    totalMinutes: 45,
    equipment: ["dumbbells", "bench", "barbell"],
    workoutTypes: ["strength training", "weight training"],
    constraintsToAvoid: ["shoulder"],
    summary: "A compound lifting session built around push, pull, squat, and hinge patterns.",
    exercises: [
      { workoutType: "Strength", name: "Bench Press", sets: 4, repsPerSet: 8, weight: 30, weightUnit: "kg" },
      { workoutType: "Strength", name: "Goblet Squat", sets: 3, repsPerSet: 10, weight: 18, weightUnit: "kg" },
      { workoutType: "Strength", name: "Bent-Over Row", sets: 3, repsPerSet: 10, weight: 16, weightUnit: "kg" },
      { workoutType: "Strength", name: "Romanian Deadlift", sets: 3, repsPerSet: 10, weight: 24, weightUnit: "kg" },
    ],
  },
  {
    id: "senior-strength",
    title: "Weight Training for Senior Citizens",
    strategy: "Strength",
    experience: ["Beginner", "Intermediate"],
    ageMin: 60,
    ageMax: 100,
    daysPerWeek: 2,
    totalMinutes: 30,
    equipment: ["dumbbells", "chair"],
    workoutTypes: ["strength training", "low impact"],
    constraintsToAvoid: [],
    summary: "Lower-impact strength work for stability, controlled range, and confidence.",
    exercises: [
      { workoutType: "Strength", name: "Chair Squat", sets: 3, repsPerSet: 8, weight: 1, weightUnit: "kg" },
      { workoutType: "Strength", name: "Supported Dumbbell Row", sets: 3, repsPerSet: 10, weight: 5, weightUnit: "kg" },
      { workoutType: "Strength", name: "Seated Shoulder Press", sets: 2, repsPerSet: 8, weight: 3, weightUnit: "kg" },
      { workoutType: "Yoga", name: "Standing Calf and Hip Stretch", durationMinutes: 8 },
    ],
  },
  {
    id: "beginner-fat-loss",
    title: "30 Min Weight Loss Starter",
    strategy: "Weight Loss",
    experience: ["Beginner", "Intermediate"],
    ageMin: 16,
    ageMax: 70,
    daysPerWeek: 3,
    totalMinutes: 30,
    equipment: ["treadmill", "dumbbells"],
    workoutTypes: ["walking", "strength training", "cardio"],
    constraintsToAvoid: [],
    summary: "A balanced cardio and resistance session designed for sustainable calorie burn.",
    exercises: [
      { workoutType: "Running", name: "Treadmill Brisk Walk", durationMinutes: 12, distance: 1.2, distanceUnit: "km" },
      { workoutType: "Strength", name: "Dumbbell Squat to Press", sets: 3, repsPerSet: 12, weight: 6, weightUnit: "kg" },
      { workoutType: "Strength", name: "Alternating Reverse Lunge", sets: 3, repsPerSet: 10, weight: 4, weightUnit: "kg" },
      { workoutType: "Yoga", name: "Cooldown Stretch", durationMinutes: 5 },
    ],
  },
  {
    id: "cardio-endurance-bike",
    title: "Cardio Endurance Ride",
    strategy: "Cardio Endurance",
    experience: ["Beginner", "Intermediate", "Advanced"],
    ageMin: 14,
    ageMax: 75,
    daysPerWeek: 3,
    totalMinutes: 40,
    equipment: ["cycle", "bicycle", "stationary bike"],
    workoutTypes: ["cycling", "cardio"],
    constraintsToAvoid: ["knee"],
    summary: "Steady cycling intervals for aerobic fitness with controlled impact.",
    exercises: [
      { workoutType: "Cycling", name: "Easy Spin Warm-Up", durationMinutes: 8, distance: 2, distanceUnit: "km" },
      { workoutType: "Cycling", name: "Endurance Cycling Intervals", durationMinutes: 25, distance: 8, distanceUnit: "km" },
      { workoutType: "Cycling", name: "Cooldown Ride", durationMinutes: 7, distance: 1.5, distanceUnit: "km" },
    ],
  },
  {
    id: "runner-5k-base",
    title: "Beginner 5K Running Base",
    strategy: "Cardio Endurance",
    experience: ["Beginner"],
    ageMin: 15,
    ageMax: 60,
    daysPerWeek: 3,
    totalMinutes: 35,
    equipment: ["running shoes", "treadmill"],
    workoutTypes: ["running", "cardio"],
    constraintsToAvoid: ["knee"],
    summary: "Run-walk intervals that gradually build comfort with continuous running.",
    exercises: [
      { workoutType: "Running", name: "Walk Warm-Up", durationMinutes: 7, distance: 0.7, distanceUnit: "km" },
      { workoutType: "Running", name: "Run-Walk Intervals", durationMinutes: 22, distance: 2.5, distanceUnit: "km" },
      { workoutType: "Running", name: "Easy Walk Cooldown", durationMinutes: 6, distance: 0.6, distanceUnit: "km" },
    ],
  },
  {
    id: "calisthenics-four-day-base",
    title: "4 Day Beginner Calisthenics",
    strategy: "Strength",
    experience: ["Beginner", "Intermediate"],
    ageMin: 14,
    ageMax: 60,
    daysPerWeek: 4,
    totalMinutes: 35,
    equipment: ["mat", "pull-up bar"],
    workoutTypes: ["calisthenics", "bodyweight", "strength training"],
    constraintsToAvoid: ["shoulder"],
    summary: "A bodyweight strength plan for building control, pushing strength, pulling strength, and core stability.",
    exercises: [
      { workoutType: "Strength", name: "Incline Push-Up", sets: 3, repsPerSet: 10, weight: 0, weightUnit: "kg" },
      { workoutType: "Strength", name: "Assisted Bodyweight Row", sets: 3, repsPerSet: 8, weight: 0, weightUnit: "kg" },
      { workoutType: "Strength", name: "Bodyweight Squat", sets: 3, repsPerSet: 12, weight: 0, weightUnit: "kg" },
      { workoutType: "Strength", name: "Dead Bug", sets: 3, repsPerSet: 10, weight: 0, weightUnit: "kg" },
    ],
  },
  {
    id: "upper-lower-six-day-strength",
    title: "6 Day Upper Lower Strength Split",
    strategy: "Strength",
    experience: ["Intermediate", "Advanced"],
    ageMin: 18,
    ageMax: 55,
    daysPerWeek: 6,
    totalMinutes: 55,
    equipment: ["gym access", "dumbbells", "barbell", "bench"],
    workoutTypes: ["strength training", "weight training"],
    constraintsToAvoid: ["shoulder", "knee"],
    summary: "A higher-frequency strength split for lifters who want structured volume across upper and lower body days.",
    exercises: [
      { workoutType: "Strength", name: "Barbell Squat", sets: 4, repsPerSet: 6, weight: 40, weightUnit: "kg" },
      { workoutType: "Strength", name: "Bench Press", sets: 4, repsPerSet: 6, weight: 35, weightUnit: "kg" },
      { workoutType: "Strength", name: "Dumbbell Row", sets: 4, repsPerSet: 8, weight: 18, weightUnit: "kg" },
      { workoutType: "Strength", name: "Romanian Deadlift", sets: 3, repsPerSet: 8, weight: 35, weightUnit: "kg" },
    ],
  },
  {
    id: "four-day-swim-bike-endurance",
    title: "4 Day Swim and Bike Endurance",
    strategy: "Cardio Endurance",
    experience: ["Beginner", "Intermediate"],
    ageMin: 16,
    ageMax: 70,
    daysPerWeek: 4,
    totalMinutes: 45,
    equipment: ["pool", "bicycle", "stationary bike"],
    workoutTypes: ["swimming", "cycling", "cardio"],
    constraintsToAvoid: [],
    summary: "A joint-friendly endurance plan alternating swimming and cycling for aerobic capacity.",
    exercises: [
      { workoutType: "Swimming", name: "Easy Swim Warm-Up", durationMinutes: 8, distance: 0.2, distanceUnit: "km" },
      { workoutType: "Swimming", name: "Steady Swim Set", durationMinutes: 15, distance: 0.5, distanceUnit: "km" },
      { workoutType: "Cycling", name: "Aerobic Bike Block", durationMinutes: 17, distance: 6, distanceUnit: "km" },
      { workoutType: "Cycling", name: "Easy Spin Cooldown", durationMinutes: 5, distance: 1, distanceUnit: "km" },
    ],
  },
  {
    id: "five-day-running-endurance",
    title: "5 Day Running Endurance Builder",
    strategy: "Cardio Endurance",
    experience: ["Intermediate", "Advanced"],
    ageMin: 16,
    ageMax: 60,
    daysPerWeek: 5,
    totalMinutes: 50,
    equipment: ["running shoes", "treadmill"],
    workoutTypes: ["running", "cardio", "endurance"],
    constraintsToAvoid: ["knee"],
    summary: "A weekly running structure combining tempo work, easy mileage, and controlled intervals.",
    exercises: [
      { workoutType: "Running", name: "Easy Run Warm-Up", durationMinutes: 10, distance: 1.2, distanceUnit: "km" },
      { workoutType: "Running", name: "Tempo Run", durationMinutes: 25, distance: 4, distanceUnit: "km" },
      { workoutType: "Running", name: "Short Strides", durationMinutes: 8, distance: 1, distanceUnit: "km" },
      { workoutType: "Running", name: "Walk Cooldown", durationMinutes: 7, distance: 0.7, distanceUnit: "km" },
    ],
  },
  {
    id: "five-day-fat-loss-circuit",
    title: "5 Day Fat Loss Circuit",
    strategy: "Weight Loss",
    experience: ["Beginner", "Intermediate"],
    ageMin: 18,
    ageMax: 65,
    daysPerWeek: 5,
    totalMinutes: 40,
    equipment: ["dumbbells", "mat", "treadmill"],
    workoutTypes: ["hiit", "strength training", "cardio", "weight loss"],
    constraintsToAvoid: [],
    summary: "A moderate-density circuit plan blending resistance training, cardio, and short recovery blocks.",
    exercises: [
      { workoutType: "HIIT", name: "Dumbbell Thruster Intervals", durationMinutes: 10, sets: 4, repsPerSet: 10, weight: 6, weightUnit: "kg" },
      { workoutType: "Strength", name: "Dumbbell Romanian Deadlift", sets: 3, repsPerSet: 12, weight: 10, weightUnit: "kg" },
      { workoutType: "Running", name: "Incline Walk", durationMinutes: 15, distance: 1.5, distanceUnit: "km" },
      { workoutType: "Yoga", name: "Mobility Cooldown", durationMinutes: 5 },
    ],
  },
  {
    id: "six-day-yoga-mobility",
    title: "6 Day Yoga and Mobility Reset",
    strategy: "Flexibility",
    experience: ["Beginner", "Intermediate", "Advanced"],
    ageMin: 12,
    ageMax: 80,
    daysPerWeek: 6,
    totalMinutes: 35,
    equipment: ["mat", "yoga blocks"],
    workoutTypes: ["yoga", "mobility", "stretching", "flexibility"],
    constraintsToAvoid: [],
    summary: "A frequent low-impact mobility plan for flexibility, recovery, breath control, and posture.",
    exercises: [
      { workoutType: "Yoga", name: "Breath-Led Sun Flow", durationMinutes: 10 },
      { workoutType: "Yoga", name: "Hip Opener Sequence", durationMinutes: 8 },
      { workoutType: "Yoga", name: "Thoracic Spine Mobility", durationMinutes: 7 },
      { workoutType: "Yoga", name: "Long Hold Hamstring Stretch", durationMinutes: 6 },
      { workoutType: "Yoga", name: "Relaxed Breathing", durationMinutes: 4 },
    ],
  },
];

function splitCsv(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

const FIELD_ALIASES: Record<string, string[]> = {
  "yoga mat": ["mat", "exercise mat", "floor mat"],
  yogamat: ["mat", "yoga mat", "exercise mat"],
  mat: ["yoga mat", "exercise mat"],
  dumbell: ["dumbbell", "dumbbells", "free weights"],
  dumbells: ["dumbbell", "dumbbells", "free weights"],
  dumbbell: ["dumbbells", "free weights"],
  dumbbells: ["dumbbell", "free weights"],
  barbell: ["barbells", "free weights"],
  barbells: ["barbell", "free weights"],
  cycle: ["bicycle", "bike", "stationary bike"],
  bicycle: ["cycle", "bike", "stationary bike"],
  bike: ["cycle", "bicycle", "stationary bike"],
  treadmill: ["running machine"],
  "pull up bar": ["pull-up bar", "pullup bar"],
  "gym access": [
    "gym",
    "dumbbell",
    "dumbbells",
    "barbell",
    "barbells",
    "bench",
    "treadmill",
    "stationary bike",
    "cycle",
    "bicycle",
    "pull-up bar",
    "cable machine",
    "resistance machine",
    "free weights",
  ],
  gym: [
    "gym access",
    "dumbbell",
    "dumbbells",
    "barbell",
    "barbells",
    "bench",
    "treadmill",
    "stationary bike",
    "cycle",
    "bicycle",
    "pull-up bar",
    "free weights",
  ],
  "knee pain": ["knee", "knee injury", "knee constraint"],
  "knee-pain": ["knee", "knee pain"],
  knee: ["knee pain", "knee injury", "knee constraint"],
  shoulder: ["shoulder pain", "shoulder injury", "shoulder constraint"],
  "shoulder pain": ["shoulder", "shoulder injury"],
  cardio: ["cardio endurance", "aerobic", "running", "cycling"],
  running: ["run", "jogging", "cardio"],
  cycling: ["cycle", "bicycle", "bike", "cardio"],
  yoga: ["flexibility", "mobility", "stretching"],
  calisthenics: ["bodyweight", "body weight", "strength training"],
  "strength training": ["weight training", "resistance training", "bodyweight", "calisthenics"],
  "weight training": ["strength training", "resistance training"],
};

function normalizeToken(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b(dumbell|dumbells)\b/g, "dumbbell")
    .replace(/\bweights\b/g, "weight");
}

function expandTerms(values: string[]) {
  const expanded = new Set<string>();
  const add = (term: string) => {
    const normalized = normalizeToken(term);
    if (!normalized || expanded.has(normalized)) return;
    expanded.add(normalized);
    normalized.split(" ").forEach((part) => {
      if (part.length > 2) expanded.add(part);
    });
    (FIELD_ALIASES[term.toLowerCase()] ?? FIELD_ALIASES[normalized] ?? []).forEach(add);
  };
  values.forEach(add);
  return expanded;
}

function termsOverlap(a: string[], b: string[]) {
  const expandedA = expandTerms(a);
  const expandedB = expandTerms(b);
  return [...expandedA].some((term) => expandedB.has(term));
}

function equipmentMatchScore(requiredEquipment: string[], availableEquipment: string[]) {
  if (requiredEquipment.length === 0) return 5;
  const available = expandTerms(availableEquipment);
  const matched = requiredEquipment.filter((item) => {
    const required = expandTerms([item]);
    return [...required].some((term) => available.has(term));
  }).length;
  if (matched === requiredEquipment.length) return 5;
  if (matched > 0) return 2;
  return 0;
}

function emptyExercise(overrides?: Partial<EditableExercise>): EditableExercise {
  return {
    workoutType: "Strength",
    name: "",
    durationMinutes: "",
    distance: "",
    distanceUnit: "km",
    sets: "",
    repsPerSet: "",
    weight: "",
    weightUnit: "kg",
    ...overrides,
  };
}

function emptyPlan(): EditablePlan {
  return {
    title: "",
    strategy: "Strength",
    experience: ["Beginner"],
    ageMin: "18",
    ageMax: "65",
    daysPerWeek: "3",
    totalMinutes: "30",
    equipment: "",
    workoutTypes: "",
    constraintsToAvoid: "",
    summary: "",
    exercises: [emptyExercise()],
  };
}

function toEditablePlan(plan: WorkoutPlan): EditablePlan {
  return {
    id: plan.id,
    title: plan.title,
    strategy: plan.strategy,
    experience: plan.experience,
    ageMin: String(plan.ageMin),
    ageMax: String(plan.ageMax),
    daysPerWeek: String(plan.daysPerWeek),
    totalMinutes: String(plan.totalMinutes),
    equipment: plan.equipment.join(", "),
    workoutTypes: plan.workoutTypes.join(", "),
    constraintsToAvoid: plan.constraintsToAvoid.join(", "),
    summary: plan.summary,
    exercises: plan.exercises.map((exercise) =>
      emptyExercise({
        workoutType: exercise.workoutType,
        name: exercise.name,
        durationMinutes: exercise.durationMinutes != null ? String(exercise.durationMinutes) : "",
        distance: exercise.distance != null ? String(exercise.distance) : "",
        distanceUnit: exercise.distanceUnit ?? "km",
        sets: exercise.sets != null ? String(exercise.sets) : "",
        repsPerSet: exercise.repsPerSet != null ? String(exercise.repsPerSet) : "",
        weight: exercise.weight != null ? String(exercise.weight) : "",
        weightUnit: exercise.weightUnit ?? "kg",
      }),
    ),
  };
}

function parseExercise(row: EditableExercise, index: number): { exercise?: WorkoutPlanExercise; error?: string } {
  const label = `Exercise ${index + 1}`;
  if (!row.name.trim()) return { error: `${label}: enter an exercise name.` };

  const duration = row.durationMinutes ? Number(row.durationMinutes) : undefined;
  const distance = row.distance ? Number(row.distance) : undefined;
  const sets = row.sets ? Number(row.sets) : undefined;
  const repsPerSet = row.repsPerSet ? Number(row.repsPerSet) : undefined;
  const weight = row.weight ? Number(row.weight) : undefined;
  const invalid = [duration, distance, sets, repsPerSet, weight].some((value) => value !== undefined && (!Number.isFinite(value) || value < 0));
  if (invalid) return { error: `${label}: measurements must be valid non-negative numbers.` };

  if (row.workoutType === "Strength" && (!sets || !repsPerSet || weight == null)) {
    return { error: `${label}: Strength requires sets, reps, and weight.` };
  }
  if (row.workoutType === "Yoga" && !duration) return { error: `${label}: Yoga requires duration.` };
  if (["Cardio", "Swimming", "Cycling", "Running"].includes(row.workoutType) && (!duration || !distance)) {
    return { error: `${label}: ${row.workoutType} requires duration and distance.` };
  }
  if (row.workoutType === "HIIT" && (!duration || !sets || !repsPerSet || weight == null)) {
    return { error: `${label}: HIIT requires duration, sets, reps, and weight.` };
  }
  if (row.workoutType === "Other" && !duration && !distance && !sets && !repsPerSet && weight == null) {
    return { error: `${label}: add at least one measurement.` };
  }

  return {
    exercise: {
      workoutType: row.workoutType,
      name: row.name.trim(),
      ...(duration ? { durationMinutes: Math.round(duration) } : {}),
      ...(distance ? { distance, distanceUnit: row.distanceUnit } : {}),
      ...(sets ? { sets: Math.round(sets), repsPerSet: Math.round(repsPerSet ?? 0) } : {}),
      ...(weight != null ? { weight, weightUnit: row.weightUnit } : {}),
    },
  };
}

function toPayload(plan: EditablePlan): { payload?: WorkoutPlanPayload; error?: string } {
  if (!plan.title.trim()) return { error: "Enter a plan title." };
  const ageMin = Number(plan.ageMin);
  const ageMax = Number(plan.ageMax);
  const daysPerWeek = Number(plan.daysPerWeek);
  const totalMinutes = Number(plan.totalMinutes);
  if (!Number.isFinite(ageMin) || !Number.isFinite(ageMax) || ageMin < 0 || ageMax < ageMin) {
    return { error: "Enter a valid age range." };
  }
  if (!Number.isFinite(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
    return { error: "Workout days per week must be between 1 and 7." };
  }
  if (!Number.isFinite(totalMinutes) || totalMinutes < 1 || totalMinutes > 240) {
    return { error: "Total minutes must be between 1 and 240." };
  }
  const exercises: WorkoutPlanExercise[] = [];
  for (let index = 0; index < plan.exercises.length; index += 1) {
    const result = parseExercise(plan.exercises[index], index);
    if (result.error) return { error: result.error };
    if (result.exercise) exercises.push(result.exercise);
  }
  return {
    payload: {
      title: plan.title.trim(),
      strategy: plan.strategy,
      experience: plan.experience,
      ageMin,
      ageMax,
      daysPerWeek,
      totalMinutes,
      equipment: splitCsv(plan.equipment),
      workoutTypes: splitCsv(plan.workoutTypes),
      constraintsToAvoid: splitCsv(plan.constraintsToAvoid),
      summary: plan.summary.trim(),
      exercises,
    },
  };
}

function planStrategyToRecommendation(strategy: PlanStrategy): RecommendationStrategyName | undefined {
  if (strategy === "Strength") return "strength";
  if (strategy === "Cardio Endurance") return "cardio_endurance";
  if (strategy === "Weight Loss") return "weight_loss";
  return undefined;
}

function scorePlan(plan: WorkoutPlan, goals: {
  strategy: PlanStrategy;
  experience: ExperienceLevel;
  timeBudget: number;
  daysPerWeek: number;
  equipment: string[];
  injuries: string[];
  workoutTypes: string[];
  age?: number | null;
}) {
  let score = 0;
  if (plan.strategy === goals.strategy) score += 40;
  if (plan.experience.includes(goals.experience)) score += 20;
  if (goals.age == null || (goals.age >= plan.ageMin && goals.age <= plan.ageMax)) score += 15;
  if (plan.totalMinutes <= goals.timeBudget) score += 10;
  if (Math.abs(plan.daysPerWeek - goals.daysPerWeek) <= 1) score += 6;
  score += equipmentMatchScore(plan.equipment, goals.equipment);
  if (termsOverlap(plan.workoutTypes, goals.workoutTypes)) score += 5;
  if (termsOverlap(plan.constraintsToAvoid, goals.injuries)) score -= 30;
  return Math.max(0, Math.min(100, score));
}

function getMatchLabel(score: number) {
  if (score >= 75) return { label: "Best match", variant: "default" as const };
  if (score >= 50) return { label: "Good match", variant: "secondary" as const };
  return { label: "Poor match", variant: "outline" as const };
}

function planToWorkoutState(plan: WorkoutPlan): WorkoutPlanExerciseState[] {
  return plan.exercises.map((exercise) => ({
    ...exercise,
    durationMinutes: exercise.durationMinutes != null ? String(exercise.durationMinutes) : "",
    distance: exercise.distance != null ? String(exercise.distance) : "",
    sets: exercise.sets != null ? String(exercise.sets) : "",
    repsPerSet: exercise.repsPerSet != null ? String(exercise.repsPerSet) : "",
    weight: exercise.weight != null ? String(exercise.weight) : "",
    distanceUnit: exercise.distanceUnit ?? "km",
    weightUnit: exercise.weightUnit ?? "kg",
  }));
}

function PlanAdminView() {
  const queryClient = useQueryClient();
  const { planAdmin } = useAuth();
  const {
    data: plans = [],
    isLoading,
    error: plansError,
  } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: listAdminPlans,
    enabled: Boolean(planAdmin),
  });
  const [editing, setEditing] = useState<EditablePlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (plan: EditablePlan) => {
      const result = toPayload(plan);
      if (result.error || !result.payload) throw new Error(result.error ?? "Invalid plan.");
      return plan.id ? updateAdminPlan(plan.id, result.payload) : createAdminPlan(result.payload);
    },
    onSuccess: async (savedPlan) => {
      queryClient.setQueryData<WorkoutPlan[]>(["admin-plans"], (current = []) => {
        const withoutSaved = current.filter((plan) => plan.id !== savedPlan.id);
        return [savedPlan, ...withoutSaved];
      });
      await queryClient.invalidateQueries({ queryKey: ["public-plans"] });
      setEditing(null);
      setError(null);
      toast({ title: "Plan saved", description: "Your workout plan is available in Plans." });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Failed to save plan."),
  });

  const updateExercise = (index: number, field: keyof EditableExercise, value: string) => {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            exercises: prev.exercises.map((exercise, idx) => (idx === index ? { ...exercise, [field]: value } : exercise)),
          }
        : prev,
    );
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage plans created by {planAdmin?.email}.</p>
        </div>
        <Button className="gap-2" onClick={() => setEditing(emptyPlan())}>
          <Plus className="h-4 w-4" />
          Add Plan
        </Button>
      </div>

      {editing && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editing.id ? "Edit Plan" : "Add Plan"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plan Name</Label>
                <Input value={editing.title} placeholder="e.g. Calisthenics for beginners" onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Strategy</Label>
                <Select value={editing.strategy} onValueChange={(value) => setEditing({ ...editing, strategy: value as PlanStrategy })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STRATEGIES.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Age Min</Label>
                <Input type="number" min="0" value={editing.ageMin} onChange={(e) => setEditing({ ...editing, ageMin: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Age Max</Label>
                <Input type="number" min="0" value={editing.ageMax} onChange={(e) => setEditing({ ...editing, ageMax: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Total Minutes</Label>
                <Input type="number" min="1" value={editing.totalMinutes} onChange={(e) => setEditing({ ...editing, totalMinutes: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Days / Week</Label>
                <Input type="number" min="1" max="7" value={editing.daysPerWeek} onChange={(e) => setEditing({ ...editing, daysPerWeek: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Experience Level</Label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => {
                  const selected = editing.experience.includes(level);
                  return (
                    <Button
                      key={level}
                      type="button"
                      variant={selected ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          experience: selected
                            ? editing.experience.filter((item) => item !== level)
                            : [...editing.experience, level],
                        })
                      }
                    >
                      {level}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Equipment</Label>
                <Input placeholder="pull-up bar, mat" value={editing.equipment} onChange={(e) => setEditing({ ...editing, equipment: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Workout Types</Label>
                <Input placeholder="calisthenics, strength" value={editing.workoutTypes} onChange={(e) => setEditing({ ...editing, workoutTypes: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Constraints to Avoid</Label>
                <Input placeholder="knee, shoulder" value={editing.constraintsToAvoid} onChange={(e) => setEditing({ ...editing, constraintsToAvoid: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Summary</Label>
              <Input value={editing.summary} placeholder="Short plan description" onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Exercises</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditing({ ...editing, exercises: [...editing.exercises, emptyExercise()] })}>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Exercise
                </Button>
              </div>

              {editing.exercises.map((exercise, index) => {
                const showStrength = exercise.workoutType === "Strength" || exercise.workoutType === "HIIT" || exercise.workoutType === "Other";
                const showDistance = ["Cardio", "Swimming", "Cycling", "Running", "Other"].includes(exercise.workoutType);
                const showDuration = ["Cardio", "Yoga", "HIIT", "Swimming", "Cycling", "Running", "Other"].includes(exercise.workoutType);
                return (
                  <div key={index} className="rounded-lg border border-border/60 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Exercise {index + 1}</span>
                      {editing.exercises.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setEditing({ ...editing, exercises: editing.exercises.filter((_, idx) => idx !== index) })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Select value={exercise.workoutType} onValueChange={(value) => updateExercise(index, "workoutType", value as WorkoutType)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{WORKOUT_TYPES.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <Label className="text-xs">Exercise Name</Label>
                        <Input value={exercise.name} placeholder="e.g. Incline Push-Up" onChange={(e) => updateExercise(index, "name", e.target.value)} />
                      </div>
                    </div>
                    {(showDuration || showDistance) && (
                      <div className="grid gap-2 md:grid-cols-4">
                        {showDuration && (
                          <div className="space-y-1.5">
                            <Label className="text-xs">Duration (min)</Label>
                            <Input type="number" min="1" value={exercise.durationMinutes} onChange={(e) => updateExercise(index, "durationMinutes", e.target.value)} />
                          </div>
                        )}
                        {showDistance && (
                          <div className="space-y-1.5 md:col-span-2">
                            <Label className="text-xs">Distance</Label>
                            <div className="flex gap-2">
                              <Input type="number" min="0" value={exercise.distance} onChange={(e) => updateExercise(index, "distance", e.target.value)} />
                              <Select value={exercise.distanceUnit} onValueChange={(value) => updateExercise(index, "distanceUnit", value as "km" | "mi")}>
                                <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="km">km</SelectItem><SelectItem value="mi">mi</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {showStrength && (
                      <div className="grid gap-2 md:grid-cols-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Sets</Label>
                          <Input type="number" min="1" value={exercise.sets} onChange={(e) => updateExercise(index, "sets", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Reps</Label>
                          <Input type="number" min="1" value={exercise.repsPerSet} onChange={(e) => updateExercise(index, "repsPerSet", e.target.value)} />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs">Weight</Label>
                          <div className="flex gap-2">
                            <Input type="number" min="0" value={exercise.weight} onChange={(e) => updateExercise(index, "weight", e.target.value)} />
                            <Select value={exercise.weightUnit} onValueChange={(value) => updateExercise(index, "weightUnit", value as "kg" | "lb")}>
                              <SelectTrigger className="w-[88px]"><SelectValue /></SelectTrigger>
                              <SelectContent><SelectItem value="kg">kg</SelectItem><SelectItem value="lb">lb</SelectItem></SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button disabled={mutation.isPending} onClick={() => mutation.mutate(editing)}>
                {mutation.isPending ? "Saving..." : "Save Plan"}
              </Button>
              <Button variant="outline" onClick={() => { setEditing(null); setError(null); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading plans...</p>}
        {plansError && (
          <Card className="border-border/50 md:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm text-destructive">
                {plansError instanceof Error ? plansError.message : "Could not load your plans."}
              </p>
            </CardContent>
          </Card>
        )}
        {!isLoading && !plansError && plans.length === 0 && (
          <Card className="border-border/50 md:col-span-2">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">No plans created yet. Use Add Plan to create your first plan.</p>
            </CardContent>
          </Card>
        )}
        {plans.map((plan) => (
          <Card key={plan.id} className="border-border/50">
            <CardHeader className="space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.summary || "No summary provided."}</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditing(toEditablePlan(plan))}>
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{plan.strategy}</Badge>
                <Badge variant="outline">{plan.totalMinutes} min</Badge>
                <Badge variant="outline">{plan.daysPerWeek} days/week</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {plan.exercises.map((exercise, index) => (
                <div key={`${plan.id}-${exercise.name}`} className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-medium text-foreground">{index + 1}. {exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {exercise.workoutType}
                    {exercise.durationMinutes ? ` | ${exercise.durationMinutes} min` : ""}
                    {exercise.sets && exercise.repsPerSet ? ` | ${exercise.sets} x ${exercise.repsPerSet}` : ""}
                    {exercise.distance ? ` | ${exercise.distance} ${exercise.distanceUnit ?? "km"}` : ""}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UserPlansView() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useQuery({ queryKey: ["profile"], queryFn: getProfile });
  const { data: publicPlans = [] } = useQuery({ queryKey: ["public-plans"], queryFn: listPublicPlans });
  const [strategy, setStrategy] = useState<PlanStrategy>("Strength");
  const [experience, setExperience] = useState<ExperienceLevel>("Beginner");
  const [timeBudget, setTimeBudget] = useState("30");
  const [daysPerWeek, setDaysPerWeek] = useState("3");
  const [equipment, setEquipment] = useState("dumbbells, treadmill, mat");
  const [injuries, setInjuries] = useState("");
  const [workoutTypes, setWorkoutTypes] = useState("strength training, running, yoga");

  const allPlans = useMemo(() => [...BUILT_IN_PLANS, ...publicPlans], [publicPlans]);
  const goals = useMemo(
    () => ({
      strategy,
      experience,
      timeBudget: Math.max(10, Number(timeBudget) || 30),
      daysPerWeek: Math.max(1, Math.min(7, Number(daysPerWeek) || 3)),
      equipment: splitCsv(equipment),
      injuries: splitCsv(injuries),
      workoutTypes: splitCsv(workoutTypes),
      age: profile?.age,
    }),
    [daysPerWeek, equipment, experience, injuries, profile?.age, strategy, timeBudget, workoutTypes],
  );

  const matchedPlans = useMemo(
    () =>
      allPlans
        .map((plan) => ({ plan, score: scorePlan(plan, goals) }))
        .filter(({ score }) => score > 20)
        .sort((a, b) => b.score - a.score),
    [allPlans, goals],
  );

  const startPlan = (plan: WorkoutPlan) => {
    navigate("/log-workout", {
      state: {
        plan: {
          title: plan.title,
          strategy: planStrategyToRecommendation(plan.strategy),
          difficulty: experience,
          generatedFor: getLocalDateString(),
          exercises: planToWorkoutState(plan),
        },
      },
    });
  };

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your training goals and HealthSync will match pre-planned workouts you can start immediately.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Health Goals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGIES.map((option) => (
                  <Button key={option} type="button" variant={strategy === option ? "default" : "outline"} className="justify-start" onClick={() => setStrategy(option)}>
                    {strategy === option && <Check className="mr-2 h-3.5 w-3.5" />}
                    {option}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Experience Level</Label>
                <Select value={experience} onValueChange={(value) => setExperience(value as ExperienceLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPERIENCE_LEVELS.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Time Budget (minutes)</Label>
                <Input type="number" min="10" max="180" value={timeBudget} onChange={(e) => setTimeBudget(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Workout Days per Week</Label>
              <Input type="number" min="1" max="7" value={daysPerWeek} onChange={(e) => setDaysPerWeek(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Available Equipment</Label>
              <Input placeholder="treadmill, dumbbells, mat" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Injuries or Constraints</Label>
              <Input placeholder="knee, shoulder" value={injuries} onChange={(e) => setInjuries(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Workout Types</Label>
              <Input placeholder="running, cycling, yoga" value={workoutTypes} onChange={(e) => setWorkoutTypes(e.target.value)} />
            </div>

            <div className="rounded-lg border border-border/60 bg-secondary/30 p-3 text-sm">
              <p className="font-medium text-foreground">Profile</p>
              <p className="mt-1 text-muted-foreground">
                {profileLoading
                  ? "Loading profile..."
                  : `Age: ${profile?.age ?? "not set"} | Gender: ${profile?.gender ? GENDER_LABELS[profile.gender] : "not set"}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Matched Plans</h2>
            <p className="text-sm text-muted-foreground">{matchedPlans.length} plans fit your current goals.</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {matchedPlans.map(({ plan, score }) => (
              <Card key={plan.id} className="border-border/50">
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{plan.title}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
                    </div>
                    <Badge variant={getMatchLabel(score).variant}>{getMatchLabel(score).label}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{plan.strategy}</Badge>
                    <Badge variant="outline">{plan.totalMinutes} min</Badge>
                    <Badge variant="outline">{plan.daysPerWeek} days/week</Badge>
                    <Badge variant="outline">Ages {plan.ageMin}-{plan.ageMax}</Badge>
                    {plan.ownerEmail && <Badge variant="secondary">Trainer plan</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    {plan.exercises.map((exercise, idx) => (
                      <div key={`${plan.id}-${exercise.name}`} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{idx + 1}. {exercise.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {exercise.workoutType}
                              {exercise.durationMinutes ? ` | ${exercise.durationMinutes} min` : ""}
                              {exercise.sets && exercise.repsPerSet ? ` | ${exercise.sets} x ${exercise.repsPerSet}` : ""}
                              {exercise.distance ? ` | ${exercise.distance} ${exercise.distanceUnit ?? "km"}` : ""}
                            </p>
                          </div>
                          <Dumbbell className={cn("h-4 w-4 text-muted-foreground", exercise.workoutType === "Yoga" && "text-primary")} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full gap-2" onClick={() => startPlan(plan)}>
                    <CalendarDays className="h-4 w-4" />
                    Start this Plan
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {matchedPlans.length === 0 && (
            <Card className="border-border/50">
              <CardContent className="flex items-center gap-3 p-5">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="text-sm text-muted-foreground">No exact matches yet. Increase your time budget or remove a constraint to see more plans.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Plans() {
  const { planAdmin } = useAuth();

  useEffect(() => {
    document.title = planAdmin ? "HealthSync | PlanAdmin Plans" : "HealthSync | Plans";
  }, [planAdmin]);

  return planAdmin ? <PlanAdminView /> : <UserPlansView />;
}
