# Plateful

A private food diary that lives on your phone. No account, no ads, no tracking, no cookies.

You log meals, water, exercise and weigh-ins against a daily calorie and macro budget. Your diary is stored only in your browser on your device. Install it from the browser ("Add to Home Screen") and it works offline.

## Features

- **Today:** your day's budget drawn as a plate rim that fills meal by meal, with protein, carbs and fat goals, water and exercise.
- **Fast logging:**
  - offline search of 13,402 foods with real serving sizes;
  - one-tap "usual" foods and "Same as yesterday";
  - recent foods, quick add, and your own foods;
  - barcode scanning.
- **Goals:** a daily budget from the Mifflin–St Jeor equation, your activity level and weekly pace, with optional targets for each meal.
- **Progress:** weight trend against your goal, the last 7 days of calories against budget, average macros, and a 13-week logging streak.
- **Free extras:** net carbs, the time you ate each entry, a fasting timer, CSV export, and JSON backup and restore.

## Privacy

Privacy here is enforced by how the app is built, not just promised.

- **No server.** Plateful has no backend, analytics, ads, web fonts or CDN, and it never sets cookies.
- **Locked-down page.** The page's Content Security Policy (in `index.html`) only allows the app's own files plus `https://world.openfoodfacts.org`.
- **One outside request.** When you scan or type a barcode, that number (and nothing else) is sent to Open Food Facts to look the product up. A scanned product is then saved as one of your own foods, so the next scan works offline.
- **Verified.** Checked with REA, a reverse-engineering tool: a full first-run session made 7 requests, all to the app's own origin, with zero third-party requests and zero cookies.

## Data sources

- **Food database:** [USDA FoodData Central](https://fdc.nal.usda.gov/), public domain, bundled as `public/foods.json`. It contains Foundation Foods (Oct 2026), FNDDS everyday dishes (Oct 2024) and SR Legacy (2018). To rebuild it, run `scripts/fetch-usda.sh` and then `npm run foods`.
- **Singapore dishes:** contains information from the [Singapore Food Insights Database (SG FoodID)](https://pphtpc.hpb.gov.sg/web/sgfoodid) from the Health Promotion Board, made available under [its terms](https://go.gov.sg/termsofuse-hpbsgfoodid). It is provided as-is, with no warranty of accuracy or completeness, and its use here doesn't imply HPB endorsement. The exported files live in `data/sgfoodid/`: see the README there for how to add dishes, then run `npm run sgfoods`.
- **Barcodes:** [Open Food Facts](https://world.openfoodfacts.org/), under the Open Database License.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and build into dist/
npm run preview    # serve the production build, including offline support
```

Built with Vite, Preact and TypeScript, plain CSS and system fonts. Barcode decoding uses the browser's own `BarcodeDetector` where available. Otherwise it uses ZXing (`zxing-wasm`), which is bundled and served from the app, never from a CDN.

## Deploy

Every push to `main` builds the app and publishes it to GitHub Pages through `.github/workflows/pages.yml`. The build uses relative paths, so it works at `https://<user>.github.io/plateful/` or on any custom domain.

## Design

The design system is in `DESIGN.md` and the product brief in `PRODUCT.md`. The look is "The Kopitiam Plate": a jade-rimmed melamine plate on a cool white ground.

Nutrition numbers are estimates, not medical advice.
