import { useEffect, useState } from "preact/hooks";
import * as db from "../lib/db";
import { portionLabel, scale, searchFoods } from "../lib/foods";
import { int } from "../lib/format";
import type { CustomFood as CF, Food, Meal } from "../lib/types";
import { Confirm, Dock, NumField, TopBar } from "../ui/common";
import { IconTrash } from "../ui/icons";
import { back, go } from "../ui/router";
import { toast } from "../ui/toast";

/** Create or edit one of the user's own foods (nutrition per serving, as printed on the pack). */
export function CustomFood(props: { id?: string; date?: string; meal?: Meal; barcode?: string; name?: string; brand?: string }) {
  const [existing, setExisting] = useState<CF | null>(null);
  const [name, setName] = useState(props.name ?? "");
  const [brand, setBrand] = useState(props.brand ?? "");
  const [serving, setServing] = useState("1 serving");
  const [grams, setGrams] = useState<number | null>(null);
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [fiber, setFiber] = useState<number | null>(null);
  const [sugar, setSugar] = useState<number | null>(null);
  const [sodium, setSodium] = useState<number | null>(null);
  const [barcode, setBarcode] = useState(props.barcode ?? "");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [matches, setMatches] = useState<Food[]>([]);
  const [filledFrom, setFilledFrom] = useState<Food | null>(null);

  // Suggest matching foods while a new food's name is typed; picking one fills in its nutrition.
  useEffect(() => {
    const q = name.trim();
    if (props.id || q.length < 3) return setMatches([]);
    let live = true;
    const t = setTimeout(() => searchFoods(q, 5).then((r) => live && setMatches(r), () => {}), 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [name]);

  const fill = (f: Food) => {
    const p = f.portions[0];
    const n = scale(f.nutrients, p.grams / 100);
    setServing(p.label.replace(/\s*\([^)]*\bg\)$/, ""));
    setGrams(Math.round(p.grams));
    setKcal(n.kcal);
    setProtein(n.protein);
    setCarbs(n.carbs);
    setFat(n.fat);
    setFiber(n.fiber);
    setSugar(n.sugar);
    setSodium(n.sodium);
    setFilledFrom(f);
    setMatches([]);
  };

  useEffect(() => {
    if (!props.id) return;
    db.get("customFoods", props.id).then((c) => {
      if (!c) return;
      setExisting(c);
      setName(c.name);
      setBrand(c.brand ?? "");
      setServing(c.servingLabel);
      setGrams(c.servingGrams);
      setKcal(c.nutrients.kcal);
      setProtein(c.nutrients.protein);
      setCarbs(c.nutrients.carbs);
      setFat(c.nutrients.fat);
      setFiber(c.nutrients.fiber);
      setSugar(c.nutrients.sugar);
      setSodium(c.nutrients.sodium);
      setBarcode(c.barcode ?? "");
    });
  }, [props.id]);

  const valid = name.trim().length > 0 && kcal != null && kcal >= 0;
  const save = async () => {
    setTried(true);
    if (!valid) return;
    const food: CF = {
      id: existing?.id ?? db.newId(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.replace(/\D/g, "") || undefined,
      servingLabel: serving.trim() || "1 serving",
      servingGrams: grams,
      nutrients: { kcal: Math.round(kcal!), protein, carbs, fat, fiber, sugar, sodium, satFat: existing?.nutrients.satFat ?? null, cholesterol: existing?.nutrients.cholesterol ?? null, potassium: existing?.nutrients.potassium ?? null },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await db.put("customFoods", food);
    if (props.date && props.meal && !existing) {
      go("/food", { key: `custom:${food.id}`, date: props.date, meal: props.meal, d: props.barcode ? "4" : "3" });
    } else {
      toast(existing ? "Saved" : `Saved ${food.name}`);
      back("/foods");
    }
  };

  const del = async () => {
    if (!existing) return;
    await db.remove("customFoods", existing.id);
    toast(`Deleted ${existing.name}`, { label: "Undo", run: () => db.put("customFoods", existing) });
    back("/foods");
  };

  return (
    <>
      <TopBar
        title={existing ? "Edit food" : "New food"}
        right={existing && <button class="icon-btn" aria-label="Delete food" style="color:var(--chilli)" onClick={() => setConfirm(true)}><IconTrash /></button>}
      />
      <form class="page" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="field">
          <span>Name</span>
          <input class="input" value={name} aria-invalid={tried && !name.trim() ? "true" : undefined} placeholder="e.g. Kaya toast set" onInput={(e) => setName(e.currentTarget.value)} />
        </label>
        {tried && !name.trim() && <p class="err">Give the food a name.</p>}
        {matches.length > 0 && (
          <div class="field" aria-live="polite">
            <span>Fill in from a known food</span>
            <div class="list" style="margin:0 -16px">
              {matches.map((f) => (
                <button type="button" class="row" key={f.key} onClick={() => fill(f)}>
                  <span class="what">
                    <span class="name" style="white-space:normal">{f.name}</span>
                    <span class="sub num">{f.source === "sgfoodid" ? "Singapore · " : ""}{portionLabel(f.portions[0])} · {int(scale(f.nutrients, f.portions[0].grams / 100).kcal)} kcal</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {filledFrom && (
          <p class="note" style="padding:0 0 16px">
            Filled in from {filledFrom.name} ({filledFrom.source === "sgfoodid" ? "SG FoodID" : "USDA"}). Change any number to match your serving.
          </p>
        )}
        <label class="field">
          <span>Brand or stall</span>
          <input class="input" value={brand} placeholder="Optional" onInput={(e) => setBrand(e.currentTarget.value)} />
        </label>
        <div class="grid2">
          <label class="field">
            <span>Serving</span>
            <input class="input" value={serving} onInput={(e) => setServing(e.currentTarget.value)} />
          </label>
          <NumField label="Serving weight" unit="g" value={grams} onChange={setGrams} hint="Optional" />
        </div>
        <h2 class="section-title">Nutrition per serving</h2>
        <NumField label="Calories" unit="kcal" value={kcal} onChange={setKcal} required invalid={tried && kcal == null} step="1" />
        {tried && kcal == null && <p class="err">Enter the calories per serving.</p>}
        <div class="grid3">
          <NumField label="Protein" unit="g" value={protein} onChange={setProtein} />
          <NumField label="Carbs" unit="g" value={carbs} onChange={setCarbs} />
          <NumField label="Fat" unit="g" value={fat} onChange={setFat} />
        </div>
        <div class="grid3">
          <NumField label="Fibre" unit="g" value={fiber} onChange={setFiber} />
          <NumField label="Sugars" unit="g" value={sugar} onChange={setSugar} />
          <NumField label="Sodium" unit="mg" value={sodium} onChange={setSodium} />
        </div>
        <label class="field">
          <span>Barcode</span>
          <input class="input num" inputMode="numeric" value={barcode} placeholder="Optional" onInput={(e) => setBarcode(e.currentTarget.value)} />
          <small>Scanning this barcode later finds this food, even offline.</small>
        </label>
        <button type="submit" class="sr">Save</button>
      </form>
      <Dock><button class="btn" onClick={save}>{existing ? "Save changes" : props.date ? "Save and log" : "Save food"}</button></Dock>
      <Confirm
        open={confirm} title={`Delete ${existing?.name ?? "this food"}?`}
        body="It disappears from My foods. Entries you already logged keep their numbers."
        confirmLabel="Delete" danger onConfirm={() => { setConfirm(false); del(); }} onCancel={() => setConfirm(false)}
      />
    </>
  );
}
