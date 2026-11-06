import { useEffect, useState } from "preact/hooks";
import * as db from "../lib/db";
import { finishFlow } from "../lib/handoff";
import { addEntry, defaultTime } from "../lib/log";
import type { Entry, Meal } from "../lib/types";
import { MEAL_LABEL } from "../lib/types";
import { Dock, MealPicker, NumField, TopBar } from "../ui/common";
import { IconTrash } from "../ui/icons";
import { toast } from "../ui/toast";

/** Log calories (and optional macros) without looking a food up. Also edits quick-add entries. */
export function QuickAdd({ date, meal: initialMeal, id, fromId, name: initialName }: { date?: string; meal?: Meal; id?: string; fromId?: string; name?: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [name, setName] = useState(initialName ?? "");
  const [meal, setMeal] = useState<Meal>(initialMeal ?? "snacks");
  const [kcal, setKcal] = useState<number | null>(null);
  const [protein, setProtein] = useState<number | null>(null);
  const [carbs, setCarbs] = useState<number | null>(null);
  const [fat, setFat] = useState<number | null>(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const load = id ?? fromId;
    if (!load) return;
    db.get("entries", load).then((e) => {
      if (!e) return;
      if (id) {
        setEntry(e);
        setMeal(e.meal);
      }
      setName(e.name === "Quick add" ? "" : e.name);
      setKcal(e.nutrients.kcal);
      setProtein(e.nutrients.protein);
      setCarbs(e.nutrients.carbs);
      setFat(e.nutrients.fat);
    });
  }, [id, fromId]);

  const valid = kcal != null && kcal >= 0 && kcal < 10000;
  const save = async () => {
    setTried(true);
    if (!valid) return;
    const nutrients = { kcal: Math.round(kcal!), protein, carbs, fat, fiber: null, sugar: null, sodium: null, satFat: null, cholesterol: null, potassium: null };
    const targetDate = entry?.date ?? date!;
    const fields = {
      date: targetDate, meal, foodKey: "quick", source: "quick" as const, name: name.trim() || "Quick add",
      amountLabel: "Quick add", quantity: 1, unit: "quick", grams: null, nutrients,
      loggedAt: entry?.loggedAt ?? defaultTime(targetDate, meal),
    };
    if (entry) {
      await db.put("entries", { ...entry, ...fields });
      toast("Saved");
      finishFlow(1, targetDate);
    } else {
      const e = await addEntry(fields);
      toast(`Logged ${fields.name} to ${MEAL_LABEL[meal].toLowerCase()}`, { label: "Undo", run: () => db.remove("entries", e.id) });
      finishFlow(2, targetDate);
    }
  };
  const del = async () => {
    if (!entry) return;
    await db.remove("entries", entry.id);
    toast(`Removed ${entry.name}`, { label: "Undo", run: () => db.put("entries", entry) });
    finishFlow(1, entry.date);
  };

  return (
    <>
      <TopBar
        title={entry ? "Edit quick add" : "Quick add"}
        right={entry && <button class="icon-btn" aria-label="Remove entry" onClick={del} style="color:var(--chilli)"><IconTrash /></button>}
      >
        <MealPicker value={meal} onChange={setMeal} />
      </TopBar>
      <form class="page" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="field">
          <span>What was it?</span>
          <input class="input" value={name} placeholder="e.g. Chicken rice" onInput={(e) => setName(e.currentTarget.value)} autoComplete="off" />
          <small>Optional. Naming it lets you log it again with one tap.</small>
        </label>
        <NumField label="Calories" unit="kcal" value={kcal} onChange={setKcal} required invalid={tried && !valid} step="1" />
        {tried && !valid && <p class="err">Enter the calories, between 0 and 9,999.</p>}
        <div class="grid3">
          <NumField label="Protein" unit="g" value={protein} onChange={setProtein} />
          <NumField label="Carbs" unit="g" value={carbs} onChange={setCarbs} />
          <NumField label="Fat" unit="g" value={fat} onChange={setFat} />
        </div>
        <button type="submit" class="sr">Save</button>
      </form>
      <Dock><button class="btn" onClick={save}>{entry ? "Save changes" : `Log to ${MEAL_LABEL[meal].toLowerCase()}`}</button></Dock>
    </>
  );
}
