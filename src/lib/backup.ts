import { exportAll, replaceAll, STORE_NAMES, type StoreName } from "./db";
import { dayKey } from "./format";

const FORMAT = "plateful-backup";
const VERSION = 1;

export async function downloadBackup(): Promise<void> {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), data })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plateful-backup-${dayKey()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadCsv(): Promise<void> {
  const { entries } = await exportAll();
  const head = ["date", "meal", "time", "food", "brand", "amount", "kcal", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"];
  const esc = (v: unknown) => {
    // A leading = + - @ would run as a formula in Excel; product names come from strangers via Open Food Facts.
    const s = v == null ? "" : String(v).replace(/^[=+\-@]/, "'$&");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = entries
    .sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    .map((e) =>
      [e.date, e.meal, e.loggedAt, e.name, e.brand, e.amountLabel, e.nutrients.kcal, e.nutrients.protein, e.nutrients.carbs, e.nutrients.fat, e.nutrients.fiber, e.nutrients.sugar, e.nutrients.sodium]
        .map(esc)
        .join(","),
    );
  const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plateful-diary-${dayKey()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function restoreBackup(file: File): Promise<{ entries: number }> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("That file isn't a Plateful backup (it isn't valid JSON).");
  }
  const b = parsed as { format?: string; version?: number; data?: Record<string, unknown> };
  if (b.format !== FORMAT || !b.data) throw new Error("That file isn't a Plateful backup.");
  if ((b.version ?? 0) > VERSION) throw new Error("This backup comes from a newer Plateful. Update the app, then try again.");
  const data: Partial<Record<StoreName, unknown[]>> = {};
  for (const name of STORE_NAMES) {
    const rows = b.data[name];
    if (rows != null && !Array.isArray(rows)) throw new Error(`The backup's ${name} section is damaged.`);
    data[name] = (rows as unknown[]) ?? [];
  }
  try {
    await replaceAll(data as never);
  } catch {
    throw new Error("That backup is damaged, so nothing was changed.");
  }
  return { entries: data.entries?.length ?? 0 };
}
