// Plateful service worker: makes the app and its food database work offline.
// Only same-origin files are cached. Barcode lookups (Open Food Facts) always go to the network.
// The page registers sw.js?v=<build id>, so each deploy gets a fresh cache and the old one is deleted.
const CACHE = `plateful-${new URL(location.href).searchParams.get("v") || "dev"}`;
const CORE = ["./", "./index.html", "./foods.json", "./sg-foods.json", "./manifest.webmanifest", "./icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await c.addAll(CORE);
      // The code files the page loads were fetched before this worker existed, so save them now too.
      const html = await (await c.match("./index.html")).text();
      await c.addAll([...html.matchAll(/(?:src|href)="\.\/(assets\/[^"]+)"/g)].map((m) => `./${m[1]}`));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Pages: try the network first so updates arrive, fall back to the cached app shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
          }
          return res;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  // Everything else (hashed JS/CSS, wasm, foods.json, icons): cache first.
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
