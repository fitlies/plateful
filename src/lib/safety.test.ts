// The places where a mistake hurts: a bad barcode reply, a bad backup file, the calorie floor, spreadsheet formulas, saved portions.
import { afterEach, describe, expect, it, vi } from "vitest";
import { csvCell, restoreBackup } from "./backup";
import { customFoodByBarcode, put, replaceAll } from "./db";
import { matchUnit } from "./foods";
import { saveScannedFood } from "./log";
import { planBudget } from "./nutrition";
import { lookupBarcode } from "./off";
import type { Food } from "./types";

vi.mock("./db", async (orig) => ({
  ...(await orig<typeof import("./db")>()),
  replaceAll: vi.fn(async () => {}),
  put: vi.fn(async () => {}),
  customFoodByBarcode: vi.fn(async () => undefined),
  newId: () => "id-1",
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(replaceAll).mockClear();
  vi.mocked(put).mockClear();
});

describe("lookupBarcode with an unreadable reply", () => {
  it("returns an error result instead of throwing when a 200 is not JSON", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>Down for maintenance</html>", { status: 200 })));
    const r = await lookupBarcode("8888196173208");
    expect(r.status).toBe("error");
  });
});

const backup = (data: unknown) => new File([JSON.stringify({ format: "plateful-backup", version: 1, data })], "b.json");
const goodEntry = { id: "e1", date: "2026-11-24", loggedAt: "2026-11-24T08:00:00.000Z", nutrients: { kcal: 100 } };

describe("restoreBackup", () => {
  it("rejects an empty file, and leaves the stores alone", async () => {
    await expect(restoreBackup(backup({}))).rejects.toThrow(/empty/i);
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("restores a file that holds only a profile", async () => {
    await restoreBackup(backup({ settings: [{ key: "profile", value: {} }] }));
    expect(replaceAll).toHaveBeenCalledTimes(1);
  });

  it("rejects an entry that has no nutrients, and leaves the stores alone", async () => {
    await expect(restoreBackup(backup({ entries: [{ id: "x" }] }))).rejects.toThrow(/damaged/i);
    expect(replaceAll).not.toHaveBeenCalled();
  });

  it("restores a well-formed file", async () => {
    expect(await restoreBackup(backup({ entries: [goodEntry] }))).toEqual({ entries: 1 });
    expect(replaceAll).toHaveBeenCalledTimes(1);
  });
});

describe("planBudget", () => {
  it("never goes below the safe floor, and says so", () => {
    const p = { sex: "male" as const, heightCm: 170, birthYear: 1990, activity: "sedentary" as const, weeklyChangeKg: -0.75 };
    const r = planBudget(p, 60);
    expect(r.belowFloor).toBe(true);
    expect(r.budget).toBe(1500);
  });
});

describe("csvCell", () => {
  it("defuses a leading formula character from a stranger's product name", () => {
    expect(csvCell("=SUM(1)")).toBe("'=SUM(1)");
    expect(csvCell("+1")).toBe("'+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@x")).toBe("'@x");
  });
  it("quotes commas and quotes, and blanks null", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell(null)).toBe("");
  });
});

describe("saveScannedFood", () => {
  const nutrients = { kcal: 250, protein: 12.34, carbs: 30, fat: 10, fiber: null, sugar: 5, sodium: 1, satFat: 3.6, cholesterol: 100, potassium: 400 };
  const food = { key: "off:1", source: "off", name: "Snack", per100g: true, portions: [{ label: "1 pack", grams: 30 }], nutrients } as unknown as Food;

  it("stores one portion's worth: grams to 0.1, calories and milligrams to whole numbers, blanks left blank", async () => {
    const saved = await saveScannedFood(food, "8888196173208");
    expect(saved.servingLabel).toBe("1 pack");
    expect(saved.servingGrams).toBe(30);
    expect(saved.nutrients).toEqual({ kcal: 75, protein: 3.7, carbs: 9, fat: 3, fiber: null, sugar: 1.5, sodium: 0, satFat: 1.1, cholesterol: 30, potassium: 120 });
    expect(put).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledWith("customFoods", saved);
  });

  it("uses 100 g when the product has no portion", async () => {
    const saved = await saveScannedFood({ ...food, portions: [] }, "8888196173209");
    expect(saved.servingLabel).toBe("100 g");
    expect(saved.servingGrams).toBe(100);
    expect(saved.nutrients.kcal).toBe(250);
  });

  it("returns the food already saved for that barcode and writes nothing", async () => {
    const existing = { id: "old", name: "Snack", barcode: "8888196173210" };
    vi.mocked(customFoodByBarcode).mockResolvedValueOnce(existing as never);
    expect(await saveScannedFood(food, "8888196173210")).toBe(existing);
    expect(put).not.toHaveBeenCalled();
  });
});

describe("matchUnit", () => {
  const food = (portions: { label: string; grams: number }[]) => ({ key: "usda:1", source: "usda", name: "Rice", per100g: true, portions, nutrients: {} }) as unknown as Food;
  const entry = { unit: "p1", quantity: 2, grams: 200 }; // saved as 2 × a 100 g portion

  it("keeps the unit when the portion at that index still fits the saved grams", () => {
    const f = food([{ label: "1 bowl", grams: 50 }, { label: "1 cup", grams: 100 }]);
    expect(matchUnit(f, entry)).toEqual({ unit: "p1", quantity: 2 });
  });
  it("follows the portion to its new index after a rebuild reorders them", () => {
    const f = food([{ label: "1 cup", grams: 100 }, { label: "1 bowl", grams: 50 }]);
    expect(matchUnit(f, entry)).toEqual({ unit: "p0", quantity: 2 });
  });
  it("falls back to grams when the portion is gone", () => {
    const f = food([{ label: "1 bowl", grams: 50 }, { label: "1 plate", grams: 300 }]);
    expect(matchUnit(f, entry)).toEqual({ unit: "g", quantity: 200 });
  });
  it("leaves grams and serving entries alone", () => {
    const f = food([{ label: "1 cup", grams: 100 }]);
    expect(matchUnit(f, { unit: "g", quantity: 150, grams: 150 })).toEqual({ unit: "g", quantity: 150 });
  });
});
