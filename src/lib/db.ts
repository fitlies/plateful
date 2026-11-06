// Tiny IndexedDB wrapper. Everything Plateful knows about the user lives here, on this device only.
import type { CustomFood, Entry, ExerciseEntry, FastingWindow, Profile, WaterDay, WeightEntry } from "./types";

const DB_NAME = "plateful";
const DB_VERSION = 1;

export interface Stores {
  entries: Entry;
  exercises: ExerciseEntry;
  weights: WeightEntry;
  water: WaterDay;
  customFoods: CustomFood;
  fasting: FastingWindow;
  settings: { key: string; value: unknown };
}
export type StoreName = keyof Stores;
export const STORE_NAMES: StoreName[] = ["entries", "exercises", "weights", "water", "customFoods", "fasting", "settings"];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const entries = db.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("date", "date");
      entries.createIndex("loggedAt", "loggedAt");
      db.createObjectStore("exercises", { keyPath: "id" }).createIndex("date", "date");
      db.createObjectStore("weights", { keyPath: "date" });
      db.createObjectStore("water", { keyPath: "date" });
      db.createObjectStore("customFoods", { keyPath: "id" }).createIndex("barcode", "barcode");
      db.createObjectStore("fasting", { keyPath: "id" });
      db.createObjectStore("settings", { keyPath: "key" });
    };
    req.onsuccess = () => {
      // Let another tab upgrade or delete the database instead of waiting on this one forever.
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Close other Plateful tabs to finish updating."));
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store<S extends StoreName>(name: S, mode: IDBTransactionMode = "readonly") {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

export async function getAll<S extends StoreName>(name: S): Promise<Stores[S][]> {
  return wrap((await store(name)).getAll()) as Promise<Stores[S][]>;
}

export async function getByDate<S extends "entries" | "exercises">(name: S, date: string): Promise<Stores[S][]> {
  return wrap((await store(name)).index("date").getAll(IDBKeyRange.only(date))) as Promise<Stores[S][]>;
}

export async function getRange<S extends "entries" | "exercises">(name: S, from: string, to: string): Promise<Stores[S][]> {
  return wrap((await store(name)).index("date").getAll(IDBKeyRange.bound(from, to))) as Promise<Stores[S][]>;
}

export async function count(name: StoreName): Promise<number> {
  return wrap((await store(name)).count());
}

export async function customFoodByBarcode(code: string): Promise<CustomFood | undefined> {
  return wrap((await store("customFoods")).index("barcode").get(code)) as Promise<CustomFood | undefined>;
}

export async function get<S extends StoreName>(name: S, key: IDBValidKey): Promise<Stores[S] | undefined> {
  return wrap((await store(name)).get(key)) as Promise<Stores[S] | undefined>;
}

export async function put<S extends StoreName>(name: S, value: Stores[S]): Promise<void> {
  await wrap((await store(name, "readwrite")).put(value));
  notify();
}

export async function remove<S extends StoreName>(name: S, key: IDBValidKey): Promise<void> {
  await wrap((await store(name, "readwrite")).delete(key));
  notify();
}

/** The most recent entries, newest first, used for "recent" and "usual at this hour". */
export async function recentEntries(limit = 300): Promise<Entry[]> {
  const s = await store("entries");
  return new Promise((resolve, reject) => {
    const out: Entry[] = [];
    const req = s.index("loggedAt").openCursor(null, "prev");
    req.onsuccess = () => {
      const cur = req.result;
      if (!cur || out.length >= limit) return resolve(out);
      out.push(cur.value as Entry);
      cur.continue();
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await get("settings", key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await put("settings", { key, value });
}

export async function getProfile(): Promise<Profile | null> {
  return getSetting<Profile | null>("profile", null);
}

export async function saveProfile(p: Profile): Promise<void> {
  await setSetting("profile", p);
}

/** Replace every store's contents (used by import). */
export async function replaceAll(data: Partial<{ [S in StoreName]: Stores[S][] }>): Promise<void> {
  const db = await open();
  const tx = db.transaction(STORE_NAMES, "readwrite");
  try {
    for (const name of STORE_NAMES) {
      const s = tx.objectStore(name);
      s.clear();
      for (const row of data[name] ?? []) s.put(row);
    }
  } catch (e) {
    tx.abort(); // a bad row must not leave the diary half-cleared
    throw e;
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  notify();
}

export async function exportAll(): Promise<{ [S in StoreName]: Stores[S][] }> {
  const out = {} as { [S in StoreName]: Stores[S][] };
  for (const name of STORE_NAMES) (out as Record<string, unknown>)[name] = await getAll(name);
  return out;
}

export async function deleteEverything(): Promise<void> {
  await replaceAll({});
}

// Simple change notification so screens can refresh after writes.
const listeners = new Set<() => void>();
export function onChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const fn of listeners) fn();
}

export function newId(): string {
  return crypto.randomUUID();
}

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  if (await navigator.storage.persisted()) return true;
  return navigator.storage.persist();
}
