// Reads CSV files exported from HPB's SG FoodID ("Export as CSV" on a food's page) into Plateful food rows.
// Nutrients are matched by name, not column position, so small layout changes don't break the import.

/** Minimal RFC 4180 CSV parser: quoted cells, doubled quotes, CRLF or LF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") row.push(cell), (cell = "");
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += c;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  return rows.map((r) => r.map((s) => s.trim()));
}

/** SG FoodID marks missing values as "-", "" or -1. */
const num = (s) => {
  const v = parseFloat(String(s ?? "").replace(/,/g, ""));
  return Number.isFinite(v) && v >= 0 ? v : null;
};

// Plateful nutrient slot -> test on the lower-cased nutrient label (works for "Saturated Fat (g)" and "saturatedFat").
const SLOTS = [
  ["kcal", (l) => l.startsWith("energy")],
  ["protein", (l) => l.startsWith("protein")],
  ["carbs", (l) => l.startsWith("carbohydrate") || l.startsWith("total carbohydrate")],
  ["fat", (l) => /^(total )?fat\b/.test(l)],
  ["fiber", (l) => /fib(re|er)/.test(l)],
  ["sugar", (l) => /^(total )?sugars?\b/.test(l)],
  ["sodium", (l) => l.startsWith("sodium")],
  ["satFat", (l) => /saturated ?fat/.test(l) && !/unsaturated/.test(l)],
  ["cholesterol", (l) => l.startsWith("cholesterol")],
  ["potassium", (l) => l.startsWith("potassium")],
];
export const NUTRIENT_ORDER = SLOTS.map(([k]) => k);

/** "1 piece(s) = 71g" -> { label: "1 piece", grams: 71 } */
export function parsePortion(s) {
  const m = /^(.*?)\s*=\s*([\d.]+)\s*(g|ml)\b/i.exec(String(s ?? "").trim());
  if (!m) return null;
  const grams = parseFloat(m[2]);
  if (!(grams > 0)) return null;
  return { label: m[1].replace(/\(s\)/g, "").replace(/\s+/g, " ").trim() || "1 serving", grams };
}

/** One single-food export -> { id, name, category, nutrients (per 100 g), portions, year, source } or an error. */
export function parseFoodExport(text) {
  const rows = parseCsv(text).filter((r) => r.some((c) => c));
  const meta = {};
  let table = -1;
  rows.forEach((r, i) => {
    if (table < 0 && /per 100/i.test(r[1] ?? "")) table = i;
    else if (table < 0 && r.length >= 2) meta[r[0].replace(/:$/, "").toLowerCase()] = r[1];
  });
  if (table < 0) return { error: "no 'Per 100g' nutrient table" };
  const name = meta["food name"] ?? meta["name"];
  if (!name) return { error: "no food name" };

  const per100 = Object.fromEntries(NUTRIENT_ORDER.map((k) => [k, null]));
  for (const r of rows.slice(table + 1)) {
    const label = (r[0] ?? "").toLowerCase();
    const slot = SLOTS.find(([, test]) => test(label));
    if (!slot || per100[slot[0]] != null) continue;
    let v = num(r[1]);
    if (slot[0] === "kcal" && v != null && /kj/.test(label)) v = v / 4.184;
    per100[slot[0]] = v == null ? null : Math.round(v * 10) / 10;
  }
  if (per100.kcal == null) return { error: `no energy value for ${name}` };
  per100.kcal = Math.round(per100.kcal);

  const portions = [];
  const def = parsePortion(meta["default serving size"]);
  if (def) portions.push(def);
  for (const alt of String(meta["alternative serving size(s)"] ?? meta["alternative serving size"] ?? "").split(/[;|\n]/)) {
    const p = parsePortion(alt);
    if (p && !portions.some((x) => x.label === p.label)) portions.push(p);
  }
  if (!portions.length) {
    const g = /per serving \(([\d.]+)\s*(g|ml)\)/i.exec(rows[table].join(","));
    portions.push(g ? { label: "1 serving", grams: parseFloat(g[1]) } : { label: "100 g", grams: 100 });
  }
  return {
    id: meta["crid"] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    category: meta["food subgroup"] || meta["food group"] || "Singapore foods",
    nutrients: per100,
    portions,
    year: meta["last updated"] ?? null,
    source: meta["source of data"] ?? null,
  };
}
