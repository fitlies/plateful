// Loads the bundled USDA database and searches it offline.
import { dec } from "./format";
import type { Food, Nutrients, Portion } from "./types";

type Row = [number, string, number, string, ...(number | null)[]];
interface Payload {
  version: number;
  source: string;
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

export function loadFoods(): Promise<Indexed[]> {
  if (loading) return loading;
  loading = fetch(new URL("foods.json", document.baseURI))
    .then((r) => {
      if (!r.ok) throw new Error(`Food database failed to load (${r.status}).`);
      return r.json() as Promise<Payload>;
    })
    .then((p) =>
      p.foods.map((raw) => {
        const r = raw as Row;
        const [fdcId, name, cat, kind] = r;
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
          key: `usda:${fdcId}`,
          source: "usda",
          name,
          category: p.categories[cat],
          nutrients,
          per100g: true,
          portions: portions.length ? portions : [{ label: "100 g", grams: 100 }],
        };
        const lower = name.toLowerCase();
        return { food, lower, tokens: tokenize(lower), kind };
      }),
    )
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
    if (item.kind === "S") score += 0.4; // everyday "as eaten" dishes
    if (item.kind === "F") score += 0.3;
    if (/\b(raw|cooked|plain)\b/.test(item.lower)) score += 0.2;
    scored.push({ f: item.food, s: score });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.f);
}

export async function foodByKey(key: string): Promise<Food | undefined> {
  if (!key.startsWith("usda:")) return undefined;
  const all = await loadFoods();
  return all.find((x) => x.food.key === key)?.food;
}

/** Nutrient totals for `grams` of a per-100 g food, or `quantity` servings of a per-serving food. */
export function scale(n: Nutrients, factor: number): Nutrients {
  const out = { ...n };
  for (const k of Object.keys(out) as (keyof Nutrients)[]) {
    const v = out[k];
    if (v != null) (out as Record<string, number | null>)[k] = Math.round(v * factor * 10) / 10;
  }
  out.kcal = Math.round(n.kcal * factor);
  return out;
}

export function portionLabel(p: Portion): string {
  return /\bg\b|\boz\b/.test(p.label) ? p.label : `${p.label} (${Math.round(p.grams)} g)`;
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
