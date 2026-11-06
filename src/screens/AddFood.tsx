import { useEffect, useRef, useState } from "preact/hooks";
import * as db from "../lib/db";
import { loadFoods, portionLabel, scale, searchFoods, tokenize } from "../lib/foods";
import { int } from "../lib/format";
import { useData } from "../lib/hooks";
import { customToFood, recentFoods, relog } from "../lib/log";
import type { Entry, Food, Meal } from "../lib/types";
import { MEAL_LABEL } from "../lib/types";
import { MealPicker, TopBar } from "../ui/common";
import { IconBarcode, IconBolt, IconPencil, IconPlus, IconSearch } from "../ui/icons";
import { go, href } from "../ui/router";
import { toast } from "../ui/toast";

export function AddFood({ date, meal: initialMeal }: { date: string; meal: Meal }) {
  const [meal, setMeal] = useState<Meal>(initialMeal);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Food[] | null>(null);
  const [dbState, setDbState] = useState<"loading" | "ready" | "error">("loading");
  const { data: recent } = useData(() => db.recentEntries(300), []);
  const { data: custom } = useData(() => db.getAll("customFoods"), []);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFoods().then(() => setDbState("ready"), () => setDbState("error"));
    // Focus search after the screen swap; autofocus alone doesn't fire on hash navigation.
    const t = setTimeout(() => input.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const query = q.trim();
    if (!query) return setResults(null);
    let live = true;
    const t = setTimeout(async () => {
      const qt = tokenize(query);
      const mine = (custom ?? [])
        .filter((c) => {
          const name = tokenize(`${c.name} ${c.brand ?? ""}`);
          return qt.every((w) => name.some((n) => n.startsWith(w)));
        })
        .map(customToFood);
      const usda = dbState === "ready" ? await searchFoods(query) : [];
      if (live) setResults([...mine, ...usda]);
    }, 120);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, custom, dbState]);

  const changeMeal = (m: Meal) => {
    setMeal(m);
    history.replaceState(null, "", href("/add", { date, meal: m }));
  };
  const params = { date, meal };
  const quickLog = async (src: Entry) => {
    const e = await relog(src, date, meal);
    toast(`Logged ${src.name} to ${MEAL_LABEL[meal].toLowerCase()}`, { label: "Undo", run: () => db.remove("entries", e.id) });
  };
  const recents = recentFoods(recent ?? []);

  return (
    <>
      <TopBar title={`Add to ${MEAL_LABEL[meal].toLowerCase()}`} onBack={() => go("/today", { date }, true)}>
        <MealPicker value={meal} onChange={changeMeal} />
        <label class="search">
          <IconSearch />
          <span class="sr">Search foods</span>
          <input
            ref={input} type="search" enterKeyHint="search" autoComplete="off"
            placeholder="Search 13,000 foods" value={q} onInput={(e) => setQ(e.currentTarget.value)}
          />
        </label>
      </TopBar>

      {!q.trim() && (
        <>
          <div class="actions3" style="margin-top:12px">
            <a class="tile" href={href("/scan", params)}><IconBarcode />Scan barcode</a>
            <a class="tile" href={href("/quick", params)}><IconBolt />Quick add</a>
            <a class="tile" href={href("/custom", params)}><IconPencil />New food</a>
          </div>
          {recents.length > 0 ? (
            <>
              <h2 class="section-title" style="padding:0 16px">Recent</h2>
              <div class="list">
                {recents.map((e) => (
                  <div class="row" key={e.id}>
                    <a class="what" style="text-decoration:none" href={e.source === "quick" ? href("/quick", { ...params, from: e.id }) : href("/food", { ...params, key: e.foodKey, from: e.id })}>
                      <span class="name">{e.name}</span>
                      <span class="sub num">{e.amountLabel} · {int(e.nutrients.kcal)} kcal</span>
                    </a>
                    <button class="plus" aria-label={`Log ${e.name}, ${e.amountLabel}`} onClick={() => quickLog(e)}><IconPlus /></button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div class="empty">
              <strong>Search, scan or quick add</strong>
              Foods you log show up here, ready to add again with one tap.
            </div>
          )}
        </>
      )}

      {q.trim() && (
        <div class="list" style="margin-top:4px" aria-live="polite">
          {results?.map((f) => <ResultRow key={f.key} food={f} href={href("/food", { ...params, key: f.key })} />)}
          {results && results.length === 0 && dbState !== "loading" && (
            <div class="empty">
              <strong>Nothing called “{q.trim()}”</strong>
              Try a simpler word, like “rice” or “noodles”, or add it yourself.
              <div class="chips">
                <a class="chip solid" href={href("/quick", { ...params, name: q.trim() })}><IconBolt size="sm" />Quick add calories</a>
                <a class="chip" href={href("/custom", { ...params, name: q.trim() })}><IconPencil size="sm" />Create food</a>
              </div>
            </div>
          )}
          {dbState === "loading" && <div class="empty">Opening the food database…</div>}
          {dbState === "error" && <div class="empty"><strong>The food database didn't load</strong>Check your connection once, then it works offline.</div>}
        </div>
      )}
    </>
  );
}

function ResultRow({ food, href: link }: { food: Food; href: string }) {
  let sub: string;
  if (food.per100g) {
    const p = food.portions[0];
    sub = `${portionLabel(p)} · ${int(scale(food.nutrients, p.grams / 100).kcal)} kcal`;
  } else {
    sub = `${food.servingLabel ?? "1 serving"} · ${int(food.nutrients.kcal)} kcal`;
  }
  const tag = food.source === "custom" ? "My food · " : food.brand ? `${food.brand} · ` : "";
  return (
    <a class="row" href={link} style="text-decoration:none">
      <span class="what">
        <span class="name" style="white-space:normal">{food.name}</span>
        <span class="sub num">{tag}{sub}</span>
      </span>
    </a>
  );
}
