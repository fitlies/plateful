// The signature: today's calorie budget drawn as a kopitiam plate rim, one segment per meal.
import type { Meal } from "../lib/types";
import { MEAL_LABEL } from "../lib/types";
import { int } from "../lib/format";

const SIZE = 236;
const C = SIZE / 2;
const R = 106; // centre line of the rim
const W = 22; // rim width
const CIRC = 2 * Math.PI * R;
const GAP = 2.5;

// Logged meals share the jade family, darkest first, so the rim reads as one material.
const TONES: Record<Meal, string> = {
  breakfast: "var(--rim-1)",
  lunch: "var(--rim-2)",
  dinner: "var(--rim-3)",
  snacks: "var(--rim-4)",
};

export function Plate({ budget, byMeal }: { budget: number; byMeal: Record<Meal, number> }) {
  const eaten = Object.values(byMeal).reduce((a, b) => a + b, 0);
  const left = budget - eaten;
  const over = left < 0;
  const scaleTo = Math.max(budget, 1);

  let offset = 0;
  const segs: { meal: Meal; len: number; start: number }[] = [];
  for (const meal of Object.keys(TONES) as Meal[]) {
    const kcal = byMeal[meal];
    if (kcal <= 0) continue;
    const len = Math.min((kcal / scaleTo) * CIRC, CIRC - offset);
    if (len <= 0) continue;
    segs.push({ meal, len, start: offset });
    offset += len;
  }
  const overLen = over ? Math.min((-left / scaleTo) * CIRC, CIRC) : 0;

  const summary = over
    ? `${int(-left)} kilocalories over today's budget of ${int(budget)}`
    : `${int(left)} of ${int(budget)} kilocalories left today`;

  return (
    <div class="plate-wrap" role="img" aria-label={summary}>
      <svg class="plate-svg" viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} aria-hidden="true">
        <circle cx={C} cy={C} r={C - 0.5} fill="var(--surface)" />
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--jade-pale)" stroke-width={W} />
        {/* the unfilled budget is a dashed centre line: "planned", not yet eaten */}
        {!over && (
          <circle
            cx={C} cy={C} r={R} fill="none" stroke="var(--jade-soft)" stroke-width="1.5" stroke-dasharray="3 5" opacity="0.7"
            transform={`rotate(-90 ${C} ${C})`}
          />
        )}
        <g transform={`rotate(-90 ${C} ${C})`}>
          {segs.map((s) => (
            <circle
              key={s.meal}
              class="seg"
              cx={C} cy={C} r={R} fill="none"
              stroke={TONES[s.meal]}
              stroke-width={W}
              stroke-dasharray={`${Math.max(s.len - GAP, 0.01)} ${CIRC}`}
              stroke-dashoffset={-s.start}
            >
              <title>{`${MEAL_LABEL[s.meal]}: ${int(byMeal[s.meal])} kcal`}</title>
            </circle>
          ))}
          {/* past 100%: the overage laps the rim from the top in chilli, the meals stay jade beneath */}
          {over && (
            <circle
              class="seg" cx={C} cy={C} r={R} fill="none" stroke="var(--chilli)" stroke-width={W - 6}
              stroke-dasharray={`${Math.max(overLen - GAP, 0.01)} ${CIRC}`}
            >
              <title>{`Over by ${int(-left)} kcal`}</title>
            </circle>
          )}
        </g>
        {/* quarter ticks keep the rim a gauge, not an ornament */}
        {[0, 90, 180, 270].map((a) => (
          <line
            key={a} x1={C} y1={C - R - W / 2 + 1} x2={C} y2={C - R - W / 2 + 6}
            stroke="var(--jade-deep)" stroke-width="1.5" opacity="0.35" transform={`rotate(${a} ${C} ${C})`}
          />
        ))}
      </svg>
      <div class="plate-well">
        <div>
          <div class={`plate-left num${over ? " over" : ""}`}>{int(Math.abs(left))}</div>
          <span class="plate-cap">{over ? "kcal over today" : "kcal left today"}</span>
        </div>
      </div>
    </div>
  );
}

/** A small plate-mark used as the app's logo and empty-state art. */
export function PlateMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#fff" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#d3e9de" stroke-width="6" />
      <circle cx="20" cy="20" r="15" fill="none" stroke="#0f7b55" stroke-width="6" stroke-dasharray="62 94.2" transform="rotate(-90 20 20)" />
      <circle cx="20" cy="20" r="11" fill="#f3f7f5" />
    </svg>
  );
}
