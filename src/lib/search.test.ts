// Search over the real bundled lists (USDA plus Singapore dishes), as New food's auto-fill uses it.
import { beforeAll, describe, expect, it, vi } from "vitest";
import usda from "../../public/foods.json?raw";
import sg from "../../public/sg-foods.json?raw";
import { portionLabel, searchFoods } from "./foods";

beforeAll(() => {
  vi.stubGlobal("document", { baseURI: "https://plateful.test/" });
  vi.stubGlobal("fetch", async (u: URL) => ({ ok: true, json: async () => JSON.parse(u.pathname.endsWith("sg-foods.json") ? sg : usda) }));
});

const top = async (q: string) => (await searchFoods(q, 3)).map((f) => f.name);

describe("food search", () => {
  it("puts a plain egg first for 'eggs', not a dish that contains egg", async () => {
    expect((await top("eggs"))[0]).toBe("Egg, whole, raw");
  });

  it("finds Singapore dishes by their name", async () => {
    expect(await top("chicken rice")).toEqual(expect.arrayContaining(["Steamed chicken rice"]));
    expect((await top("kaya toast"))[0]).toBe("Kaya and butter toast");
    expect((await top("kopi"))[0]).toBe("Kopi");
  });

  it("doesn't add grams to a serving that already says ml", () => {
    expect(portionLabel({ label: "1 small cup (150ml)", grams: 150 })).toBe("1 small cup (150ml)");
    expect(portionLabel({ label: "1 cup", grams: 250 })).toBe("1 cup (250 g)");
  });
});
