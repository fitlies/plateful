import { useEffect, useState } from "preact/hooks";

export interface Route {
  path: string; // e.g. "/food"
  params: URLSearchParams;
}

function parse(): Route {
  const raw = location.hash.replace(/^#/, "") || "/today";
  const [path, query = ""] = raw.split("?");
  return { path: path || "/today", params: new URLSearchParams(query) };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => {
      setRoute(parse());
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return route;
}

export function href(path: string, params?: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v != null && v !== "") q.set(k, v);
  const s = q.toString();
  return `#${path}${s ? "?" + s : ""}`;
}

export function go(path: string, params?: Record<string, string | undefined>, replace = false) {
  const h = href(path, params);
  if (replace) location.replace(h);
  else location.hash = h;
}

/** Go back within the app, or to a sensible screen when opened directly. */
export function back(fallback = "/today", params?: Record<string, string | undefined>) {
  if (history.length > 1 && sessionStorage.getItem("plateful-nav") === "1") history.back();
  else go(fallback, params, true);
}
addEventListener("hashchange", () => sessionStorage.setItem("plateful-nav", "1"));
