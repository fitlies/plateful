// The numbers every diary entry is built from: amounts → nutrients, and Open Food Facts → per-100 g values.
import { afterEach, describe, expect, it, vi } from "vitest";
import { amount, scale } from "./foods";
import { lookupBarcode } from "./off";
import type { Food } from "./types";

const bread: Food = {
  key: "usda:1", source: "usda", name: "Bread, whole-wheat", per100g: true,
  portions: [{ label: "1 slice", grams: 28 }],
  nutrients: { kcal: 298, protein: 12.5, carbs: 54, fat: 4, fiber: 7, sugar: 6, sodium: 450, satFat: 1, cholesterol: 0, potassium: 250 },
};
const kopi: Food = {
  key: "custom:k", source: "custom", name: "Kopi C", per100g: false, portions: [], servingLabel: "1 cup", servingGrams: 250,
  nutrients: { kcal: 90, protein: 1, carbs: 14, fat: 3, fiber: null, sugar: null, sodium: null, satFat: null, cholesterol: null, potassium: null },
};

describe("amount and scale", () => {
  it("counts portions of a per-100 g food", () => {
    const a = amount(bread, "p0", 2);
    expect(a.grams).toBe(56);
    expect(a.label).toBe("2 × 1 slice (28 g)");
    expect(scale(bread.nutrients, a.factor)).toMatchObject({ kcal: 167, protein: 7, sodium: 252 });
  });

  it("counts grams of a per-100 g food", () => {
    const a = amount(bread, "g", 150);
    expect(a.label).toBe("150 g");
    expect(scale(bread.nutrients, a.factor).kcal).toBe(447);
  });

  it("counts servings and grams of a per-serving food, keeping unknowns unknown", () => {
    expect(amount(kopi, "serving", 1)).toEqual({ factor: 1, grams: 250, label: "1 cup" });
    const half = amount(kopi, "g", 125);
    expect(scale(kopi.nutrients, half.factor)).toMatchObject({ kcal: 45, fat: 1.5, sugar: null });
  });
});

describe("lookupBarcode", () => {
  afterEach(() => vi.unstubAllGlobals());
  const reply = (status: number, body: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status })));

  it("converts kJ-only energy and salt to kcal and sodium, and offers the pack serving", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    reply(200, {
      status: 1,
      product: { product_name: "Oat bar", brands: "Acme, Other", serving_quantity: "30", serving_size: "30 g", nutriments: { "energy-kj_100g": 1000, salt_100g: 1.25, proteins_100g: 5 } },
    });
    const r = await lookupBarcode("8888196173208");
    if (r.status !== "found") throw new Error(`expected found, got ${r.status}`);
    expect(r.food.brand).toBe("Acme");
    expect(r.food.nutrients).toMatchObject({ kcal: 239, sodium: 500, protein: 5, fat: null });
    expect(r.food.portions[0]).toEqual({ label: "1 serving (30 g)", grams: 30 });
  });

  it("reports a missing product and a product without nutrition", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    reply(404, {});
    expect((await lookupBarcode("00000000")).status).toBe("not-found");
    reply(200, { status: 1, product: { product_name: "Mystery", nutriments: {} } });
    expect(await lookupBarcode("00000001")).toEqual({ status: "incomplete", name: "Mystery", brand: undefined });
  });
});
