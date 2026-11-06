---
name: Plateful
description: A private food diary that lives on your phone, set as a kopitiam plate.
colors:
  melamine-ground: "#f3f7f5"
  melamine-white: "#ffffff"
  melamine-shade: "#eaf2ee"
  rim-line: "#dbe6e0"
  ink: "#13261e"
  ink-soft: "#485d53"
  ink-faint: "#5f7369"
  kopitiam-jade: "#0f7b55"
  jade-deep: "#0a4f37"
  jade-mid: "#3a9e78"
  jade-soft: "#79c2a3"
  jade-pale: "#d3e9de"
  jade-wash: "#e4f1ea"
  cup-cobalt: "#2b4fa3"
  roasted-kopi: "#a8551a"
  chilli: "#c4342a"
  chilli-wash: "#fbe9e7"
  lacquer-black: "#000000"
  night-jade-ink: "#083a29"
  night-toast: "#0b5e41"
typography:
  plate-figure:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, system-ui, sans-serif"
    fontSize: "56px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  big-figure:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  figure:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 650
    lineHeight: 1.2
    fontFeature: "tnum"
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 650
    lineHeight: 1.25
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 650
    lineHeight: 1.3
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.4
  row:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  body-small:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.35
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
  caption:
    fontFamily: "ui-rounded, SF Pro Rounded, Nunito, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.3
  nav-label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  control: "10px"
  tile: "12px"
  button: "14px"
  lg: "16px"
  chip: "18px"
  pill: "28px"
spacing:
  cell: "8px"
  gutter: "16px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.kopitiam-jade}"
    textColor: "{colors.melamine-white}"
    rounded: "{rounded.button}"
    height: "52px"
    padding: "0 20px"
  button-primary-active:
    backgroundColor: "{colors.jade-deep}"
  button-secondary:
    backgroundColor: "{colors.melamine-shade}"
    textColor: "{colors.jade-deep}"
    rounded: "{rounded.button}"
    height: "52px"
  chip-usual:
    backgroundColor: "{colors.jade-wash}"
    textColor: "{colors.jade-deep}"
    rounded: "{rounded.chip}"
    height: "36px"
    padding: "6px 12px"
  input:
    backgroundColor: "{colors.melamine-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "10px 12px"
  band:
    backgroundColor: "{colors.melamine-white}"
    padding: "8px 16px"
  log-button:
    backgroundColor: "{colors.kopitiam-jade}"
    textColor: "{colors.melamine-white}"
    rounded: "{rounded.pill}"
    size: "56px"
---

# Design System: Plateful

## Overview

**Creative North Star: "The Kopitiam Plate"**

Plateful takes its look from the green-rimmed white melamine plates and floral kopi cups of Singapore coffee shops. The day is one plate. Its jade rim is the calorie budget, and it fills meal by meal. Everything else is a working tool: a calm melamine-white ground, flat full-width bands for meals, and standard controls that anyone who has used a phone knows by heart.

The world contributes four things only: the jade-and-white palette, rounded tabular numerals, a medium density, and one signature move, the plate rim. It never supplies layout or controls. Colour does real jobs: jade for the shell and progress, cobalt for links and the water count, roasted kopi for fat, and chilli only for going past a limit. A night variant keeps the same roles on a deep jade-black ground.

**Key Characteristics:**
- One signature gauge, the plate rim, segmented by meal with quarter ticks.
- Cool melamine-white ground, never cream.
- Flat full-width bands separated by hairlines, not cards.
- Rounded, tabular numerals for every figure; system UI text for everything else.
- State shown as material: solid when logged, dashed when still open, chilli only for the overage.

## Colors

A cool jade-and-white melamine palette with three supporting accents, each with one job.

### Primary
- **Kopitiam Jade** (#0f7b55): the header field, primary buttons, the Log button, the active tab, and the "lunch" rim segment. It's the plate's rim colour.
- **Jade Deep** (#0a4f37): large figures (calories left, food detail kcal), the breakfast rim segment, chip text, and the pressed state.

### Secondary
- **Cup Cobalt** (#2b4fa3): from the kopi-cup florals. Used for links, secondary text actions ("Same as yesterday", "Show as a table"), the water glasses, and the protein series.

### Tertiary
- **Roasted Kopi** (#a8551a): the fat series in bars and averages. Darker than everyday kopi brown so it holds chroma and stays apart from jade.
- **Chilli** (#c4342a): over budget only, as the rim overage, an over-limit macro bar, and destructive actions. Always paired with words ("kcal over", "+212").

### Neutral
- **Melamine Ground** (#f3f7f5): the page field behind bands.
- **Melamine White** (#ffffff): bands, lists, bars, inputs, and the plate well.
- **Melamine Shade** (#eaf2ee): pressed rows, segmented-control tracks, secondary buttons.
- **Rim Line** (#dbe6e0): hairline dividers and input strokes.
- **Ink** (#13261e), **Ink Soft** (#485d53), **Ink Faint** (#5f7369): text, from primary to tertiary. All pass 4.5:1 on white.
- **Jade Pale** (#d3e9de) and **Jade Wash** (#e4f1ea): unfilled tracks and tinted chips and buttons.
- **Lacquer Black** (#000000): the camera letterbox behind the scanner, and the base of night-mode shadows.

### Night
The night palette keeps every role on a deep jade-black ground (custom properties in `src/styles.css`, chosen for logging at night). Two night-only greens are fixed values: **Night Jade Ink** (#083a29) for the streak chip on the night header, and **Night Toast** (#0b5e41) for toasts.

### Named Rules
**The Chilli Means Past Rule.** Chilli appears only for an amount past a limit, and only for the part past it. A day over budget keeps its jade meals and laps the overage in chilli; nothing turns red as a verdict.

**The Validated Series Rule.** Chart series use the validated set (protein cobalt, carbs jade, fat roasted kopi), with a separate validated set at night. Never pick a new series colour by eye.

## Typography

**Display Font:** ui-rounded (SF Pro Rounded, falling back to system-ui)
**Body Font:** system-ui (-apple-system, Segoe UI, Roboto)

**Character:** rounded numerals sit on the melamine like printed kcal stickers. The text stays the phone's own voice, so the app feels native and loads no font files.

### Hierarchy
- **Plate figure** (700, 56px, line-height 1, -0.02em): the calories left in the plate well. One per screen.
- **Big figure** (700, 40px): food detail kcal and weekly averages.
- **Figure** (650, 17–20px, tabular): meal totals, ledger values, KPIs.
- **Title** (650, 17–20px): band headings, screen titles, food names.
- **Body** (400, 15–16px, 1.4): entry names, form text, prose (max 65ch).
- **Row** (400, 15px): secondary row text and status lines.
- **Body small** (600, 14px): field labels, chips, segmented controls, small buttons.
- **Label** (600, 13px): section titles, sub-lines and ledger captions in Ink Soft.
- **Caption** (500, 12px, rounded): goal hints under figures, chart axis text, source tags.
- **Nav label** (600, 11px): tab bar labels only.
- **Display** (700, 30px): the welcome heading on first run. **Headline** (650, 20px): food names and dialog titles.

### Named Rules
**The Three Numeral Sizes Rule.** Numerals use one voice at three main sizes: plate (56px), meal and ledger figures (17–20px), and row figures (15px). Every figure uses tabular digits so columns align.

## Layout

Single column, phone first, capped at 560px and centred on wide screens. The jade header field and the title bars run edge to edge on wide screens while content stays in the column. Spacing runs on an 8px cell: 16px side gutters, 24px between major groups, 48px minimum row height, and 44px minimum touch targets. The bottom tab bar is fixed (72px plus the safe-area inset). Sub-screens swap the tab bar for a fixed action dock holding one primary button. The plate overlaps the header's bottom edge by 60px.

## Elevation & Depth

Mostly flat, with tonal layers: ground, then white bands, then shade for pressed states. Shadows are kept for things that physically sit above the surface: the plate, the Log button, dialogs and toasts.

### Shadow Vocabulary
- **Plate** (`0 12px 28px rgba(10,79,55,.2), 0 2px 5px rgba(10,79,55,.16)` plus an inset well shadow): the plate resting on the table.
- **Log button** (`0 6px 16px rgba(15,123,85,.35)`): the one floating action.
- **Pop** (`0 8px 24px rgba(19,38,30,.18), 0 2px 6px rgba(19,38,30,.1)`): dialogs, toasts and chart tooltips.

### Named Rules
**The Plate Sits, Bands Lie Flat Rule.** Only objects that would physically rest on the table cast a shadow. Lists, bands and forms never do.

## Shapes

Round shapes come from tableware: the plate circle, round meal dots (a solid ring when logged, a dashed ring when open), pill chips (18px) and a round Log button. Controls are softly squared on one scale: 4px for data marks, tracks, swatches and day cells; 6px for small tags and the focus ring; 8px for tooltips and the segment inside a 12px segmented track; 10px for inputs; 12px for tiles; 14px for buttons; 16px for dialogs, the streak chip and switches; 18px for chips; 28px for the Log button. Anything round, like icon buttons and switch knobs, uses 50%. Bars have 4px rounded ends and a square baseline.

## Components

### Buttons
- **Shape:** gently rounded (14px), 52px tall.
- **Primary:** Kopitiam Jade with white text, one per screen, in the bottom dock.
- **Pressed:** Jade Deep. **Disabled:** Jade Pale with Ink Faint text.
- **Secondary:** Melamine Shade with Jade Deep text. **Danger:** Chilli Wash with Chilli text, for destructive actions only.

### Chips
- **Style:** Jade Wash pill, Jade Deep 14px/600 text, with a plus icon.
- **Use:** the "usual" foods on the current meal; one tap logs, with an undo toast. The ghost variant is cobalt text for "Same as yesterday".

### Cards / Containers
- **Corner Style:** none. Content sits on flat full-width white bands with hairline Rim Line dividers.
- **Internal Padding:** 8px vertical, 16px horizontal. Rows are 48px minimum, with entry rows indented 32px under the meal dot.

### Inputs / Fields
- **Style:** white, 1px Rim Line stroke, 10px radius, 48px tall, 17px text. Units sit inside the field on the right.
- **Focus:** Jade border plus a 2px Jade Pale ring. Keyboard focus anywhere uses a 3px cobalt outline.
- **Error:** Chilli border with a plain-language message underneath.

### Navigation
- **Tab bar:** white, with Today, Progress, a central round Log button (56px, jade), My foods and More. The active tab is Jade with a 1.75-stroke icon over an 11px/600 label.
- **Segmented controls:** a Melamine Shade track holding white selected segments, for meals and units.

### The Plate
The signature gauge. It's an SVG ring (centre-line radius 106px, rim width 22px) on a white well with an inset shadow. Logged meals are arcs in the four jade rim tones, breakfast darkest, with 2.5px gaps. The unfilled budget shows a dashed centre line. Past 100%, a chilli lap marks the overage from 12 o'clock. Quarter ticks keep it reading as a gauge. Segments animate their length once (0.8s, expo ease-out), and not at all under reduced motion.

## Do's and Don'ts

### Do:
- **Do** keep every figure in rounded tabular numerals, right-aligned in columns.
- **Do** put "usual" foods one tap away on the meal that's due now.
- **Do** show state as material: a solid ring when logged, a dashed ring when open, chilli only for the overage.
- **Do** keep the jade header field full-bleed on wide screens, with content in the 560px column.
- **Do** validate any new chart colour with the dataviz validator, in light and dark.

### Don't:
- **Don't** use cream or warm paper grounds; the melamine is cool white (#f3f7f5).
- **Don't** wrap content in floating cards or nest containers; use flat bands.
- **Don't** turn a whole day red for going over; chilli marks only the overage.
- **Don't** load web fonts, icon fonts or anything from a CDN; the Content Security Policy blocks it, and the brand depends on it.
- **Don't** add eyebrow labels above headings, glyph or emoji icons, or gradient text.
