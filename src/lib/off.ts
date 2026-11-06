// Barcode lookups against Open Food Facts (https://world.openfoodfacts.org, data under ODbL).
// This is the only request Plateful makes to another server, and only when the user scans or types a barcode.
import type { Food, Nutrients } from "./types";

const FIELDS = "code,product_name,product_name_en,brands,serving_size,serving_quantity,nutriments";

type Nutriments = Record<string, number | string | undefined>;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

function per100(nm: Nutriments): Nutrients | null {
  let kcal = num(nm["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = num(nm["energy-kj_100g"]) ?? num(nm["energy_100g"]);
    if (kj != null) kcal = kj / 4.184;
  }
  if (kcal == null) return null;
  const sodiumG = num(nm["sodium_100g"]) ?? (num(nm["salt_100g"]) != null ? num(nm["salt_100g"])! / 2.5 : null);
  return {
    kcal: Math.round(kcal),
    protein: num(nm["proteins_100g"]),
    carbs: num(nm["carbohydrates_100g"]),
    fat: num(nm["fat_100g"]),
    fiber: num(nm["fiber_100g"]),
    sugar: num(nm["sugars_100g"]),
    sodium: sodiumG == null ? null : Math.round(sodiumG * 1000),
    satFat: num(nm["saturated-fat_100g"]),
    cholesterol: num(nm["cholesterol_100g"]) == null ? null : Math.round(num(nm["cholesterol_100g"])! * 1000),
    potassium: num(nm["potassium_100g"]) == null ? null : Math.round(num(nm["potassium_100g"])! * 1000),
  };
}

export type LookupResult =
  | { status: "found"; food: Food }
  | { status: "incomplete"; name: string; brand?: string }
  | { status: "not-found" }
  | { status: "offline" }
  | { status: "error"; message: string };

export function cleanBarcode(raw: string): string | null {
  const code = raw.replace(/\D/g, "");
  return code.length >= 8 && code.length <= 14 ? code : null;
}

export async function lookupBarcode(code: string): Promise<LookupResult> {
  if (!navigator.onLine) return { status: "offline" };
  let res: Response;
  try {
    res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
      signal: AbortSignal.timeout(10000),
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (e) {
    if ((e as Error).name === "TimeoutError") return { status: "error", message: "Open Food Facts took too long to answer. Try again." };
    return { status: "offline" };
  }
  if (res.status === 404) return { status: "not-found" };
  if (!res.ok) return { status: "error", message: `Open Food Facts answered ${res.status}. Try again in a minute.` };
  const body = (await res.json()) as { status?: number; product?: Record<string, unknown> };
  const p = body.product;
  if (!body.status || !p) return { status: "not-found" };
  const name = String(p.product_name_en || p.product_name || "").trim() || "Unnamed product";
  const brand = String(p.brands || "").split(",")[0].trim() || undefined;
  const n = per100((p.nutriments ?? {}) as Nutriments);
  if (!n) return { status: "incomplete", name, brand };
  const servingG = num(p.serving_quantity);
  const servingLabel = String(p.serving_size || "").trim();
  const portions = [];
  if (servingG && servingG > 0) portions.push({ label: servingLabel ? `1 serving (${servingLabel})` : "1 serving", grams: servingG });
  portions.push({ label: "100 g", grams: 100 });
  return {
    status: "found",
    food: { key: `off:${code}`, source: "off", name, brand, nutrients: n, per100g: true, portions },
  };
}
