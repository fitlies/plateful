import { useEffect, useMemo, useState } from "preact/hooks";
import * as db from "../lib/db";
import { amount, foodByKey, portionLabel, scale } from "../lib/foods";
import { dec, int } from "../lib/format";
import { finishFlow, heldFood } from "../lib/handoff";
import { useProfile } from "../lib/hooks";
import { addEntry, customToFood, defaultTime, saveScannedFood } from "../lib/log";
import { macroGrams, netCarbs } from "../lib/nutrition";
import type { Entry, Food, Meal, Nutrients } from "../lib/types";
import { MEAL_LABEL } from "../lib/types";
import { Dock, MacroBar, MealPicker, Stepper, TopBar } from "../ui/common";
import { IconTrash } from "../ui/icons";
import { go } from "../ui/router";
import { toast } from "../ui/toast";

interface Unit {
  id: string;
  label: string;
}

async function resolveFood(key: string): Promise<Food | undefined> {
  if (key.startsWith("usda:")) return foodByKey(key);
  if (key.startsWith("custom:")) {
    const c = await db.get("customFoods", key.slice(7));
    return c ? customToFood(c) : undefined;
  }
  if (key.startsWith("off:")) return heldFood(key);
  return undefined;
}

function unitsFor(f: Food): Unit[] {
  if (f.per100g) return [...f.portions.map((p, i) => ({ id: `p${i}`, label: portionLabel(p) })), { id: "g", label: "grams" }];
  const u: Unit[] = [{ id: "serving", label: f.servingLabel || "1 serving" }];
  if (f.servingGrams) u.push({ id: "g", label: "grams" });
  return u;
}


function toTimeInput(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function withTime(iso: string, hhmm: string) {
  const d = new Date(iso);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/** Log a food (key + date + meal), or edit an existing entry (id). */
export function FoodDetail({ foodKey, date, meal: initialMeal, entryId, fromId, depth }: { foodKey?: string; date?: string; meal?: Meal; entryId?: string; fromId?: string; depth: number }) {
  const { data: profile } = useProfile();
  const [food, setFood] = useState<Food | null | undefined>(undefined);
  const [entry, setEntry] = useState<Entry | null>(null);
  const [unit, setUnit] = useState("p0");
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState<Meal>(initialMeal ?? "snacks");
  const [time, setTime] = useState<string>("");

  useEffect(() => {
    (async () => {
      let e: Entry | undefined;
      if (entryId) {
        e = await db.get("entries", entryId);
        if (!e) return setFood(null);
        if (e.source === "quick") return go("/quick", { id: e.id }, true);
        setEntry(e);
        setMeal(e.meal);
        setTime(toTimeInput(e.loggedAt));
      }
      const key = e?.foodKey ?? foodKey!;
      const f = await resolveFood(key);
      setFood(f ?? null);
      if (!f) return;
      const prefill = e ?? (fromId ? await db.get("entries", fromId) : undefined);
      const units = unitsFor(f);
      if (prefill && units.some((u) => u.id === prefill.unit)) {
        setUnit(prefill.unit);
        setQty(prefill.quantity);
      } else setUnit(units[0].id);
      if (!e) setTime(toTimeInput(defaultTime(date!, initialMeal ?? "snacks")));
    })();
  }, [entryId, foodKey]);

  const calc = useMemo(() => (food ? amount(food, unit, Number.isFinite(qty) ? qty : 0) : null), [food, unit, qty]);
  const n: Nutrients | null = food && calc ? scale(food.nutrients, food.per100g ? calc.factor : calc.factor) : null;
  const valid = Number.isFinite(qty) && qty > 0;

  if (food === undefined) return <TopBar title="Food" />;
  if (food === null && !entry)
    return (
      <>
        <TopBar title="Food" />
        <div class="empty"><strong>This food isn't available</strong>It may have been deleted, or the scan expired. Search for it again.</div>
      </>
    );

  const save = async () => {
    if (!food || !calc || !n || !valid) return;
    const targetDate = entry?.date ?? date!;
    let key = food.key;
    if (food.source === "off") key = `custom:${(await saveScannedFood(food, food.key.slice(4))).id}`;
    const base = entry?.loggedAt ?? defaultTime(targetDate, meal);
    const fields = {
      date: targetDate,
      meal,
      foodKey: key,
      source: food.source,
      name: food.name,
      brand: food.brand,
      amountLabel: calc.label,
      quantity: qty,
      unit,
      grams: calc.grams,
      nutrients: n,
      loggedAt: time ? withTime(base, time) : base,
    };
    if (entry) {
      await db.put("entries", { ...entry, ...fields });
      toast("Saved");
      finishFlow(1, targetDate);
    } else {
      const e = await addEntry(fields);
      toast(`Logged ${food.name} to ${MEAL_LABEL[meal].toLowerCase()}`, { label: "Undo", run: () => db.remove("entries", e.id) });
      finishFlow(depth, targetDate);
    }
  };

  const del = async () => {
    if (!entry) return;
    await db.remove("entries", entry.id);
    toast(`Removed ${entry.name}`, { label: "Undo", run: () => db.put("entries", entry) });
    finishFlow(1, entry.date);
  };

  const units = food ? unitsFor(food) : [];
  const goals = profile ? macroGrams(profile.kcalGoal, profile.macros) : null;
  const src =
    food?.source === "usda" ? "USDA FoodData Central" : food?.source === "off" ? "Open Food Facts" : food?.source === "custom" ? "My food" : "";

  return (
    <>
      <TopBar
        title={entry ? "Edit entry" : `Add to ${MEAL_LABEL[meal].toLowerCase()}`}
        right={entry && <button class="icon-btn" aria-label="Remove entry" onClick={del} style="color:var(--chilli)"><IconTrash /></button>}
      />
      <div class="food-head">
        <h2>{food?.name ?? entry?.name}</h2>
        {food?.brand && <p style="color:var(--ink-2);margin-top:4px">{food.brand}</p>}
        <span class="src">{src}</span>
        {n && (
          <div class="big-kcal num"><b>{int(n.kcal)}</b><span>kcal</span></div>
        )}
        {n && goals && (
          <div class="mbars">
            <MacroBar label="Protein" value={n.protein} goal={goals.protein} cls="s-protein" />
            <MacroBar label={profile?.netCarbs ? "Net carbs" : "Carbs"} value={profile?.netCarbs ? netCarbs(n) : n.carbs} goal={goals.carbs} cls="s-carbs" />
            <MacroBar label="Fat" value={n.fat} goal={goals.fat} cls="s-fat" />
          </div>
        )}
      </div>

      {food && (
        <div class="page">
          <div class="grid2">
            <label class="field">
              <span>Amount</span>
              <Stepper value={qty} onChange={setQty} step={unit === "g" ? 10 : 0.5} label="amount" />
            </label>
            <label class="field">
              <span>Unit</span>
              <select class="select" value={unit} onChange={(e) => {
                const next = e.currentTarget.value;
                if (next === "g" && calc?.grams) setQty(Math.round(calc.grams));
                else if (unit === "g" && next !== "g") setQty(1);
                setUnit(next);
              }}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
              </select>
            </label>
          </div>
          {!valid && <p class="err">Enter an amount above zero.</p>}
          <div class="field">
            <span>Meal</span>
            <MealPicker value={meal} onChange={setMeal} />
          </div>
          <label class="field">
            <span>Time eaten</span>
            <input class="input num" type="time" value={time} onInput={(e) => setTime(e.currentTarget.value)} />
          </label>

          {n && <Facts n={n} />}
          <p class="attrib">
            {food.source === "usda" && "Nutrition from USDA FoodData Central (public domain). Values are averages."}
            {food.source === "off" && "Nutrition from Open Food Facts, a crowd-sourced database (ODbL). Check it against the pack."}
            {food.source === "custom" && "A food you saved on this device."}
          </p>
        </div>
      )}

      {!food && <p class="note" style="padding:16px">This food was deleted from My foods, so the entry can only be removed.</p>}
      {food && <Dock>
        <button class="btn" disabled={!valid} onClick={save}>{entry ? "Save changes" : `Log to ${MEAL_LABEL[meal].toLowerCase()}`}</button>
      </Dock>}
    </>
  );
}


function Facts({ n }: { n: Nutrients }) {
  const g = (v: number | null, unit = "g") => (v == null ? "—" : <>{dec(v)}<small>{unit}</small></>);
  return (
    <table class="facts">
      <caption class="sr">Nutrition for this amount</caption>
      <tbody>
        <tr><th scope="row">Protein</th><td>{g(n.protein)}</td></tr>
        <tr><th scope="row">Carbohydrate</th><td>{g(n.carbs)}</td></tr>
        <tr class="sub"><th scope="row">Fibre</th><td>{g(n.fiber)}</td></tr>
        <tr class="sub"><th scope="row">Sugars</th><td>{g(n.sugar)}</td></tr>
        <tr class="sub"><th scope="row">Net carbs</th><td>{g(netCarbs(n))}</td></tr>
        <tr><th scope="row">Fat</th><td>{g(n.fat)}</td></tr>
        <tr class="sub"><th scope="row">Saturated fat</th><td>{g(n.satFat)}</td></tr>
        <tr><th scope="row">Sodium</th><td>{g(n.sodium, "mg")}</td></tr>
        <tr><th scope="row">Cholesterol</th><td>{g(n.cholesterol, "mg")}</td></tr>
        <tr><th scope="row">Potassium</th><td>{g(n.potassium, "mg")}</td></tr>
      </tbody>
    </table>
  );
}
