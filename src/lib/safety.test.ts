// The places where a mistake hurts: a bad barcode reply, a bad backup file, the calorie floor, spreadsheet formulas, saved portions.
import { afterEach, describe, expect, it, vi } from "vitest";
import { csvCell, restoreBackup } from "./backup";
import { replaceAll } from "./db";
import { matchUnit } from "./foods";
import { planBudget } from "./nutrition";
import { lookupBarcode } from "./off";
import type { Food } from "./types";

vi.mock("./db", async (orig) => ({ ...(await orig<typeof import("./db")>()), replaceAll: vi.fn(async () => {}) }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(replaceAll).mockClear();
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
