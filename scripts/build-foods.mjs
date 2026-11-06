// Builds public/foods.json from the USDA FoodData Central JSON downloads in .data-raw/.
// Usage: node scripts/build-foods.mjs
// Source data is public domain (USDA FoodData Central, https://fdc.nal.usda.gov/).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";

const RAW = new URL("../.data-raw/", import.meta.url);
const OUT = new URL("../public/foods.json", import.meta.url);

const SOURCES = [
  ["FoodData_Central_foundation_food_json_2026-10-29.json", "FoundationFoods", "F"],
  ["surveyDownload.json", "SurveyFoods", "S"],
  ["FoodData_Central_sr_legacy_food_json_2018-04.json", "SRLegacyFoods", "R"],
];

// Nutrient numbers -> output slot. Values are per 100 g.
const SLOTS = {
  kcal: ["208", "957", "958"], // Energy (kcal); Foundation foods may only have Atwater values
  protein: ["203"],
  carbs: ["205"],
  fat: ["204"],
  fiber: ["291"],
  sugar: ["269", "2000"],
  sodium: ["307"], // mg
  satFat: ["606"],
  cholesterol: ["601"], // mg
  potassium: ["306"], // mg
};
const ORDER = Object.keys(SLOTS);

const round = (v) => (v == null ? null : Math.round(v * 10) / 10);
const clean = (s) => s.replace(/\s+/g, " ").trim();

function nutrients(food) {
  const byNum = new Map();
  for (const n of food.foodNutrients ?? []) {
    const num = n.nutrient?.number;
    if (num && typeof n.amount === "number" && !byNum.has(num)) byNum.set(num, n.amount);
  }
  return ORDER.map((slot) => {
    for (const num of SLOTS[slot]) if (byNum.has(num)) return round(byNum.get(num));
    return null;
  });
}

function portions(food, kind) {
  const out = [];
  const seen = new Set();
  for (const p of food.foodPortions ?? []) {
    const g = p.gramWeight;
    if (!g || g <= 0) continue;
    let label;
    if (kind === "S") {
      label = p.portionDescription;
      if (!label || /not specified/i.test(label)) continue;
    } else {
      const unit = p.measureUnit?.name;
      if (unit === "RACC") continue;
      const amt = p.amount ?? 1;
      const parts = [amt, unit && unit !== "undetermined" ? unit : "", p.modifier && !/^\d+$/.test(p.modifier) ? p.modifier : ""];
      label = clean(parts.filter((x) => x !== "" && x != null).join(" "));
      if (!label || label === String(amt)) label = p.portionDescription || `${amt} serving`;
    }
    label = clean(label);
    if (seen.has(label)) continue;
    seen.add(label);
    out.push([label, round(g)]);
    if (out.length >= 6) break;
  }
  return out;
}

const categories = [];
const catIndex = new Map();
const cat = (name) => {
  if (!catIndex.has(name)) {
    catIndex.set(name, categories.length);
    categories.push(name);
  }
  return catIndex.get(name);
};

const foods = [];
const seenNames = new Set();
for (const [file, key, kind] of SOURCES) {
  const data = JSON.parse(readFileSync(new URL(file, RAW), "utf8"))[key];
  let kept = 0;
  for (const f of data) {
    const name = clean(f.description ?? "");
    const n = nutrients(f);
    if (!name || n[0] == null) continue; // need a calorie value
    const lower = name.toLowerCase();
    if (seenNames.has(lower)) continue;
    seenNames.add(lower);
    const category = f.foodCategory?.description ?? f.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? "Other";
    foods.push([f.fdcId, name, cat(clean(category)), kind, ...n, portions(f, kind)]);
    kept++;
  }
  console.log(`${key}: kept ${kept} of ${data.length}`);
}

const payload = {
  version: 1,
  source: "USDA FoodData Central (public domain): Foundation Foods 2026-10, FNDDS survey foods 2024-10, SR Legacy 2018-04",
  fields: ["fdcId", "name", "category", "kind", ...ORDER, "portions"],
  units: "per 100 g; sodium, cholesterol, potassium in mg; others in g; energy in kcal",
  categories,
  foods,
};
mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
const json = JSON.stringify(payload);
writeFileSync(OUT, json);
console.log(`wrote ${foods.length} foods, ${(json.length / 1e6).toFixed(2)} MB (${(gzipSync(json).length / 1e6).toFixed(2)} MB gzipped)`);
