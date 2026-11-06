export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type Meal = (typeof MEALS)[number];
export const MEAL_LABEL: Record<Meal, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

/** Nutrient amounts. Grams unless noted; sodium, cholesterol and potassium in mg. */
export interface Nutrients {
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  satFat: number | null;
  cholesterol: number | null;
  potassium: number | null;
}
export const NUTRIENT_KEYS = [
  "kcal",
  "protein",
  "carbs",
  "fat",
  "fiber",
  "sugar",
  "sodium",
  "satFat",
  "cholesterol",
  "potassium",
] as const satisfies readonly (keyof Nutrients)[];

export type Portion = { label: string; grams: number };

export type FoodSource = "usda" | "sgfoodid" | "off" | "custom" | "quick";

/** A food that can be logged. Nutrients are per 100 g when `per100g` is true, else per one serving. */
export interface Food {
  key: string; // "usda:123", "off:5000159484695", "custom:abc"
  source: FoodSource;
  name: string;
  brand?: string;
  category?: string;
  nutrients: Nutrients;
  per100g: boolean;
  portions: Portion[]; // for per100g foods; first is the default
  servingLabel?: string; // for per-serving foods
  servingGrams?: number | null; // weight of one serving, when known
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD, local
  meal: Meal;
  foodKey: string;
  source: FoodSource;
  name: string;
  brand?: string;
  amountLabel: string; // e.g. "2 × 1 slice (28 g)" or "1 serving"
  quantity: number;
  unit: string; // "p0".. a portion index, "g" for grams, "serving", or "quick"
  grams: number | null;
  nutrients: Nutrients; // totals for this entry
  loggedAt: string; // ISO time the user ate it (editable)
}

export interface CustomFood {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  servingLabel: string;
  servingGrams: number | null;
  nutrients: Nutrients; // per one serving
  createdAt: string;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  name: string;
  minutes: number;
  kcal: number;
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export interface WaterDay {
  date: string;
  ml: number;
}

export type Sex = "female" | "male";
export type Activity = "sedentary" | "light" | "moderate" | "active" | "very";
export type Units = "metric" | "imperial";

export interface MacroSplit {
  protein: number; // percent of kcal
  carbs: number;
  fat: number;
}

export interface Profile {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  startWeightKg: number;
  goalWeightKg: number; // 0 when no goal weight is set
  activity: Activity;
  weeklyChangeKg: number; // negative to lose, positive to gain
  kcalGoal: number; // the daily food budget
  macros: MacroSplit;
  waterGoalMl: number;
  units: Units;
  netCarbs: boolean;
  mealSplit: Record<Meal, number> | null; // percent of the day's budget per meal, when meal targets are on
  setupDone: boolean;
}

export interface FastingWindow {
  id: string;
  start: string; // ISO
  end: string | null;
  targetHours: number;
}
