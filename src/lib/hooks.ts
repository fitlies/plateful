import { useEffect, useState, useCallback } from "preact/hooks";
import * as db from "./db";
import type { Entry, ExerciseEntry, Profile, WeightEntry } from "./types";

/** Re-run `load` on mount, when deps change, and after any database write. */
export function useData<T>(load: () => Promise<T>, deps: unknown[]): { data: T | undefined; reload: () => void } {
  const [data, setData] = useState<T | undefined>(undefined);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => db.onChange(reload), [reload]);
  useEffect(() => {
    let live = true;
    load().then((v) => live && setData(v));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, reload };
}

export interface DayData {
  entries: Entry[];
  exercises: ExerciseEntry[];
  waterMl: number;
  weight: WeightEntry | undefined;
}

export function useDay(date: string) {
  return useData<DayData>(async () => {
    const [entries, exercises, water, weight] = await Promise.all([
      db.getByDate("entries", date),
      db.getByDate("exercises", date),
      db.get("water", date),
      db.get("weights", date),
    ]);
    entries.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    return { entries, exercises, waterMl: water?.ml ?? 0, weight };
  }, [date]);
}

export function useProfile() {
  return useData<Profile | null>(() => db.getProfile(), []);
}

/** Days in a row, ending today or yesterday, with at least one food entry. */
export async function loggingStreak(today: string, addDays: (k: string, n: number) => string): Promise<number> {
  const from = addDays(today, -400);
  const entries = await db.getRange("entries", from, today);
  const days = new Set(entries.map((e) => e.date));
  let cursor = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDays(cursor, -1);
  }
  return n;
}
