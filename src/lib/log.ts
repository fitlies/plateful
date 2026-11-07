import * as db from "./db";
import { addDays, dayKey, parseDay } from "./format";
import type { CustomFood, Entry, Food, Meal, Nutrients } from "./types";

const MEAL_TIME: Record<Meal, [number, number]> = { breakfast: [8, 0], lunch: [12, 30], dinner: [19, 0], snacks: [15, 30] };

/** The meal people usually mean right now. */
export function mealForNow(d = new Date()): Meal {
  const h = d.getHours() + d.getMinutes() / 60;
  if (h < 10.5) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 17) return "snacks";
  if (h < 21.5) return "dinner";
  return "snacks";
}

/** When an entry for `date`/`meal` is eaten: now if today, else the meal's usual time. */
export function defaultTime(date: string, meal: Meal): string {
  if (date === dayKey()) return new Date().toISOString();
  const d = parseDay(date);
  const [h, m] = MEAL_TIME[meal];
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

export async function addEntry(e: Omit<Entry, "id">): Promise<Entry> {
  const entry = { ...e, id: db.newId() };
  await db.put("entries", entry);
  return entry;
}

/** Log the same thing again, for another day or meal. */
export function relog(src: Entry, date: string, meal: Meal): Promise<Entry> {
  const { id: _id, ...rest } = src;
  return addEntry({ ...rest, date, meal, loggedAt: defaultTime(date, meal) });
}

export interface Usual {
  entry: Entry; // most recent use, carrying the usual amount
  count: number;
}

/** Foods most often logged at this meal over the last 6 weeks. */
export function usualFor(recent: Entry[], meal: Meal, today: string, limit = 3): Usual[] {
  const since = addDays(today, -42);
  const by = new Map<string, Usual>();
  for (const e of recent) {
    if (e.meal !== meal || e.date < since || e.date === today) continue;
    const k = e.foodKey === "quick" ? `quick:${e.name}:${e.nutrients.kcal}` : `${e.foodKey}|${e.amountLabel}`;
    const u = by.get(k);
    if (u) u.count++;
    else by.set(k, { entry: e, count: 1 });
  }
  return [...by.values()].filter((u) => u.count >= 1).sort((a, b) => b.count - a.count).slice(0, limit);
}

/** Recently logged distinct foods, newest first. */
export function recentFoods(recent: Entry[], limit = 25): Entry[] {
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const e of recent) {
    const k = e.foodKey === "quick" ? `quick:${e.name}:${e.nutrients.kcal}` : e.foodKey;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

export function customToFood(c: CustomFood): Food {
  return {
    key: `custom:${c.id}`,
    source: "custom",
    name: c.name,
    brand: c.brand,
    nutrients: c.nutrients,
    per100g: false,
    portions: [],
    servingLabel: c.servingLabel,
    servingGrams: c.servingGrams,
  };
}

/** A logged entry as a food of its own, for when its food was deleted: one serving is the amount that was logged. */
export function entryFood(e: Entry): Food {
  return { key: e.foodKey, source: e.source, name: e.name, brand: e.brand, nutrients: e.nutrients, per100g: false, portions: [], servingLabel: e.amountLabel, servingGrams: e.grams };
}

/** Save an Open Food Facts product as one of the user's foods so the next scan works offline. */
export async function saveScannedFood(food: Food, barcode: string): Promise<CustomFood> {
  const existing = await db.customFoodByBarcode(barcode);
  if (existing) return existing;
  const p = food.portions[0] ?? { label: "100 g", grams: 100 };
  const factor = p.grams / 100;
  const n = { ...food.nutrients } as Nutrients;
  for (const k of Object.keys(n) as (keyof Nutrients)[]) {
    const v = n[k];
    if (v != null) (n as unknown as Record<string, number>)[k] = Math.round(v * factor * 10) / 10;
  }
  n.kcal = Math.round(food.nutrients.kcal * factor);
  const c: CustomFood = {
    id: db.newId(),
    name: food.name,
    brand: food.brand,
    barcode,
    servingLabel: p.label,
    servingGrams: p.grams,
    nutrients: n,
    createdAt: new Date().toISOString(),
  };
  await db.put("customFoods", c);
  return c;
}
