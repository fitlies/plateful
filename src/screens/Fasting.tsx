import { useEffect, useState } from "preact/hooks";
import * as db from "../lib/db";
import { shortDate, timeLabel, dayKey } from "../lib/format";
import { useData } from "../lib/hooks";
import type { FastingWindow } from "../lib/types";
import { Dock, TopBar } from "../ui/common";
import { toast } from "../ui/toast";

const TARGETS = [12, 14, 16, 18, 20];

function hm(ms: number) {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m`;
}

export function Fasting() {
  const { data: all } = useData(() => db.getAll("fasting"), []);
  const [target, setTarget] = useState(16);
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const active = all?.find((f) => !f.end);
  const past = (all ?? []).filter((f) => f.end).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10);
  const elapsed = active ? Date.now() - new Date(active.start).getTime() : 0;
  const pct = active ? Math.min(elapsed / (active.targetHours * 3600000), 1) : 0;

  const start = () => db.put("fasting", { id: db.newId(), start: new Date().toISOString(), end: null, targetHours: target });
  const stop = async () => {
    if (!active) return;
    const done: FastingWindow = { ...active, end: new Date().toISOString() };
    await db.put("fasting", done);
    toast(`Fast ended at ${hm(elapsed)}`, { label: "Undo", run: () => db.put("fasting", active) });
  };

  return (
    <>
      <TopBar title="Fasting timer" />
      <div class="page">
        {active ? (
          <>
            <div class="budget-card">
              <b class="num">{hm(elapsed)}</b>
              <p>of a {active.targetHours}-hour fast, started {active.start.slice(0, 10) === dayKey() ? "today" : shortDate(active.start.slice(0, 10))} at {timeLabel(active.start)}</p>
              <div class="track" style="margin-top:12px;background:var(--surface)" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label="Fast progress">
                <i class="s-carbs" style={{ width: `${pct * 100}%` }} />
              </div>
              {pct >= 1 && <p style="margin-top:8px;color:var(--jade-deep);font-weight:600">You reached your target. End the fast whenever you're ready.</p>}
            </div>
          </>
        ) : (
          <>
            <p class="prose" style="margin-bottom:16px">Start the timer at your last bite. Plateful only keeps the times, on this device.</p>
            <div class="field">
              <span>Target</span>
              <div class="seg" style="margin:0" role="group" aria-label="Fast length">
                {TARGETS.map((h) => <button key={h} aria-pressed={target === h} onClick={() => setTarget(h)}>{h} h</button>)}
              </div>
            </div>
          </>
        )}
        {past.length > 0 && (
          <>
            <h2 class="section-title">Recent fasts</h2>
            <div class="list" style="margin:0 -16px">
              {past.map((f) => {
                const ms = new Date(f.end!).getTime() - new Date(f.start).getTime();
                return (
                  <div class="row" key={f.id}>
                    <span class="what"><span class="name">{shortDate(f.start.slice(0, 10))}</span><span class="sub">{timeLabel(f.start)} to {timeLabel(f.end!)}</span></span>
                    <span class="kcal" style={ms >= f.targetHours * 3600000 ? "color:var(--jade-deep)" : undefined}>{hm(ms)}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      <Dock>
        {active ? <button class="btn secondary" onClick={stop}>End fast</button> : <button class="btn" onClick={start}>Start a {target}-hour fast</button>}
      </Dock>
    </>
  );
}
