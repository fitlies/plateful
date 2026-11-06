import type { Units } from "./types";

// ---------- dates (always the device's local calendar day) ----------
export function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function parseDay(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(key: string, n: number): string {
  const d = parseDay(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
export function dayLabel(key: string, today = dayKey()): string {
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  if (key === addDays(today, 1)) return "Tomorrow";
  return parseDay(key).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
export function shortDate(key: string): string {
  return parseDay(key).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// ---------- numbers ----------
const nf0 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
export const int = (n: number) => nf0.format(Math.round(n));
export const dec = (n: number) => nf1.format(n);

// ---------- units ----------
export const LB_PER_KG = 2.20462;
export const CM_PER_IN = 2.54;
export const ML_PER_FLOZ = 29.5735;

export function weightOut(kg: number, u: Units): string {
  return u === "metric" ? `${dec(kg)} kg` : `${dec(kg * LB_PER_KG)} lb`;
}
export function weightValue(kg: number, u: Units): number {
  return u === "metric" ? Math.round(kg * 10) / 10 : Math.round(kg * LB_PER_KG * 10) / 10;
}
export function weightIn(v: number, u: Units): number {
  return u === "metric" ? v : v / LB_PER_KG;
}
export const weightUnit = (u: Units) => (u === "metric" ? "kg" : "lb");

export function waterOut(ml: number, u: Units): string {
  if (u === "metric") return ml >= 1000 ? `${dec(ml / 1000)} L` : `${int(ml)} ml`;
  return `${int(ml / ML_PER_FLOZ)} fl oz`;
}
