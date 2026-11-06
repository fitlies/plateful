// Loads the bundled food lists (USDA, plus Singapore dishes from SG FoodID) and searches them offline.
import { dec } from "./format";
import type { Food, FoodSource, Nutrients, Portion } from "./types";

type Row = [number | string, string, number, string, ...(number | null)[]];
interface Payload {
  version: number;
  source: string;
  accessed?: string | null;
  categories: string[];
  foods: unknown[][];
}

interface Indexed {
  food: Food;
  tokens: string[];
  lower: string;
  kind: string;
}

let loading: Promise<Indexed[]> | null = null;
/** When the Singapore list was exported from SG FoodID, for the credit its licence requires. */
export let sgInfo: { count: number; accessed: string | null } = { count: 0, accessed: null };

async function fetchPayload(file: string, required: boolean): Promise<Payload | null> {
  const r = await fetch(new URL(file, document.baseURI));
  if (r.ok) return r.json() as Promise<Payload>;
  if (required) throw new Error(`Food database failed to load (${r.status}).`);
  return null;
}

function index(p: Payload, prefix: string, source: FoodSource): Indexed[] {
  return p.foods.map((raw) => {
    const r = raw as Row;
    const [id, name, cat, kind] = r;
    const n = r.slice(4, 14) as (number | null)[];
    const portions = (r[14] as unknown as [string, number][]).map(([label, grams]) => ({ label, grams }));
    const nutrients: Nutrients = {
      kcal: n[0] ?? 0,
      protein: n[1],
      carbs: n[2],
      fat: n[3],
      fiber: n[4],
      sugar: n[5],
      sodium: n[6],
      satFat: n[7],
      cholesterol: n[8],
      potassium: n[9],
    };
    const food: Food = {
      key: `${prefix}:${id}`,
      source,
      name,
      category: p.categories[cat],
      nutrients,
      per100g: true,
      portions: portions.length ? portions : [{ label: "100 g", grams: 100 }],
    };
    const lower = name.toLowerCase();
    return { food, lower, tokens: tokenize(lower), kind };
  });
}

export function loadFoods(): Promise<Indexed[]> {
  if (loading) return loading;
  loading = Promise.all([fetchPayload("foods.json", true), fetchPayload("sg-foods.json", false)])
    .then(([usda, sg]) => {
      sgInfo = { count: sg?.foods.length ?? 0, accessed: sg?.accessed ?? null };
      return [...(sg ? index(sg, "sg", "sgfoodid") : []), ...index(usda!, "usda", "usda")];
    })
    .catch((e) => {
      loading = null;
      throw e;
    });
  return loading;
}

export function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Rank foods where every query word matches the start of a word in the name. */
export async function searchFoods(query: string, limit = 40): Promise<Food[]> {
  const q = tokenize(query);
  if (!q.length) return [];
  const all = await loadFoods();
  const scored: { f: Food; s: number }[] = [];
  for (const item of all) {
    let score = 0;
    let ok = true;
    for (const qt of q) {
      let best = 0;
      for (let i = 0; i < item.tokens.length; i++) {
        const t = item.tokens[i];
        let s = 0;
        if (t === qt || t === qt + "s" || t + "s" === qt) s = 3;
        else if (t.startsWith(qt)) s = 2;
        if (s && i === 0) s += 1.5; // matches the leading word: "Rice, white" for "rice"
        if (s > best) best = s;
      }
      if (!best && qt.length >= 4 && item.lower.includes(qt)) best = 0.5;
      if (!best) {
        ok = false;
        break;
      }
      score += best;
    }
    if (!ok) continue;
    score -= item.tokens.length * 0.12; // prefer short, generic names
    if (item.kind === "G") score += 0.4; // Singapore dishes, without beating a plain "Egg" for "eggs"
    // The typed words in order, as whole words: "chicken rice" finds "Steamed chicken rice".
    if (q.length > 1 && ` ${item.tokens.join(" ")} `.includes(` ${q.join(" ")} `)) score += 1.5;
    if (item.kind === "S") score += 0.4; // everyday "as eaten" dishes
    if (item.kind === "F") score += 0.3;
    if (/\b(raw|cooked|plain)\b/.test(item.lower)) score += 0.2;
    scored.push({ f: item.food, s: score });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.f);
}

export async function foodByKey(key: string): Promise<Food | undefined> {
  if (!key.startsWith("usda:") && !key.startsWith("sg:")) return undefined;
  const all = await loadFoods();
  return all.find((x) => x.food.key === key)?.food;
}

/** Nutrient totals for `grams` of a per-100 g food, or `quantity` servings of a per-serving food. Blank values stay blank. */
export function scale<N extends Record<keyof Nutrients, number | null>>(n: N, factor: number): N {
  const out = { ...n };
  for (const k of Object.keys(out) as (keyof Nutrients)[]) {
    const v = out[k];
    if (v != null) (out as Record<string, number | null>)[k] = k === "kcal" ? Math.round(v * factor) : Math.round(v * factor * 10) / 10;
  }
  return out;
}

/** Choices for how many servings a saved food is. */
export const SERVINGS = [0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** 1.5 -> "1½", 0.25 -> "¼". */
export function fraction(q: number): string {
  const whole = Math.floor(q);
  const part = ({ 0.25: "¼", 0.5: "½", 0.75: "¾" } as Record<number, string>)[q - whole];
  return part ? `${whole || ""}${part}` : dec(q);
}

/** "1 piece (94 g)" -> "piece": the unit a serving is counted in. Amounts like "100 g" stay whole. */
export function servingUnit(label: string): string {
  return label.replace(/\s*\([^)]*\bg\)$/, "").replace(/^1\s+(?=\D)/, "");
}

/** 2 × "plate" -> "2 plates"; 2 × "100 g" -> "2 × 100 g". */
export function servingLabel(qty: number, unit: string): string {
  const u = unit.trim() || "serving";
  if (/^\d/.test(u)) return qty === 1 ? u : `${fraction(qty)} × ${u}`;
  if (qty <= 1) return `${fraction(qty)} ${u}`;
  // Pluralise the counted word: "small cup (150ml)" -> "small cups (150ml)", "slice of bread" -> "slices of bread".
  return `${fraction(qty)} ${u.replace(/^([^(,]*?)([a-z]+)(?=\s*[(,]|\s+of\b|$)/i, (_, pre: string, w: string) =>
    pre + (/^(whole|half|oz|g|kg|ml|l|lb|tbsp|tsp)$/i.test(w) || /[^s]s$/i.test(w) ? w
      : /(ss|x|ch|sh)$/i.test(w) ? `${w}es` : /[^aeiou]y$/i.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`))}`;
}

export function portionLabel(p: Portion): string {
  return /\bg\b|\boz\b|\dml\b/.test(p.label) ? p.label : `${p.label} (${Math.round(p.grams)} g)`;
}

/** How much of a food an amount means: the nutrient factor, the grams (when known) and a label. */
export function amount(f: Food, unit: string, qty: number): { factor: number; grams: number | null; label: string } {
  const times = (label: string) => (qty === 1 ? label : `${dec(qty)} × ${label}`);
  if (f.per100g) {
    if (unit === "g") return { factor: qty / 100, grams: qty, label: `${dec(qty)} g` };
    const p = f.portions[Number(unit.slice(1))] ?? f.portions[0];
    return { factor: (qty * p.grams) / 100, grams: qty * p.grams, label: times(portionLabel(p)) };
  }
  if (unit === "g" && f.servingGrams) return { factor: qty / f.servingGrams, grams: qty, label: `${dec(qty)} g` };
  return { factor: qty, grams: f.servingGrams ? f.servingGrams * qty : null, label: times(f.servingLabel || "serving") };
}
