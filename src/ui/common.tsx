import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import type { Meal } from "../lib/types";
import { sgInfo } from "../lib/foods";
import { int, shortDate } from "../lib/format";
import { MEALS, MEAL_LABEL } from "../lib/types";
import { IconBack, IconMinus, IconPlus } from "./icons";
import { back } from "./router";

export function TopBar({ title, onBack, right, children }: { title: string; onBack?: () => void; right?: ComponentChildren; children?: ComponentChildren }) {
  return (
    <header class="topbar">
      <div class="topbar-row">
        <button class="icon-btn" aria-label="Back" onClick={onBack ?? (() => back())}>
          <IconBack />
        </button>
        <h1>{title}</h1>
        {right}
      </div>
      {children}
    </header>
  );
}

export function MacroBar({ label, value, goal, cls }: { label: string; value: number | null; goal: number; cls: string }) {
  const v = value ?? 0;
  const pct = goal ? Math.min((v / goal) * 100, 100) : 0;
  return (
    <div class="macro">
      <div class="top"><span>{label}</span><b class="num">{value == null ? "—" : int(v)}<small> / {int(goal)} g</small></b></div>
      <div class="track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.round(v)}>
        <i class={`${cls}${v > goal * 1.05 ? " over" : ""}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function MealPicker({ value, onChange }: { value: Meal; onChange: (m: Meal) => void }) {
  return (
    <div class="seg" role="group" aria-label="Meal">
      {MEALS.map((m) => (
        <button key={m} type="button" aria-pressed={m === value} onClick={() => onChange(m)}>
          {MEAL_LABEL[m]}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; label: string }) {
  const fix = (v: number) => Math.max(min, Math.round(v * 100) / 100);
  return (
    <div class="stepper">
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(fix(value - step))} disabled={value - step < min}>
        <IconMinus />
      </button>
      <input
        type="number" inputMode="decimal" min={min} step="any" aria-label={label} value={Number.isFinite(value) ? value : ""}
        onInput={(e) => onChange(parseFloat(e.currentTarget.value))}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(fix((Number.isFinite(value) ? value : 0) + step))}>
        <IconPlus />
      </button>
    </div>
  );
}

export function NumField(props: { label: string; value: number | null; onChange: (v: number | null) => void; unit?: string; hint?: string; required?: boolean; invalid?: boolean; step?: string }) {
  return (
    <label class="field">
      <span>{props.label}</span>
      <div class="input-unit">
        <input
          class="input num" type="number" inputMode="decimal" step={props.step ?? "any"} required={props.required}
          aria-label={props.unit ? `${props.label} (${props.unit})` : props.label}
          aria-invalid={props.invalid ? "true" : undefined}
          value={props.value ?? ""}
          onInput={(e) => {
            const v = parseFloat(e.currentTarget.value);
            props.onChange(Number.isFinite(v) ? v : null);
          }}
        />
        {props.unit && <span>{props.unit}</span>}
      </div>
      {props.hint && <small>{props.hint}</small>}
    </label>
  );
}

export function Confirm({ open, title, body, confirmLabel, danger, onConfirm, onCancel }: { open: boolean; title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onCancel} aria-labelledby="dlg-t">
      <h2 id="dlg-t">{title}</h2>
      <p>{body}</p>
      <div class="row-btns">
        <button class="btn secondary" onClick={onCancel}>Cancel</button>
        <button class={`btn${danger ? " danger" : ""}`} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  );
}

export function Dock({ children }: { children: ComponentChildren }) {
  return (
    <div class="dock">
      <div>{children}</div>
    </div>
  );
}

/** Safari (not the Home Screen app) can clear a site's data after about a week away, and Home Screen apps keep separate storage. */
const IN_IOS_SAFARI = (navigator as Navigator & { standalone?: boolean }).standalone === false && navigator.maxTouchPoints > 0;

export function IosInstallNote() {
  if (!IN_IOS_SAFARI) return null;
  return (
    <p class="warn" style="margin:16px 16px 0">
      <strong>Add Plateful to your Home Screen first</strong> (Share, then Add to Home Screen). In Safari, your iPhone can clear the diary after a week away, and the Home Screen app keeps its own separate copy.
    </p>
  );
}

/** The notice SG FoodID's licence requires wherever its data is used. Not an endorsement by HPB. */
export function SgCredit() {
  return (
    <>
      Contains information from Singapore Food Insights Database (SG FoodID){sgInfo.accessed ? ` accessed on ${shortDate(sgInfo.accessed)} ${sgInfo.accessed.slice(0, 4)}` : ""} from
      Health Promotion Board, made available under the terms at{" "}
      <a href="https://pphtpc.hpb.gov.sg/web/sgfoodid" target="_blank" rel="noopener noreferrer">pphtpc.hpb.gov.sg/web/sgfoodid</a>. Provided as-is;
      nutrition data has limitations and isn't guaranteed accurate or complete.
    </>
  );
}
