// In-memory hand-off between screens (e.g. a scanned product that isn't saved yet).
import type { Food } from "./types";

const foods = new Map<string, Food>();
export const holdFood = (f: Food) => foods.set(f.key, f);
export const heldFood = (key: string) => foods.get(key);

/** Leave a flow and land back on Today, without stacking screens in history. */
export function finishFlow(depth: number, date: string) {
  if (sessionStorage.getItem("plateful-nav") === "1" && history.length > depth) history.go(-depth);
  else location.replace(`#/today${date ? "?date=" + date : ""}`);
}
