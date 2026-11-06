import { useState } from "preact/hooks";
import * as db from "../lib/db";
import { addDays, dayKey, dec, int, parseDay, shortDate, weightIn, weightOut, weightUnit, weightValue } from "../lib/format";
import { loggingStreak, useData } from "../lib/hooks";
import { macroGrams } from "../lib/nutrition";
import type { Entry, ExerciseEntry, Profile, WeightEntry } from "../lib/types";
import { IconTrash } from "../ui/icons";
import { toast } from "../ui/toast";

const W = 358;

export function Progress({ profile }: { profile: Profile }) {
  const today = dayKey();
  const { data } = useData(async () => {
    const [weights, entries, exercises, streak] = await Promise.all([
      db.getAll("weights"),
      db.getRange("entries", addDays(today, -90), today),
      db.getRange("exercises", addDays(today, -6), today),
      loggingStreak(today, addDays),
    ]);
    weights.sort((a, b) => a.date.localeCompare(b.date));
    return { weights, entries, exercises, streak };
  }, [today]);

  return (
    <>
      <header class="topbar" style="padding-left:16px"><div class="topbar-row"><h1>Progress</h1></div></header>
      {data && (
        <>
          <WeightCard weights={data.weights} profile={profile} today={today} />
          <WeekCard entries={data.entries} exercises={data.exercises} profile={profile} today={today} />
          <StreakCard entries={data.entries} streak={data.streak} today={today} />
        </>
      )}
    </>
  );
}

/* ---------------- weight ---------------- */
function WeightCard({ weights, profile, today }: { weights: WeightEntry[]; profile: Profile; today: string }) {
  const u = profile.units;
  const [val, setVal] = useState("");
  const latest = weights[weights.length - 1];
  const since = addDays(today, -90);
  const pts = weights.filter((w) => w.date >= since);
  const change = latest ? latest.kg - profile.startWeightKg : 0;
  const toGoal = latest ? profile.goalWeightKg - latest.kg : 0;

  const save = async (e: Event) => {
    e.preventDefault();
    const v = parseFloat(val);
    if (!Number.isFinite(v)) return;
    const kg = weightIn(v, u);
    if (kg < 25 || kg > 350) return toast("That weight looks off. Check the number and units.");
    const prev = await db.get("weights", today);
    await db.put("weights", { date: today, kg: Math.round(kg * 10) / 10 });
    setVal("");
    toast(`Logged ${weightOut(kg, u)} for today`, prev ? { label: "Undo", run: () => db.put("weights", prev) } : { label: "Undo", run: () => db.remove("weights", today) });
  };

  return (
    <section class="chart-card" aria-labelledby="wt-h">
      <h2 id="wt-h">Weight</h2>
      <p class="sub">Last 90 days{profile.goalWeightKg ? `, goal ${weightOut(profile.goalWeightKg, u)}` : ""}</p>
      <div class="kpis">
        <div>Now<b class="num">{latest ? weightOut(latest.kg, u) : "—"}</b></div>
        <div>Since start<b class="num">{latest ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${weightOut(Math.abs(change), u)}` : "—"}</b></div>
        <div>To goal<b class="num">{!latest || !profile.goalWeightKg ? "—" : Math.abs(toGoal) >= 0.05 ? weightOut(Math.abs(toGoal), u) : "Reached"}</b></div>
      </div>
      {pts.length >= 2 ? <WeightChart pts={pts} goal={profile.goalWeightKg} units={u} /> : (
        <p class="note" style="padding:0 0 4px">Weigh in on two different days to see your trend.</p>
      )}
      <form class="weigh" onSubmit={save}>
        <label class="field">
          <span class="sr">Today's weight in {weightUnit(u)}</span>
          <div class="input-unit">
            <input class="input num" type="number" inputMode="decimal" step="0.1" placeholder={latest ? String(weightValue(latest.kg, u)) : "Today's weight"} value={val} onInput={(e) => setVal(e.currentTarget.value)} />
            <span>{weightUnit(u)}</span>
          </div>
        </label>
        <button class="btn" type="submit" disabled={!val}>Log weight</button>
      </form>
      {weights.length > 0 && (
        <details class="table">
          <summary>All weigh-ins ({weights.length})</summary>
          <table>
            <tbody>
              {[...weights].reverse().slice(0, 60).map((w) => (
                <tr key={w.date}>
                  <td>{shortDate(w.date)}</td>
                  <td>{weightOut(w.kg, u)}</td>
                  <td style="width:44px">
                    <button class="icon-btn" style="width:36px;height:36px;color:var(--ink-3)" aria-label={`Delete weigh-in on ${shortDate(w.date)}`}
                      onClick={() => { db.remove("weights", w.date); toast(`Deleted ${shortDate(w.date)}`, { label: "Undo", run: () => db.put("weights", w) }); }}>
                      <IconTrash size="sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  );
}

function WeightChart({ pts, goal, units }: { pts: WeightEntry[]; goal: number; units: Profile["units"] }) {
  const H = 170, L = 40, R = 12, T = 12, B = 24;
  const [hover, setHover] = useState<number | null>(null);
  const t0 = parseDay(pts[0].date).getTime();
  const t1 = parseDay(pts[pts.length - 1].date).getTime();
  const vals = pts.map((p) => p.kg).concat(goal ? [goal] : []);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = Math.max((hi - lo) * 0.15, 0.8);
  lo -= pad; hi += pad;
  const x = (d: string) => L + ((parseDay(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - L - R);
  const y = (kg: number) => T + (1 - (kg - lo) / (hi - lo)) * (H - T - B);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.kg).toFixed(1)}`).join("");
  const area = `${line}L${x(pts[pts.length - 1].date).toFixed(1)},${H - B}L${x(pts[0].date).toFixed(1)},${H - B}Z`;
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const last = pts[pts.length - 1];

  const onMove = (e: PointerEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    pts.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(pts[best].date) - px)) best = i; });
    setHover(best);
  };
  const h = hover != null ? pts[hover] : null;

  return (
    <div class="chart-box">
      <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight from ${weightOut(pts[0].kg, units)} on ${shortDate(pts[0].date)} to ${weightOut(last.kg, units)} on ${shortDate(last.date)}`}
        onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line class="axis" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
            <text x={L - 6} y={y(v) + 4} text-anchor="end">{dec(weightValue(v, units))}</text>
          </g>
        ))}
        {goal > 0 && (
          <g>
            <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--ink-3)" stroke-width="1.5" />
            <text x={W - R} y={y(goal) - 6} text-anchor="end" style="fill:var(--ink-2);font-weight:600">Goal</text>
          </g>
        )}
        <path d={area} fill="var(--jade)" opacity="0.1" />
        <path d={line} fill="none" stroke="var(--jade)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <circle cx={x(last.date)} cy={y(last.kg)} r="4.5" fill="var(--jade)" stroke="var(--surface)" stroke-width="2" />
        <text x={L} y={H - 6}>{shortDate(pts[0].date)}</text>
        <text x={W - R} y={H - 6} text-anchor="end">{shortDate(last.date)}</text>
        {h && (
          <g>
            <line x1={x(h.date)} x2={x(h.date)} y1={T} y2={H - B} stroke="var(--ink-3)" stroke-width="1" />
            <circle cx={x(h.date)} cy={y(h.kg)} r="4.5" fill="var(--jade)" stroke="var(--surface)" stroke-width="2" />
          </g>
        )}
      </svg>
      {h && <div class="tip" style={{ left: `${(x(h.date) / W) * 100}%` }}>{shortDate(h.date)} · {weightOut(h.kg, units)}</div>}
    </div>
  );
}

/* ---------------- this week ---------------- */
function WeekCard({ entries, exercises, profile, today }: { entries: Entry[]; exercises: ExerciseEntry[]; profile: Profile; today: string }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const rows = days.map((d) => {
    const es = entries.filter((e) => e.date === d);
    const ex = exercises.filter((e) => e.date === d).reduce((a, e) => a + e.kcal, 0);
    const kcal = es.reduce((a, e) => a + e.nutrients.kcal, 0);
    return { d, kcal, budget: profile.kcalGoal + ex, logged: es.length > 0, es };
  });
  const logged = rows.filter((r) => r.logged);
  const avg = logged.length ? logged.reduce((a, r) => a + r.kcal, 0) / logged.length : 0;
  const under = logged.filter((r) => r.kcal <= r.budget).length;
  const mac = (k: "protein" | "carbs" | "fat") =>
    logged.length ? logged.reduce((a, r) => a + r.es.reduce((b, e) => b + (e.nutrients[k] ?? 0), 0), 0) / logged.length : 0;
  const goals = macroGrams(profile.kcalGoal, profile.macros);
  const [hover, setHover] = useState<number | null>(null);

  const H = 170, L = 8, R = 8, T = 22, B = 24;
  const max = Math.max(profile.kcalGoal * 1.25, ...rows.map((r) => r.kcal), 1);
  const slot = (W - L - R) / 7;
  const bw = Math.min(24, slot - 12);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const bar = (x: number, top: number, bottom: number) => {
    const h = bottom - top, r = Math.min(4, h);
    return `M${x},${bottom}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${bottom}Z`;
  };

  return (
    <section class="chart-card" aria-labelledby="wk-h">
      <h2 id="wk-h">Calories, last 7 days</h2>
      <p class="sub">Goal {int(profile.kcalGoal)} kcal a day; exercise adds to each day's budget</p>
      <div class="kpis">
        <div>Average<b class="num">{logged.length ? int(avg) : "—"}</b></div>
        <div>Days logged<b class="num">{logged.length} of 7</b></div>
        <div>Within budget<b class="num">{logged.length ? `${under} of ${logged.length}` : "—"}</b></div>
      </div>
      <div class="chart-box">
        <svg class="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Daily calories for the last 7 days against your budget">
          <line class="axis" x1={L} x2={W - R} y1={H - B} y2={H - B} />
          <line x1={L} x2={W - R} y1={y(profile.kcalGoal)} y2={y(profile.kcalGoal)} stroke="var(--ink-3)" stroke-width="1.5" />
          <text x={W - R} y={y(profile.kcalGoal) - 6} text-anchor="end" style="fill:var(--ink-2);font-weight:600">Goal</text>
          {rows.map((r, i) => {
            const cx = L + slot * i + slot / 2;
            const over = r.kcal > r.budget;
            return (
              <g key={r.d} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} onPointerLeave={() => setHover(null)}>
                <rect x={cx - slot / 2} y={T} width={slot} height={H - T} fill="transparent" />
                {r.kcal > 0 && <path d={bar(cx - bw / 2, y(r.kcal), H - B)} fill={over ? "var(--chilli)" : "var(--jade)"} />}
                {over && <text x={cx} y={y(r.kcal) - 6} text-anchor="middle" style="fill:var(--ink-2);font-weight:600">+{int(r.kcal - r.budget)}</text>}
                <text x={cx} y={H - 6} text-anchor="middle" style={r.d === today ? "fill:var(--ink);font-weight:700" : undefined}>
                  {parseDay(r.d).toLocaleDateString(undefined, { weekday: "narrow" })}
                </text>
              </g>
            );
          })}
        </svg>
        {hover != null && (
          <div class="tip" style={{ left: `${((L + slot * hover + slot / 2) / W) * 100}%` }}>
            {shortDate(rows[hover].d)} · {rows[hover].logged ? `${int(rows[hover].kcal)} of ${int(rows[hover].budget)} kcal` : "nothing logged"}
          </div>
        )}
      </div>
      <div class="legend">
        <span><i style="background:var(--jade)" />Within budget</span>
        <span><i style="background:var(--chilli)" />Over budget (+kcal shown)</span>
      </div>

      <h3 class="section-title" style="margin-top:20px">Average macros on logged days</h3>
      <div class="kpis" style="margin-bottom:0">
        {([["protein", "Protein", "--series-protein"], ["carbs", "Carbs", "--series-carbs"], ["fat", "Fat", "--series-fat"]] as const).map(([k, label, c]) => (
          <div key={k}>
            <span><i class="swatch" style={{ background: `var(${c})` }} />{label}</span>
            <b class="num">{logged.length ? `${int(mac(k))} g` : "—"}</b>
            <span class="num" style="font-size:12px;color:var(--ink-3)">goal {goals[k]} g</span>
          </div>
        ))}
      </div>

      <details class="table">
        <summary>Show as a table</summary>
        <table>
          <thead><tr><th>Day</th><th>Food</th><th>Budget</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.d}><td>{shortDate(r.d)}</td><td>{r.logged ? int(r.kcal) : "—"}</td><td>{int(r.budget)}</td></tr>)}</tbody>
        </table>
      </details>
    </section>
  );
}

/* ---------------- streak ---------------- */
function StreakCard({ entries, streak, today }: { entries: Entry[]; streak: number; today: string }) {
  const days = new Set(entries.map((e) => e.date));
  // 13 columns of weeks (Mon–Sun rows), ending with the current week.
  const t = parseDay(today);
  const dow = (t.getDay() + 6) % 7; // Monday = 0
  const start = addDays(today, -dow - 7 * 12);
  const cells = Array.from({ length: 91 }, (_, i) => addDays(start, i));
  const count = cells.filter((d) => d <= today && days.has(d)).length;

  return (
    <section class="chart-card" aria-labelledby="st-h">
      <h2 id="st-h">{streak >= 1 ? `${streak}-day streak` : "Logging habit"}</h2>
      <p class="sub">{count} of the last {cells.filter((d) => d <= today).length} days have entries. Missed days happen; just log the next meal.</p>
      <div class="cells" style="grid-auto-flow:column;grid-template-rows:repeat(7,1fr);grid-template-columns:repeat(13,1fr);margin-top:12px" role="img" aria-label={`${count} logged days in the last 13 weeks`}>
        {cells.map((d) => (
          <i key={d} title={`${shortDate(d)}${d > today ? "" : days.has(d) ? ": logged" : ": no entries"}`}
            class={`${d > today ? "future" : days.has(d) ? "on" : ""}${d === today ? " today" : ""}`} />
        ))}
      </div>
      <div class="legend"><span><i style="background:var(--jade)" />Logged</span><span><i style="background:var(--surface-2)" />No entries</span></div>
    </section>
  );
}
