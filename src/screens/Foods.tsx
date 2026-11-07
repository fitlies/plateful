import { useState } from "preact/hooks";
import * as db from "../lib/db";
import { tokenize } from "../lib/foods";
import { int } from "../lib/format";
import { useData } from "../lib/hooks";
import { IconBarcode, IconChevron, IconPencil, IconSearch } from "../ui/icons";
import { href } from "../ui/router";

export function Foods() {
  const { data: foods } = useData(() => db.getAll("customFoods"), []);
  const [q, setQ] = useState("");
  const qt = tokenize(q);
  const list = (foods ?? [])
    .filter((f) => !qt.length || qt.every((w) => tokenize(`${f.name} ${f.brand ?? ""}`).some((t) => t.startsWith(w))))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <header class="topbar" style="padding-left:16px">
        <div class="topbar-row"><h1>My foods</h1></div>
        {(foods?.length ?? 0) > 6 && (
          <label class="search" style="margin:0 0 12px">
            <IconSearch /><span class="sr">Filter my foods</span>
            <input type="search" placeholder="Filter" value={q} onInput={(e) => setQ(e.currentTarget.value)} />
          </label>
        )}
      </header>
      <div class="actions3" style="grid-template-columns:1fr 1fr;margin:12px 8px">
        <a class="tile" href="#/custom"><IconPencil />New food</a>
        <a class="tile" href={href("/scan", { date: undefined })}><IconBarcode />Scan a barcode</a>
      </div>
      {foods && foods.length === 0 && (
        <div class="empty">
          <strong>No foods of your own yet</strong>
          Save the dishes you eat often, like your usual kopi or a stall's set meal, and log them in one tap. Scanned products land here too.
        </div>
      )}
      {list.length > 0 && (
        <div class="list">
          {list.map((f) => (
            <a class="row" key={f.id} href={href("/custom", { id: f.id })} style="text-decoration:none">
              <span class="what">
                <span class="name">{f.name}</span>
                <span class="sub num">{f.brand ? `${f.brand} · ` : ""}{f.servingLabel} · {int(f.nutrients.kcal)} kcal{f.barcode ? " · barcode" : ""}</span>
              </span>
              <IconChevron size="sm" />
            </a>
          ))}
        </div>
      )}
    </>
  );
}
