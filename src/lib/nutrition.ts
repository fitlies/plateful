import type { Activity, Entry, MacroSplit, Nutrients, Profile, Sex } from "./types";
import { NUTRIENT_KEYS } from "./types";

export const ACTIVITY: Record<Activity, { label: string; detail: string; factor: number }> = {
  sedentary: { label: "Mostly sitting", detail: "Desk job, little walking", factor: 1.2 },
  light: { label: "Lightly active", detail: "On your feet some of the day", factor: 1.375 },
  moderate: { label: "Active", detail: "Walk a lot or exercise 3–5 days a week", factor: 1.55 },
  active: { label: "Very active", detail: "Physical job or hard training most days", factor: 1.725 },
  very: { label: "Athlete", detail: "Twice-a-day training or heavy labour", factor: 1.9 },
};

export const KCAL_PER_KG = 7700;

/** Mifflin–St Jeor resting energy. */
export function bmr(sex: Sex, kg: number, cm: number, age: number): number {
  return 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
}

export function tdee(p: Pick<Profile, "sex" | "heightCm" | "birthYear" | "activity">, kg: number): number {
  const age = new Date().getFullYear() - p.birthYear;
  return bmr(p.sex, kg, p.heightCm, age) * ACTIVITY[p.activity].factor;
}

export interface GoalPlan {
  maintenance: number;
  budget: number;
  floor: number;
  belowFloor: boolean;
}

/** Daily food budget for a weekly weight change, never silently below a safe floor. */
export function planBudget(p: Pick<Profile, "sex" | "heightCm" | "birthYear" | "activity" | "weeklyChangeKg">, kg: number): GoalPlan {
  const maintenance = Math.round(tdee(p, kg));
  const raw = maintenance + (p.weeklyChangeKg * KCAL_PER_KG) / 7;
  const floor = p.sex === "male" ? 1500 : 1200;
  const budget = Math.round(Math.max(raw, floor) / 10) * 10;
  return { maintenance, budget, floor, belowFloor: raw < floor };
}

export const DEFAULT_MACROS: MacroSplit = { protein: 25, carbs: 45, fat: 30 };

export function macroGrams(kcal: number, m: MacroSplit) {
  return {
    protein: Math.round((kcal * m.protein) / 100 / 4),
    carbs: Math.round((kcal * m.carbs) / 100 / 4),
    fat: Math.round((kcal * m.fat) / 100 / 9),
  };
}

export const EMPTY: Nutrients = {
  kcal: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
  sugar: 0,
  sodium: 0,
  satFat: 0,
  cholesterol: 0,
  potassium: 0,
};

/** Sum nutrients; unknown values count as 0. */
export function sum(list: Nutrients[]): Nutrients {
  const out: Nutrients = { ...EMPTY };
  for (const n of list) for (const k of NUTRIENT_KEYS) out[k] = (out[k] ?? 0) + (n[k] ?? 0);
  return out;
}

export function totals(entries: Entry[]) {
  return sum(entries.map((e) => e.nutrients));
}

export function netCarbs(n: Nutrients): number | null {
  if (n.carbs == null) return null;
  return Math.max(0, n.carbs - (n.fiber ?? 0));
}

/** Common activities with MET values (Compendium of Physical Activities, rounded). */
export const ACTIVITIES: { name: string; met: number }[] = [
  { name: "Walking, casual", met: 3.5 },
  { name: "Walking, brisk", met: 4.3 },
  { name: "Running, 8 km/h", met: 8.3 },
  { name: "Running, 10 km/h", met: 9.8 },
  { name: "Cycling, leisure", met: 5.8 },
  { name: "Cycling, fast", met: 8 },
  { name: "Swimming laps", met: 6 },
  { name: "Weight training", met: 5 },
  { name: "HIIT / circuit", met: 8 },
  { name: "Yoga", met: 2.5 },
  { name: "Pilates", met: 3 },
  { name: "Badminton", met: 5.5 },
  { name: "Football", met: 7 },
  { name: "Basketball", met: 6.5 },
  { name: "Hiking", met: 6 },
  { name: "Dancing", met: 5 },
  { name: "Stair climbing", met: 8.8 },
  { name: "Housework", met: 3.3 },
];

export function exerciseKcal(met: number, kg: number, minutes: number): number {
  return Math.round(met * kg * (minutes / 60));
}
