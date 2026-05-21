export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";
export type WorkoutType = "Strength" | "Cardio" | "Yoga" | "HIIT" | "Swimming" | "Cycling" | "Running" | "Other";
export type Intensity = "Low" | "Medium" | "High";
export type RecommendationStrategyName = "strength" | "cardio_endurance" | "weight_loss";
export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced";
export type PlanStrategy = "Strength" | "Cardio Endurance" | "Weight Loss" | "Flexibility";

export type MealItem = {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Meal = {
  id: string;
  mealType: MealType;
  date: string;
  time: string;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  items: MealItem[];
  createdAt?: string;
};

export type Workout = {
  id: string;
  workoutType: WorkoutType;
  date: string;
  exercises?: {
    workoutType: WorkoutType;
    name: string;
    durationMinutes?: number;
    caloriesBurned: number;
    notes?: string | null;
    distance?: number;
    distanceUnit?: "km" | "mi";
    sets?: number;
    repsPerSet?: number;
    weight?: number;
    weightUnit?: "kg" | "lb";
  }[];
  durationMinutes: number;
  intensity?: Intensity;
  caloriesBurned: number;
  notes?: string | null;
  recommendationContext?: {
    strategy: RecommendationStrategyName;
    difficulty?: ExperienceLevel | null;
    generatedFor?: string | null;
    title?: string | null;
    followedAsRecommended?: boolean;
  } | null;
  createdAt?: string;
};

export type DashboardSummary = {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  mealCount: number;
  workoutCount: number;
};

export type Goal = {
  id: string;
  dailyCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetWeightKg?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Gender = "Male" | "Female" | "Other" | "PreferNotToSay";

export type UserProfile = {
  id: string;
  fullName?: string | null;
  age?: number | null;
  gender?: Gender | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dietaryPreferences?: string[];
  allergies?: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WorkoutPreferences = {
  id: string;
  preferredStrategy?: RecommendationStrategyName | null;
  experienceLevel: ExperienceLevel;
  availableEquipment: string[];
  injuries: string[];
  avoidExercises: string[];
  preferredWorkoutTypes: string[];
  dailyTimeBudgetMinutes: number;
  workoutDaysPerWeek: number;
  preferLowImpact: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RecommendedExercise = {
  name: string;
  category: string;
  durationMinutes: number;
  intensity: Intensity;
  equipment: string[];
  instructions: string;
  sets?: number | null;
  reps?: number | null;
  restSeconds?: number | null;
};

export type WorkoutRecommendation = {
  strategy: RecommendationStrategyName;
  title: string;
  summary: string;
  rationale: string[];
  estimatedTotalMinutes: number;
  difficulty: ExperienceLevel;
  generatedFor: string;
  exercises: RecommendedExercise[];
};

export type WorkoutRecommendationBundle = {
  preferences: WorkoutPreferences;
  recommendation: WorkoutRecommendation;
};

export type WorkoutDayPlan = {
  date: string;
  label: string;
  focus: string;
  isRestDay: boolean;
  rationale: string[];
  recommendation?: WorkoutRecommendation | null;
};

export type WorkoutWeekPlan = {
  strategy: RecommendationStrategyName;
  generatedForWeekOf: string;
  difficulty: ExperienceLevel;
  weeklySummary: string;
  weeklyRationale: string[];
  scheduledDays: number;
  recoveryDays: number;
  days: WorkoutDayPlan[];
};

export type DailyProgressPoint = {
  date: string;
  caloriesConsumed: number;
  caloriesBurned: number;
  netCalories: number;
  macros: { calories: number; protein: number; carbs: number; fat: number };
  mealCount: number;
  workoutCount: number;
  workoutMinutes: number;
  mealItems: number;
};

export type DailyProgressResponse = {
  dateFrom: string;
  dateTo: string;
  points: DailyProgressPoint[];
  summary: {
    days: number;
    daysWithMeals: number;
    daysWithWorkouts: number;
    totals: {
      caloriesConsumed: number;
      caloriesBurned: number;
      netCalories: number;
      workoutMinutes: number;
      protein: number;
      carbs: number;
      fat: number;
      mealCount: number;
      workoutCount: number;
      mealItems: number;
    };
    averagesPerDay: {
      caloriesConsumed: number;
      caloriesBurned: number;
      netCalories: number;
      workoutMinutes: number;
    };
    mealsByType: Record<string, number>;
    workoutsByType: Record<string, number>;
  };
};

export type WorkoutPlanExercise = {
  workoutType: WorkoutType;
  name: string;
  durationMinutes?: number;
  distance?: number;
  distanceUnit?: "km" | "mi";
  sets?: number;
  repsPerSet?: number;
  weight?: number;
  weightUnit?: "kg" | "lb";
};

export type WorkoutPlan = {
  id: string;
  title: string;
  strategy: PlanStrategy;
  experience: ExperienceLevel[];
  ageMin: number;
  ageMax: number;
  daysPerWeek: number;
  totalMinutes: number;
  equipment: string[];
  workoutTypes: string[];
  constraintsToAvoid: string[];
  summary: string;
  exercises: WorkoutPlanExercise[];
  ownerEmail?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};
