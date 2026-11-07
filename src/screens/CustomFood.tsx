import { useEffect, useRef, useState } from "preact/hooks";
import * as db from "../lib/db";
import { SERVINGS, foodByKey, fraction, portionLabel, scale, searchFoods, servingLabel, servingUnit } from "../lib/foods";
import { int } from "../lib/format";
import type { CustomFood as CF, Food, Meal, NutrientVals as Vals } from "../lib/types";
import { Confirm, Dock, NumField, TopBar } from "../ui/common";
import { IconTrash } from "../ui/icons";
import { back, go } from "../ui/router";
import { toast } from "../ui/toast";

const BLANK: Vals = { kcal: null, protein: null, carbs: null, fat: null, fiber: null, sugar: null, sodium: null, satFat: null, cholesterol: null, potassium: null };

/** Create or edit one of the user's own foods (nutrition per serving, as printed on the pack). */
export function CustomFood(props: { id?: string; copyOf?: string; date?: string; meal?: Meal; barcode?: string; name?: string; brand?: string; d?: string }) {
  const [existing, setExisting] = useState<CF | null>(null);
  const [name, setName] = useState(props.name ?? "");
  const [brand, setBrand] = useState(props.brand ?? "");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("serving");
  const [grams, setGrams] = useState<number | null>(null);
  const [vals, setVals] = useState<Vals>(BLANK);
  const [barcode, setBarcode] = useState(props.barcode ?? "");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [matches, setMatches] = useState<Food[]>([]);
  const [filledFrom, setFilledFrom] = useState<Food | null>(null);
  // The numbers as last typed or filled in, and the servings and weight they were for.
  // Changing servings or weight rescales from here, so repeated changes never compound rounding.
  const base = useRef({ qty: 1, grams: null as number | null, n: BLANK });
  const rebase = (n: Vals, q = qty, g = grams) => (base.current = { qty: q, grams: g, n });
  const rescale = (q: number, g: number | null) => {
    const b = base.current;
    setVals(scale(b.n, g && b.grams ? g / b.grams : q / b.qty));
  };
  const changeQty = (q: number) => {
    const g = grams ? Math.round(((grams * q) / qty) * 10) / 10 : grams;
    setQty(q);
    setGrams(g);
    rescale(q, g);
  };
  const changeGrams = (g: number | null) => {
    setGrams(g);
    rescale(qty, g);
  };
  // A weight typed for numbers already there describes them; later weight changes rescale from it.
  const settleGrams = () => {
    if (!base.current.grams && grams) rebase(vals);
  };
  const setNutrient = (k: keyof Vals) => (v: number | null) => {
    const n = { ...vals, [k]: v };
    setVals(n);
    rebase(n);
  };

  // Suggest matching foods while a new food's name is typed; picking one fills in its nutrition.
  useEffect(() => {
    const q = name.trim();
    if (props.id || props.copyOf || q.length < 3) return setMatches([]);
    let live = true;
    const t = setTimeout(() => searchFoods(q, 5).then((r) => live && setMatches(r), () => {}), 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [name]);

  const fill = (f: Food) => {
    const p = f.portions[0];
    const n: Vals = { ...scale(f.nutrients, p.grams / 100), satFat: null, cholesterol: null, potassium: null };
    const g = Math.round(p.grams);
    setQty(1);
    setUnit(servingUnit(p.label));
    setGrams(g);
    setVals(n);
    rebase(n, 1, g);
    setFilledFrom(f);
    setMatches([]);
  };

  // "Save as my food" on a built-in food: start from its name and numbers.
  useEffect(() => {
    if (!props.copyOf) return;
    foodByKey(props.copyOf).then((f) => {
      if (!f) return;
      setName(f.name);
      fill(f);
    }, () => {});
  }, [props.copyOf]);

  useEffect(() => {
    if (!props.id) return;
    db.get("customFoods", props.id).then((c) => {
      if (!c) return;
      setExisting(c);
      setName(c.name);
      setBrand(c.brand ?? "");
      const q = c.servingQty ?? 1;
      setQty(q);
      setUnit(c.servingUnit ?? servingUnit(c.servingLabel));
      setGrams(c.servingGrams);
      setVals(c.nutrients);
      rebase(c.nutrients, q, c.servingGrams);
      setBarcode(c.barcode ?? "");
    });
  }, [props.id]);

  const kcal = vals.kcal;
  const label = servingLabel(qty, unit);
  const valid = name.trim().length > 0 && kcal != null && kcal >= 0;
  const save = async () => {
    setTried(true);
    if (!valid) return;
    const food: CF = {
      id: existing?.id ?? db.newId(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      barcode: barcode.replace(/\D/g, "") || undefined,
      servingLabel: label,
      servingGrams: grams,
      servingQty: qty,
      servingUnit: unit.trim() || "serving",
      nutrients: { ...vals, kcal: Math.round(kcal!) },
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await db.put("customFoods", food);
    if (props.date && props.meal && !existing) {
      go("/food", { key: `custom:${food.id}`, date: props.date, meal: props.meal, d: props.d ?? (props.barcode ? "4" : "3") });
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
            Filled in from {filledFrom.name} ({filledFrom.source === "sgfoodid" ? "SG FoodID" : "USDA"}). Change the servings or weight and the numbers follow.
          </p>
        )}
        <label class="field">
          <span>Brand or stall</span>
          <input class="input" value={brand} placeholder="Optional" onInput={(e) => setBrand(e.currentTarget.value)} />
        </label>
        <div class="grid-serving">
          <label class="field">
            <span>Servings</span>
            <select class="select num" value={String(qty)} onChange={(e) => changeQty(Number(e.currentTarget.value))}>
              {SERVINGS.map((q) => <option key={q} value={String(q)}>{fraction(q)}</option>)}
            </select>
          </label>
          <label class="field">
            <span>Unit</span>
            <input class="input" value={unit} placeholder="plate, piece, cup" onInput={(e) => setUnit(e.currentTarget.value)} />
          </label>
          <NumField label="Weight" unit="g" value={grams} onChange={changeGrams} onBlur={settleGrams} hint="Optional" />
        </div>
        <h2 class="section-title">Nutrition for {label}</h2>
        <NumField label="Calories" unit="kcal" value={kcal} onChange={setNutrient("kcal")} required invalid={tried && kcal == null} step="1" />
        {tried && kcal == null && <p class="err">Enter the calories per serving.</p>}
        <div class="grid3">
          <NumField label="Protein" unit="g" value={vals.protein} onChange={setNutrient("protein")} />
          <NumField label="Carbs" unit="g" value={vals.carbs} onChange={setNutrient("carbs")} />
          <NumField label="Fat" unit="g" value={vals.fat} onChange={setNutrient("fat")} />
        </div>
        <div class="grid3">
          <NumField label="Fibre" unit="g" value={vals.fiber} onChange={setNutrient("fiber")} />
          <NumField label="Sugars" unit="g" value={vals.sugar} onChange={setNutrient("sugar")} />
          <NumField label="Sodium" unit="mg" value={vals.sodium} onChange={setNutrient("sodium")} />
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
