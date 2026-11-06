---
version: 1
slug: "src-app-tsx"
primary_target: "src/app.tsx"
related_targets: []
---

# Surface brief: Plateful app shell and Today diary

Scope: the whole installable app (Today, Add food, Progress, More). Visitor mode: Operate.
Audience and job: the owner and friends and family, logging meals on their phones in seconds and checking what's left of today's budget.
Proof and content: real USDA foods, the user's own entries, and the Open Food Facts barcode results. No invented users or claims.
Constraints: system fonts only, no third-party runtime except Open Food Facts on scan, works offline, WCAG 2.2 AA, metric by default.
Memorable moment: the plate rim filling, meal by meal.
Unresolved: app icon artwork beyond the plate mark.

## Direction contract

THESIS: Your day is one kopitiam plate. The jade rim is the calorie budget and fills meal by meal. Refuses the category default of white cards, soft shadows, and a generic green progress ring.

OWN-WORLD: glossy cool melamine-white ground (never cream), and a jade header and tab accent taken from the green-rimmed coffee-shop plate. Deep jade for figures. Cobalt from the kopi-cup florals appears only on secondary actions and links. Kopi brown is the fat series. Chilli red is reserved for over budget. Content sits on flat full-width bands, not cards. Rounded system numerals throughout.

STORY: the user sees what's left, sees what's logged per meal, and taps once to log the next meal from the "usual" foods already waiting.

FIRST VIEWPORT: a jade header with a date switcher and the streak. A 236 px plate overlaps the header's bottom edge: its rim is segmented by meal (solid when logged, dashed for upcoming meals, chilli past 100%), and its centre shows "kcal left". Below: goal, food and exercise in three tabular columns. Then protein, carbs and fat bars. Then a white meal band list with an add button and "usual" chips on the next meal. A bottom tab bar with a central jade Log button.

FORM: assigned kopitiam melamine (grounded list position 3). Raises: tabular ledger numerals (ikeda); the next item waiting (vertical feed); an 8 px cell armature and a day-cell streak grid (crouwel); state as material (acetate manual); one numeral voice at three sizes (emigre). seed:320b103f5104e436

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
