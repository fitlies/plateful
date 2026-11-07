import { useEffect } from "preact/hooks";
import { dayKey } from "./lib/format";
import { useProfile } from "./lib/hooks";
import { mealForNow } from "./lib/log";
import type { Meal } from "./lib/types";
import { MEALS } from "./lib/types";
import { AddFood } from "./screens/AddFood";
import { CustomFood } from "./screens/CustomFood";
import { Exercise } from "./screens/Exercise";
import { Fasting } from "./screens/Fasting";
import { FoodDetail } from "./screens/FoodDetail";
import { Foods } from "./screens/Foods";
import { Goals } from "./screens/Goals";
import { More } from "./screens/More";
import { Progress } from "./screens/Progress";
import { QuickAdd } from "./screens/QuickAdd";
import { Scan } from "./screens/Scan";
import { Today } from "./screens/Today";
import { IconBowl, IconChart, IconMore, IconPlate, IconPlus } from "./ui/icons";
import { href, useRoute } from "./ui/router";
import { ToastHost } from "./ui/toast";

const TABS = ["/today", "/progress", "/foods", "/more"];

export function App() {
  const route = useRoute();
  const { data: profile } = useProfile();
  const p = route.params;
  const get = (k: string) => p.get(k) ?? undefined;
  const date = get("date") ?? dayKey();
  const meal = (MEALS as readonly string[]).includes(get("meal") ?? "") ? (get("meal") as Meal) : mealForNow();

  useEffect(() => {
    document.title = route.path === "/today" ? "Plateful" : `${route.path.slice(1, 2).toUpperCase()}${route.path.slice(2)} · Plateful`;
  }, [route.path]);

  if (profile === undefined) return null; // first IndexedDB read, a few ms
  if (!profile?.setupDone) {
    return (
      <div class="app bare">
        <Goals profile={profile} setup />
        <ToastHost high />
      </div>
    );
  }

  const tabbed = TABS.includes(route.path);
  let screen;
  switch (route.path) {
    case "/today": screen = <Today date={date} profile={profile} />; break;
    case "/progress": screen = <Progress profile={profile} />; break;
    case "/foods": screen = <Foods />; break;
    case "/more": screen = <More profile={profile} />; break;
    case "/add": screen = <AddFood key={`${date}`} date={date} meal={meal} />; break;
    case "/food": screen = <FoodDetail key={get("key")} foodKey={get("key")} date={date} meal={meal} fromId={get("from")} depth={Number(get("d") ?? 2)} />; break;
    case "/entry": screen = <FoodDetail key={get("id")} entryId={get("id")} depth={1} />; break;
    case "/quick": screen = <QuickAdd key={get("id") ?? get("from") ?? "new"} date={date} meal={meal} id={get("id")} fromId={get("from")} name={get("name")} />; break;
    case "/scan": screen = <Scan date={date} meal={meal} />; break;
    case "/custom": screen = <CustomFood key={get("id") ?? get("copy") ?? "new"} id={get("id")} copyOf={get("copy")} d={get("d")} date={get("date")} meal={get("meal") as Meal | undefined} barcode={get("barcode")} name={get("name")} brand={get("brand")} />; break;
    case "/exercise": screen = <Exercise key={get("id") ?? "new"} date={date} id={get("id")} profile={profile} />; break;
    case "/goals": screen = <Goals profile={profile} />; break;
    case "/fasting": screen = <Fasting />; break;
    default: screen = <Today date={dayKey()} profile={profile} />;
  }

  return (
    <>
      <main class={`app${tabbed ? "" : " bare"}`}>{screen}</main>
      {tabbed && <TabBar path={route.path} date={route.path === "/today" ? get("date") : undefined} />}
      <ToastHost high={!tabbed} />
    </>
  );
}

function TabBar({ path, date }: { path: string; date?: string }) {
  const tab = (to: string, label: string, icon: preact.JSX.Element) => (
    <a class="tab" href={`#${to}`} aria-current={path === to ? "page" : undefined}>{icon}{label}</a>
  );
  return (
    <div class="tabbar">
      <nav aria-label="Main">
        {tab("/today", "Today", <IconPlate />)}
        {tab("/progress", "Progress", <IconChart />)}
        <a class="tab log" href={href("/add", { date, meal: mealForNow() })} aria-label="Log food"><span class="fab"><IconPlus /></span></a>
        {tab("/foods", "My foods", <IconBowl />)}
        {tab("/more", "More", <IconMore />)}
      </nav>
    </div>
  );
}
