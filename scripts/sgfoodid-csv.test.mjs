import { describe, expect, it } from "vitest";
import { parseCsv, parseFoodExport, parsePortion } from "./sgfoodid-csv.mjs";

// Shaped like SG FoodID's per-food "Export as CSV" (values from its Plain prata entry).
const PRATA = [
  'Food Name,"Plain prata"',
  'Description,"Layered unleavened Indian pan-fried bread, cooked on hot plate, with ghee"',
  'Food Group,"Grains and staples"',
  'Food Subgroup,"Breads and flatbreads"',
  'Default Serving Size,"1 piece(s) = 71g"',
  'Alternative Serving Size(s),"-"',
  'Source of Data,"Lab Analysis"',
  'Last Updated,"2025"',
  "",
  ",Per 100g,Per Serving (71g)",
  "Energy (kcal),347,246",
  "Protein (g),8.88,6.3",
  "Total Fat (g),12,8.52",
  "Saturated Fat (g),5.12,3.64",
  "Polyunsaturated Fat (g),1.65,1.17",
  "Carbohydrate (g),49.92,35.44",
  "Sugar (g),3.9,2.77",
  "Added Sugar (g),-,-",
  "Dietary Fibre (g),2.14,1.52",
  "Sodium (mg),571,405",
  "Potassium (mg),99,70",
  "Cholesterol (mg),-1,-1",
].join("\r\n");

describe("SG FoodID CSV import", () => {
  it("reads quoted cells with commas and doubled quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3')).toEqual([["a", "b, c", 'say "hi"'], ["1", "2", "3"]]);
  });

  it("parses portions like '1 piece(s) = 71g'", () => {
    expect(parsePortion("1 piece(s) = 71g")).toEqual({ label: "1 piece", grams: 71 });
    expect(parsePortion("1 bowl = 650 g")).toEqual({ label: "1 bowl", grams: 650 });
    expect(parsePortion("-")).toBeNull();
  });

  it("turns a single-food export into a per-100 g food with its serving", () => {
    const f = parseFoodExport(PRATA);
    expect(f.name).toBe("Plain prata");
    expect(f.category).toBe("Breads and flatbreads");
    expect(f.portions).toEqual([{ label: "1 piece", grams: 71 }]);
    expect(f.nutrients).toEqual({
      kcal: 347, protein: 8.9, carbs: 49.9, fat: 12, fiber: 2.1, sugar: 3.9,
      sodium: 571, satFat: 5.1, cholesterol: null, potassium: 99,
    });
  });

  it("rejects a file that isn't a food export", () => {
    expect(parseFoodExport("Recipe Name,Kaya toast\nNo. of servings,1").error).toMatch(/Per 100g/);
  });
});
