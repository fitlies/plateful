import { useRef } from "preact/hooks";
import * as db from "../lib/db";
import { addDays, dayKey, dayLabel, int, timeLabel, waterOut } from "../lib/format";
import { loggingStreak, useData, useDay } from "../lib/hooks";
import { mealForNow, relog, usualFor } from "../lib/log";
import { macroGrams, netCarbs, totals } from "../lib/nutrition";
import type { Entry, Meal, Profile } from "../lib/types";
import { MEALS, MEAL_LABEL } from "../lib/types";
import { IconChevron, IconDrop, IconHourglass, IconMinus, IconNext, IconPlus, IconPrev, IconRun } from "../ui/icons";
import { IosInstallNote, MacroBar } from "../ui/common";
import { Plate } from "../ui/Plate";
import { go, href } from "../ui/router";
import { toast } from "../ui/toast";

export function Today({ date, profile }: { date: string; profile: Profile }) {
  const today = dayKey();
  const { data: day } = useDay(date);
  const { data: recent } = useData(() => db.recentEntries(400), []);
  const { data: yesterday } = useData(() => db.getByDate("entries", addDays(date, -1)), [date]);
  const { data: streak } = useData(() => loggingStreak(today, addDays), [today]);
  const { data: fast } = useData(async () => (await db.getAll("fasting")).find((f) => !f.end), []);
  const dateInput = useRef<HTMLInputElement>(null);

  const entries = day?.entries ?? [];
  const exerciseKcal = (day?.exercises ?? []).reduce((a, e) => a + e.kcal, 0);
  const budget = profile.kcalGoal + exerciseKcal;
  const t = totals(entries);
  const byMeal = Object.fromEntries(MEALS.map((m) => [m, 0])) as Record<Meal, number>;
  for (const e of entries) byMeal[e.meal] += e.nutrients.kcal;
  const goals = macroGrams(profile.kcalGoal, profile.macros);
  const carbs = profile.netCarbs ? netCarbs(t) ?? 0 : t.carbs ?? 0;
  const currentMeal = date === today ? mealForNow() : null;

  const setDate = (d: string) => go("/today", { date: d === today ? undefined : d });

  return (
    <>
      <header class="hero">
        <div class="hero-bar">
          <div class="datesw">
            <button class="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
              <IconPrev />
            </button>
            <button class="label" onClick={() => dateInput.current?.showPicker?.() ?? dateInput.current?.click()}>
              {dayLabel(date, today)}
            </button>
            <input
              ref={dateInput} type="date" class="sr" tabIndex={-1} aria-hidden="true" value={date}
              onChange={(e) => e.currentTarget.value && setDate(e.currentTarget.value)}
            />
            <button class="icon-btn" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
              <IconNext />
            </button>
          </div>
          {date === today && (streak ?? 0) >= 2 && <span class="streak">{streak}-day streak</span>}
          {date !== today && (
            <button class="streak" style="border:0" onClick={() => setDate(today)}>
              Back to today
            </button>
          )}
        </div>
      </header>

      <Plate budget={budget} byMeal={byMeal} />

      <div class="ledger num">
        <div><b>{int(profile.kcalGoal)}</b><span>Goal</span></div>
        <div><b>{int(t.kcal)}</b><span>Food</span></div>
        <div><b>{exerciseKcal ? `+${int(exerciseKcal)}` : "0"}</b><span>Exercise</span></div>
      </div>

      <IosInstallNote />

      <div class="macros">
        <MacroBar label="Protein" value={t.protein ?? 0} goal={goals.protein} cls="s-protein" />
        <MacroBar label={profile.netCarbs ? "Net carbs" : "Carbs"} value={carbs} goal={goals.carbs} cls="s-carbs" />
        <MacroBar label="Fat" value={t.fat ?? 0} goal={goals.fat} cls="s-fat" />
      </div>

      <div class="bands">
        {MEALS.map((meal) => (
          <MealBand
            key={meal} meal={meal} date={date} entries={entries.filter((e) => e.meal === meal)}
            target={profile.mealSplit ? Math.round((budget * profile.mealSplit[meal]) / 100) : null}
            isCurrent={meal === currentMeal}
            recent={recent ?? []} yesterday={(yesterday ?? []).filter((e) => e.meal === meal)}
          />
        ))}
        <WaterBand date={date} ml={day?.waterMl ?? 0} goal={profile.waterGoalMl} units={profile.units} />
        <section class="band" aria-labelledby="ex-h">
          <div class="band-head">
            <span class="ico" style="color:var(--jade);width:20px;display:grid;place-items:center"><IconRun size="sm" /></span>
            <h2 id="ex-h">Exercise</h2>
            <span class="total num">{exerciseKcal ? `+${int(exerciseKcal)}` : ""}</span>
            <a class="add" href={href("/exercise", { date })} aria-label="Add exercise"><IconPlus /></a>
          </div>
          {(day?.exercises ?? []).map((x) => (
            <a class="row" key={x.id} href={href("/exercise", { date, id: x.id })} style="text-decoration:none">
              <span class="what"><span class="name">{x.name}</span><span class="sub">{x.minutes} min</span></span>
              <span class="kcal">+{int(x.kcal)}</span>
              <IconChevron size="sm" />
            </a>
          ))}
        </section>
        {fast && (
          <a class="band" href="#/fasting" style="display:block;text-decoration:none;color:inherit">
            <div class="band-head">
              <span style="color:var(--cobalt);width:20px;display:grid;place-items:center"><IconHourglass size="sm" /></span>
              <h2>Fasting</h2>
              <span class="total num">{fastLabel(fast.start)} <small>of {fast.targetHours} h</small></span>
            </div>
          </a>
        )}
      </div>
    </>
  );
}

function fastLabel(start: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 60000));
  return `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, "0")} m`;
}


function MealBand(props: { meal: Meal; date: string; entries: Entry[]; target: number | null; isCurrent: boolean; recent: Entry[]; yesterday: Entry[] }) {
  const { meal, date, entries, target, isCurrent, recent, yesterday } = props;
  const total = entries.reduce((a, e) => a + e.nutrients.kcal, 0);
  const over = target != null && total > target * 1.1;
  const showNext = isCurrent && entries.length === 0;
  const usual = showNext ? usualFor(recent, meal, date) : [];

  const logOne = async (src: Entry) => {
    const e = await relog(src, date, meal);
    toast(`Logged ${short(src.name)}`, { label: "Undo", run: () => db.remove("entries", e.id) });
  };
  const copyYesterday = async () => {
    const made = await Promise.all(yesterday.map((e) => relog(e, date, meal)));
    toast(`Copied yesterday's ${MEAL_LABEL[meal].toLowerCase()} (${made.length})`, {
      label: "Undo",
      run: () => made.forEach((e) => db.remove("entries", e.id)),
    });
  };

  return (
    <section class="band" aria-labelledby={`h-${meal}`}>
      <div class="band-head">
        <span class={`dot${entries.length ? "" : " open"}${over ? " over" : ""}`} aria-hidden="true" />
        <h2 id={`h-${meal}`}>{MEAL_LABEL[meal]}</h2>
        <span class="total num" style={over ? "color:var(--chilli)" : undefined}>
          {entries.length ? int(total) : ""}
          {target != null && <small> / {int(target)}</small>}
        </span>
        <a class="add" href={href("/add", { date, meal })} aria-label={`Add food to ${MEAL_LABEL[meal]}`}><IconPlus /></a>
      </div>
      {entries.map((e) => (
        <a class="row" key={e.id} href={href("/entry", { id: e.id })} style="text-decoration:none">
          <span class="what">
            <span class="name">{e.name}</span>
            <span class="sub">{e.amountLabel} · {timeLabel(e.loggedAt)}</span>
          </span>
          <span class="kcal">{int(e.nutrients.kcal)}</span>
          <IconChevron size="sm" />
        </a>
      ))}
      {showNext && (usual.length > 0 || yesterday.length > 0) && (
        <div class="chips">
          {usual.map((u) => (
            <button class="chip" key={u.entry.id} onClick={() => logOne(u.entry)} aria-label={`Log ${u.entry.name}, ${u.entry.amountLabel}`}>
              <IconPlus size="sm" /><span>{short(u.entry.name)}</span>
            </button>
          ))}
          {yesterday.length > 0 && (
            <button class="chip ghost" onClick={copyYesterday}>Same as yesterday</button>
          )}
        </div>
      )}
    </section>
  );
}

function WaterBand({ date, ml, goal, units }: { date: string; ml: number; goal: number; units: Profile["units"] }) {
  const glasses = Math.min(Math.round(goal / 250), 12);
  const filled = Math.min(Math.floor(ml / 250), glasses);
  const set = (v: number) => db.put("water", { date, ml: Math.max(0, v) });
  return (
    <section class="band" aria-labelledby="w-h">
      <div class="band-head">
        <span style="color:var(--cobalt);width:20px;display:grid;place-items:center"><IconDrop size="sm" /></span>
        <h2 id="w-h">Water</h2>
        <span class="total num">{waterOut(ml, units)} <small>/ {waterOut(goal, units)}</small></span>
        <button class="add" onClick={() => set(ml + 250)} aria-label="Add a glass of water, 250 millilitres"><IconPlus /></button>
      </div>
      <div class="water">
        <div class="glasses" aria-hidden="true">
          {Array.from({ length: glasses }, (_, i) => <i key={i} class={i < filled ? "on" : ""} />)}
        </div>
        {ml > 0 && (
          <button class="icon-btn" style="color:var(--ink-2)" onClick={() => set(ml - 250)} aria-label="Remove a glass">
            <IconMinus size="sm" />
          </button>
        )}
      </div>
    </section>
  );
}

function short(name: string) {
  const first = name.split(",").slice(0, 2).join(",");
  return first.length > 26 ? first.slice(0, 24) + "…" : first;
}
