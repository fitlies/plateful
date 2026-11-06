// Builds public/sg-foods.json from SG FoodID CSV exports placed in data/sgfoodid/.
// Usage: npm run sgfoods
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { NUTRIENT_ORDER, parseFoodExport } from "./sgfoodid-csv.mjs";

const DIR = new URL("../data/sgfoodid/", import.meta.url);
const OUT = new URL("../public/sg-foods.json", import.meta.url);

const files = readdirSync(DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort();
const byId = new Map();
let accessed = null;
let failed = 0;
for (const file of files) {
  const f = parseFoodExport(readFileSync(new URL(file, DIR), "utf8"));
  if (f.error) {
    failed++;
    console.warn(`skipped ${file}: ${f.error}`);
    continue;
  }
  byId.set(f.id, f);
  // SG FoodID names exports <food>_<DDMMYYYY>.csv; fall back to the file's date.
  const m = /_(\d{2})(\d{2})(\d{4})\.csv$/i.exec(file);
  const day = m ? `${m[3]}-${m[2]}-${m[1]}` : statSync(new URL(file, DIR)).mtime.toISOString().slice(0, 10);
  if (!accessed || day > accessed) accessed = day;
}

const foods = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
const categories = [...new Set(foods.map((f) => f.category))];
const payload = {
  version: 1,
  source: "Singapore Food Insights Database (SG FoodID), Health Promotion Board",
  terms: "https://go.gov.sg/termsofuse-hpbsgfoodid",
  accessed,
  fields: ["id", "name", "category", "kind", ...NUTRIENT_ORDER, "portions"],
  units: "per 100 g; sodium, cholesterol, potassium in mg; others in g; energy in kcal",
  categories,
  foods: foods.map((f) => [f.id, f.name, categories.indexOf(f.category), "G", ...NUTRIENT_ORDER.map((k) => f.nutrients[k]), f.portions.map((p) => [p.label, p.grams])]),
};
writeFileSync(OUT, JSON.stringify(payload));
console.log(`wrote ${foods.length} Singapore foods from ${files.length} files${failed ? `, ${failed} skipped` : ""}${accessed ? `, accessed ${accessed}` : ""}`);
