import { useEffect, useState } from "preact/hooks";
import * as db from "../lib/db";
import { int } from "../lib/format";
import { finishFlow } from "../lib/handoff";
import { ACTIVITIES, exerciseKcal } from "../lib/nutrition";
import type { ExerciseEntry, Profile } from "../lib/types";
import { Dock, NumField, TopBar } from "../ui/common";
import { IconTrash } from "../ui/icons";
import { toast } from "../ui/toast";

const OTHER = "__other";

export function Exercise({ date, id, profile }: { date: string; id?: string; profile: Profile }) {
  const [existing, setExisting] = useState<ExerciseEntry | null>(null);
  const [kind, setKind] = useState(ACTIVITIES[1].name);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState<number | null>(30);
  const [kcal, setKcal] = useState<number | null>(null);
  const [kcalTouched, setKcalTouched] = useState(false);
  const [kg, setKg] = useState(profile.startWeightKg);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    db.getAll("weights").then((w) => {
      const latest = w.filter((x) => x.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];
      if (latest) setKg(latest.kg);
    });
    if (id)
      db.get("exercises", id).then((x) => {
        if (!x) return;
        setExisting(x);
        const known = ACTIVITIES.find((a) => a.name === x.name);
        setKind(known ? known.name : OTHER);
        if (!known) setName(x.name);
        setMinutes(x.minutes);
        setKcal(x.kcal);
        setKcalTouched(true);
      });
  }, [id]);

  const met = ACTIVITIES.find((a) => a.name === kind)?.met;
  const estimate = met && minutes ? exerciseKcal(met, kg, minutes) : null;
  const value = kcalTouched ? kcal : estimate;
  const valid = (kind !== OTHER || name.trim()) && minutes && minutes > 0 && value != null && value >= 0 && value < 5000;

  const save = async () => {
    setTried(true);
    if (!valid) return;
    const x: ExerciseEntry = { id: existing?.id ?? db.newId(), date: existing?.date ?? date, name: kind === OTHER ? name.trim() : kind, minutes: minutes!, kcal: Math.round(value!) };
    await db.put("exercises", x);
    toast(existing ? "Saved" : `Logged ${x.name}, +${int(x.kcal)} kcal`);
    finishFlow(1, x.date);
  };
  const del = async () => {
    if (!existing) return;
    await db.remove("exercises", existing.id);
    toast(`Removed ${existing.name}`, { label: "Undo", run: () => db.put("exercises", existing) });
    finishFlow(1, existing.date);
  };

  return (
    <>
      <TopBar title={existing ? "Edit exercise" : "Add exercise"} right={existing && <button class="icon-btn" aria-label="Remove exercise" style="color:var(--chilli)" onClick={del}><IconTrash /></button>} />
      <form class="page" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label class="field">
          <span>Activity</span>
          <select class="select" value={kind} onChange={(e) => { setKind(e.currentTarget.value); setKcalTouched(false); }}>
            {ACTIVITIES.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
            <option value={OTHER}>Something else…</option>
          </select>
        </label>
        {kind === OTHER && (
          <label class="field">
            <span>Name</span>
            <input class="input" value={name} aria-invalid={tried && !name.trim() ? "true" : undefined} placeholder="e.g. Futsal" onInput={(e) => setName(e.currentTarget.value)} />
          </label>
        )}
        <NumField label="Minutes" unit="min" value={minutes} onChange={(v) => setMinutes(v)} step="5" invalid={tried && !(minutes && minutes > 0)} />
        <NumField
          label="Calories burned" unit="kcal" step="5" value={value ?? null}
          onChange={(v) => { setKcalTouched(true); setKcal(v); }}
          hint={kind !== OTHER && !kcalTouched ? `Estimated for ${Math.round(kg)} kg from typical effort. Change it if your watch says otherwise.` : undefined}
          invalid={tried && value == null}
        />
        <button type="submit" class="sr">Save</button>
      </form>
      <Dock><button class="btn" onClick={save}>{existing ? "Save changes" : "Add exercise"}</button></Dock>
    </>
  );
}
