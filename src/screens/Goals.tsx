import { useEffect, useRef, useState } from "preact/hooks";
import * as db from "../lib/db";
import { CM_PER_IN, dayKey, int, LB_PER_KG, weightUnit } from "../lib/format";
import { ACTIVITY, DEFAULT_MACROS, macroGrams, planBudget } from "../lib/nutrition";
import type { Activity, Meal, Profile, Sex, Units } from "../lib/types";
import { MEALS, MEAL_LABEL } from "../lib/types";
import { Dock, IosInstallNote, NumField, TopBar } from "../ui/common";
import { PlateMark } from "../ui/Plate";
import { back, go } from "../ui/router";
import { toast } from "../ui/toast";

const PACES: { v: number; label: string }[] = [
  { v: -0.75, label: "Lose 0.75 kg a week" },
  { v: -0.5, label: "Lose 0.5 kg a week" },
  { v: -0.25, label: "Lose 0.25 kg a week" },
  { v: 0, label: "Stay where I am" },
  { v: 0.25, label: "Gain 0.25 kg a week" },
  { v: 0.5, label: "Gain 0.5 kg a week" },
];
const DEFAULT_SPLIT: Record<Meal, number> = { breakfast: 25, lunch: 35, dinner: 30, snacks: 10 };

export function Goals({ profile, setup }: { profile: Profile | null; setup?: boolean }) {
  const [units, setUnits] = useState<Units>(profile?.units ?? "metric");
  const [sex, setSex] = useState<Sex | null>(profile?.sex ?? null);
  const [birthYear, setBirthYear] = useState<number | null>(profile?.birthYear ?? null);
  const [heightCm, setHeightCm] = useState<number | null>(profile?.heightCm ?? null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [goalKg, setGoalKg] = useState<number | null>(profile?.goalWeightKg || null);
  const loadedKg = useRef<number | null>(null);
  const [activity, setActivity] = useState<Activity>(profile?.activity ?? "light");
  const [pace, setPace] = useState<number>(profile?.weeklyChangeKg ?? -0.5);
  const [custom, setCustom] = useState<number | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [macros, setMacros] = useState(profile?.macros ?? DEFAULT_MACROS);
  const [waterL, setWaterL] = useState<number | null>((profile?.waterGoalMl ?? 2000) / 1000);
  const [split, setSplit] = useState<Record<Meal, number> | null>(profile?.mealSplit ?? null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    // Current weight: the latest weigh-in, else the starting weight.
    db.getAll("weights").then((w) => {
      const latest = w.sort((a, b) => b.date.localeCompare(a.date))[0];
      loadedKg.current = latest?.kg ?? profile?.startWeightKg ?? null;
      setWeightKg(loadedKg.current);
    });
    if (profile) {
      setCustom(profile.kcalGoal);
    }
  }, []);

  const age = birthYear ? new Date().getFullYear() - birthYear : null;
  const bodyOk = sex && birthYear && age! >= 13 && age! <= 110 && heightCm && heightCm > 100 && heightCm < 250 && weightKg && weightKg > 25 && weightKg < 350;
  const plan = bodyOk ? planBudget({ sex: sex!, heightCm: heightCm!, birthYear: birthYear!, activity, weeklyChangeKg: pace }, weightKg!) : null;
  useEffect(() => {
    if (profile && plan && Math.abs(plan.budget - profile.kcalGoal) > 10) setUseCustom(true);
    // only on first computation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!plan]);
  const budget = useCustom && custom ? custom : plan?.budget ?? null;
  const macroSum = macros.protein + macros.carbs + macros.fat;
  const splitSum = split ? MEALS.reduce((a, m) => a + split[m], 0) : 100;
  const valid = !!bodyOk && !!budget && budget >= 800 && budget <= 6000 && macroSum === 100 && splitSum === 100;

  const save = async () => {
    setTried(true);
    if (!valid) return;
    const next: Profile = {
      sex: sex!, birthYear: birthYear!, heightCm: heightCm!, startWeightKg: profile?.startWeightKg ?? weightKg!,
      goalWeightKg: goalKg ?? 0, activity, weeklyChangeKg: pace, kcalGoal: budget!, macros,
      waterGoalMl: Math.round((waterL ?? 2) * 1000), units, netCarbs: profile?.netCarbs ?? false, mealSplit: split, setupDone: true,
    };
    await db.saveProfile(next);
    // Log a weigh-in only at setup or when the weight was actually changed here.
    if (weightKg && (setup || weightKg !== loadedKg.current)) {
      await db.put("weights", { date: dayKey(), kg: Math.round(weightKg * 10) / 10 });
    }
    db.requestPersistence();
    toast(setup ? "You're set. Log your first meal." : "Goals saved");
    if (setup) go("/today", {}, true);
    else back("/more");
  };

  const wUnit = weightUnit(units);
  const toKg = (v: number | null) => (v == null ? null : units === "metric" ? v : v / LB_PER_KG);
  const fromKg = (v: number | null) => (v == null ? null : units === "metric" ? Math.round(v * 10) / 10 : Math.round(v * LB_PER_KG * 10) / 10);
  const grams = budget ? macroGrams(budget, macros) : null;

  return (
    <>
      {setup ? (
        <>
        <header class="welcome-hero">
          <PlateMark size={56} />
          <h1>Plateful</h1>
          <p>A food diary that lives on this phone. No account, no ads, no tracking. Set a goal to get your daily budget.</p>
        </header>
        <IosInstallNote />
        </>
      ) : (
        <TopBar title="Goals and targets" />
      )}
      <form class="page" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <div class="field">
          <span>Units</span>
          <div class="seg" style="margin:0" role="group" aria-label="Units">
            <button type="button" aria-pressed={units === "metric"} onClick={() => setUnits("metric")}>kg · cm · ml</button>
            <button type="button" aria-pressed={units === "imperial"} onClick={() => setUnits("imperial")}>lb · ft · fl oz</button>
          </div>
        </div>

        <fieldset class="field" style="border:0;padding:0;margin:0 0 16px">
          <legend>Body for the calculation</legend>
          <div class="seg" style="margin:0" role="group" aria-label="Sex">
            <button type="button" aria-pressed={sex === "female"} onClick={() => setSex("female")}>Female</button>
            <button type="button" aria-pressed={sex === "male"} onClick={() => setSex("male")}>Male</button>
          </div>
          {tried && !sex && <p class="err" style="margin-top:8px">Choose one; it changes the energy estimate.</p>}
        </fieldset>
        <div class="grid2">
          <NumField label="Year of birth" value={birthYear} onChange={setBirthYear} step="1" invalid={tried && !(age && age >= 13 && age <= 110)} />
          {units === "metric" ? (
            <NumField label="Height" unit="cm" value={heightCm} onChange={setHeightCm} invalid={tried && !(heightCm && heightCm > 100)} />
          ) : (
            <NumField label="Height" unit="in" value={heightCm ? Math.round(heightCm / CM_PER_IN) : null} onChange={(v) => setHeightCm(v == null ? null : v * CM_PER_IN)} hint={heightCm ? `${Math.floor(heightCm / CM_PER_IN / 12)} ft ${Math.round(heightCm / CM_PER_IN) % 12} in` : undefined} />
          )}
        </div>
        <div class="grid2">
          <NumField label="Weight now" unit={wUnit} value={fromKg(weightKg)} onChange={(v) => setWeightKg(toKg(v))} invalid={tried && !(weightKg && weightKg > 25)} />
          <NumField label="Goal weight" unit={wUnit} value={fromKg(goalKg)} onChange={(v) => setGoalKg(toKg(v))} hint="Optional" />
        </div>

        <h2 class="section-title">How active is a normal day?</h2>
        <div class="radio-list">
          {(Object.keys(ACTIVITY) as Activity[]).map((a) => (
            <label key={a}>
              <input type="radio" name="activity" aria-label={`${ACTIVITY[a].label}: ${ACTIVITY[a].detail}`} checked={activity === a} onChange={() => setActivity(a)} />
              <span><b>{ACTIVITY[a].label}</b><small>{ACTIVITY[a].detail}</small></span>
            </label>
          ))}
        </div>

        <label class="field" style="margin-top:16px">
          <span>Pace</span>
          <select class="select" value={String(pace)} onChange={(e) => setPace(Number(e.currentTarget.value))}>
            {PACES.map((p) => <option key={p.v} value={String(p.v)}>{units === "metric" ? p.label : p.label.replace(/([\d.]+) kg/, (_, n) => `${(Number(n) * LB_PER_KG).toFixed(1)} lb`)}</option>)}
          </select>
        </label>

        {plan && (
          <div class="budget-card">
            <b class="num">{int(useCustom && custom ? custom : plan.budget)} kcal</b>
            <p>
              {useCustom && custom ? "Your own daily budget. " : "Your daily food budget. "}
              About {int(plan.maintenance)} kcal keeps your weight steady. Exercise you log adds to the day's budget.
            </p>
          </div>
        )}
        {plan?.belowFloor && !useCustom && (
          <p class="warn">That pace would put you under {int(plan.floor)} kcal a day, so the budget stops at {int(plan.floor)}. A slower pace is easier to keep.</p>
        )}
        {!plan && <p class="note" style="padding:0 0 16px">Fill in the details above to see your budget.</p>}

        <label class="menu" style="margin:0 -16px 16px">
          <span style="display:flex;align-items:center;gap:12px;width:100%">
            Set my own calorie budget
            <input type="checkbox" class="switch" checked={useCustom} onChange={(e) => { setUseCustom(e.currentTarget.checked); if (!custom && plan) setCustom(plan.budget); }} />
          </span>
        </label>
        {useCustom && <NumField label="Daily budget" unit="kcal" value={custom} onChange={setCustom} step="10" invalid={tried && !(custom && custom >= 800 && custom <= 6000)} hint="Between 800 and 6,000." />}

        <h2 class="section-title">Macro split</h2>
        <div class="grid3">
          <NumField label="Protein" unit="%" value={macros.protein} onChange={(v) => setMacros({ ...macros, protein: v ?? 0 })} step="1" hint={grams ? `${grams.protein} g` : undefined} />
          <NumField label="Carbs" unit="%" value={macros.carbs} onChange={(v) => setMacros({ ...macros, carbs: v ?? 0 })} step="1" hint={grams ? `${grams.carbs} g` : undefined} />
          <NumField label="Fat" unit="%" value={macros.fat} onChange={(v) => setMacros({ ...macros, fat: v ?? 0 })} step="1" hint={grams ? `${grams.fat} g` : undefined} />
        </div>
        {macroSum !== 100 && <p class="err">These add up to {macroSum}%. Make them 100%.</p>}

        <NumField label="Water goal" unit={units === "metric" ? "L" : "L"} value={waterL} onChange={setWaterL} step="0.25" />

        <label class="menu" style="margin:8px -16px 16px">
          <span style="display:flex;align-items:center;gap:12px;width:100%">
            Targets for each meal
            <input type="checkbox" class="switch" checked={!!split} onChange={(e) => setSplit(e.currentTarget.checked ? DEFAULT_SPLIT : null)} />
          </span>
        </label>
        {split && (
          <>
            <div class="grid2">
              {MEALS.map((m) => (
                <NumField key={m} label={MEAL_LABEL[m]} unit="%" value={split[m]} step="1" onChange={(v) => setSplit({ ...split, [m]: v ?? 0 })} hint={budget ? `${int((budget * split[m]) / 100)} kcal` : undefined} />
              ))}
            </div>
            {splitSum !== 100 && <p class="err">Meals add up to {splitSum}%. Make them 100%.</p>}
          </>
        )}
        <p class="attrib">Budgets use the Mifflin–St Jeor equation and an activity factor. They're estimates: adjust after two or three weeks of real weigh-ins.</p>
        <button type="submit" class="sr">Save</button>
      </form>
      <Dock><button class="btn" onClick={save}>{setup ? "Start my diary" : "Save goals"}</button></Dock>
    </>
  );
}
