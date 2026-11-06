import { useRef, useState } from "preact/hooks";
import { downloadBackup, downloadCsv, restoreBackup } from "../lib/backup";
import * as db from "../lib/db";
import { int } from "../lib/format";
import { useData } from "../lib/hooks";
import type { Profile } from "../lib/types";
import { Confirm, SgCredit } from "../ui/common";
import { loadFoods, sgInfo } from "../lib/foods";
import { IconChevron, IconDownload, IconHourglass, IconLeaf, IconShield, IconTarget, IconTrash, IconUpload } from "../ui/icons";
import { go } from "../ui/router";
import { toast } from "../ui/toast";

export function More({ profile }: { profile: Profile }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirm, setConfirm] = useState<"delete" | "restore" | null>(null);
  const [pending, setPending] = useState<File | null>(null);
  const { data: persisted } = useData(async () => (navigator.storage?.persisted ? navigator.storage.persisted() : false), []);
  const { data: count } = useData(() => db.count("entries"), []);
  useData(() => loadFoods().catch(() => []), []); // fills sgInfo for the credit below

  const update = (p: Partial<Profile>) => db.saveProfile({ ...profile, ...p });
  const restore = async () => {
    if (!pending) return;
    try {
      const r = await restoreBackup(pending);
      toast(`Restored ${int(r.entries)} entries`);
    } catch (e) {
      toast((e as Error).message);
    }
    setPending(null);
  };
  const wipe = async () => {
    await db.deleteEverything();
    toast("Everything was deleted from this device");
    go("/today", {}, true);
  };

  return (
    <>
      <header class="topbar" style="padding-left:16px"><div class="topbar-row"><h1>More</h1></div></header>

      <h2 class="section-title" style="padding:0 16px">Goals</h2>
      <div class="menu">
        <a href="#/goals"><span class="ico"><IconTarget /></span>Goals and targets<span class="val num">{int(profile.kcalGoal)} kcal</span><IconChevron size="sm" /></a>
        <a href="#/fasting"><span class="ico"><IconHourglass /></span>Fasting timer<span class="val" /><IconChevron size="sm" /></a>
        <label><span class="ico"><IconLeaf /></span>Count net carbs<input type="checkbox" class="switch" checked={profile.netCarbs} onChange={(e) => update({ netCarbs: e.currentTarget.checked })} /></label>
        <div style="gap:8px">
          <span style="flex:1">Units</span>
          <div class="seg" style="margin:0;flex:none" role="group" aria-label="Units">
            <button aria-pressed={profile.units === "metric"} onClick={() => update({ units: "metric" })}>Metric</button>
            <button aria-pressed={profile.units === "imperial"} onClick={() => update({ units: "imperial" })}>Imperial</button>
          </div>
        </div>
      </div>

      <h2 class="section-title" style="padding:0 16px">Your data</h2>
      <div class="menu">
        <button onClick={() => downloadBackup().then(() => toast("Backup saved to your downloads"))}><span class="ico"><IconDownload /></span>Back up everything<span class="val">.json</span></button>
        <button onClick={() => downloadCsv()}><span class="ico"><IconDownload /></span>Export diary<span class="val">.csv</span></button>
        <button onClick={() => fileRef.current?.click()}><span class="ico"><IconUpload /></span>Restore from a backup</button>
        <button onClick={() => setConfirm("delete")} style="color:var(--chilli)"><span class="ico" style="color:var(--chilli)"><IconTrash /></span>Delete everything</button>
      </div>
      <input
        ref={fileRef} type="file" accept="application/json,.json" class="sr" tabIndex={-1}
        onChange={(e) => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) { setPending(f); setConfirm("restore"); } }}
      />
      <p class="note" style="padding:12px 16px 0">
        {int(count ?? 0)} entries are stored only in this browser{persisted ? ", protected from automatic clean-up" : ""}. Back up now and then, because clearing your browser data erases them.
      </p>

      <h2 class="section-title" style="padding:0 16px">About</h2>
      <div class="page prose" style="padding-top:0">
        <p><IconShield size="sm" /> <strong>Private by design.</strong> Plateful has no account, server, analytics, ads or cookies. Your diary never leaves this device. The one exception: when you scan a barcode, that number (and nothing else) is sent to Open Food Facts to look the product up.</p>
        <p><strong>Food data.</strong> 13,402 foods from <a href="https://fdc.nal.usda.gov/" target="_blank" rel="noopener noreferrer">USDA FoodData Central</a> (public domain) ship inside the app and work offline. Barcode data comes from <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer">Open Food Facts</a>, available under the Open Database License.</p>
        {sgInfo.count > 0 && <p><strong>Singapore dishes.</strong> {sgInfo.count} local {sgInfo.count === 1 ? "food" : "foods"}. <SgCredit /></p>}
        <p><strong>Built with</strong> Preact (MIT) and ZXing-C++ via zxing-wasm (Apache-2.0, MIT). Nutrition estimates aren't medical advice.</p>
      </div>

      <Confirm
        open={confirm === "delete"} danger title="Delete everything?"
        body="Every entry, weigh-in, food and goal on this device is erased. This can't be undone unless you have a backup."
        confirmLabel="Delete everything" onConfirm={() => { setConfirm(null); wipe(); }} onCancel={() => setConfirm(null)}
      />
      <Confirm
        open={confirm === "restore"} title="Replace this diary?"
        body={`Restoring ${pending?.name ?? "the backup"} replaces everything currently on this device with the backup's contents.`}
        confirmLabel="Restore" onConfirm={() => { setConfirm(null); restore(); }} onCancel={() => { setConfirm(null); setPending(null); }}
      />
    </>
  );
}
